import { Injectable } from '@nestjs/common';
import type { GameState, DiceValue, Scorecard } from '@shared/types/game';
import { scoreCategory, allFilled, computeTotals } from '@shared/scoring';
import { RoomService } from '../room/room.service';

function randomDice(): DiceValue[] {
  return Array.from({ length: 5 }, () =>
    (Math.floor(Math.random() * 6) + 1) as DiceValue
  );
}

@Injectable()
export class GameService {
  constructor(private readonly roomService: RoomService) {}

  roll(roomId: string, playerId: string): GameState | null {
    const state = this.roomService.getRoom(roomId);
    if (!state) return null;
    if (!this.validateTurn(state, playerId)) return null;
    if (state.rollsUsed >= 3) return state;

    const newDice = randomDice();
    state.dice = state.dice.map((v, i) => (state.held[i] ? v : newDice[i]));
    state.rollsUsed++;

    this.roomService.updateRoom(roomId, state);
    return state;
  }

  hold(roomId: string, playerId: string, index: number): GameState | null {
    const state = this.roomService.getRoom(roomId);
    if (!state) return null;
    if (!this.validateTurn(state, playerId)) return null;
    if (state.rollsUsed === 0) return state;

    state.held[index] = !state.held[index];
    this.roomService.updateRoom(roomId, state);
    return state;
  }

  pickCategory(roomId: string, playerId: string, catId: keyof Scorecard): GameState | null {
    const state = this.roomService.getRoom(roomId);
    if (!state) return null;
    if (!this.validateTurn(state, playerId)) return null;
    if (state.rollsUsed === 0) return state;

    const player = state.players[state.activePlayerIndex];
    if (player.card[catId] != null) return state;

    const score = scoreCategory(catId, state.dice);
    player.card[catId] = score;

    // Check game over
    if (allFilled(player.card)) {
      const allDone = state.players.every((p) => allFilled(p.card));
      if (allDone) {
        let bestId = state.players[0].id;
        let bestScore = -1;
        for (const p of state.players) {
          const t = computeTotals(p.card);
          if (t.grand > bestScore) {
            bestScore = t.grand;
            bestId = p.id;
          }
        }
        state.phase = 'ended';
        state.winnerId = bestId;
        this.roomService.updateRoom(roomId, state);
        return state;
      }
    }

    // Next player
    state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
    state.dice = [1, 1, 1, 1, 1];
    state.held = [false, false, false, false, false];
    state.rollsUsed = 0;

    this.roomService.updateRoom(roomId, state);
    return state;
  }

  private validateTurn(state: GameState, playerId: string): boolean {
    const activePlayer = state.players[state.activePlayerIndex];
    return activePlayer?.id === playerId;
  }
}
