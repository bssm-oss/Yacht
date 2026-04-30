import { Injectable } from '@nestjs/common';
import type { GameState, DiceValue, Scorecard } from '@shared/types/game';
import { scoreCategory, allFilled, computeTotals } from '@shared/scoring';
import { RoomService } from '../room/room.service';

function randomDice(): DiceValue[] {
  return Array.from({ length: 5 }, () =>
    (Math.floor(Math.random() * 6) + 1) as DiceValue
  );
}

/** mulberry32 PRNG for server-side seed verification */
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Compute expected dice values from seed (for anti-cheat verification) */
export function verifySeedResult(seed: number, held: boolean[]): DiceValue[] {
  const rng = mulberry32(seed);
  return held.map((isHeld) => {
    if (isHeld) return 1 as DiceValue; // placeholder, held dice aren't re-rolled
    return (Math.floor(rng() * 6) + 1) as DiceValue;
  });
}

@Injectable()
export class GameService {
  constructor(private readonly roomService: RoomService) {}

  roll(roomId: string, playerId: string): GameState | null {
    const state = this.roomService.getRoom(roomId);
    if (!state) return null;
    if (!this.validateTurn(state, playerId)) return null;
    if (state.rollsUsed >= 3) return state;

    const seed = Math.floor(Math.random() * 2 ** 32);
    state.rollSeed = seed;

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
    state.rollSeed = undefined;

    this.roomService.updateRoom(roomId, state);
    return state;
  }

  private validateTurn(state: GameState, playerId: string): boolean {
    const activePlayer = state.players[state.activePlayerIndex];
    return activePlayer?.id === playerId;
  }
}
