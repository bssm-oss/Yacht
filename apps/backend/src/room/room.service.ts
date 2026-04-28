import { Injectable } from '@nestjs/common';
import type { GameState, Player } from '@shared/types/game';
import type { RoomInfo } from '@shared/types/ws';
import { makeEmptyScorecard } from '@shared/scoring';

function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function makePlayer(id: string, name: string): Player {
  return {
    id,
    name,
    card: makeEmptyScorecard(),
    connected: true,
  };
}

@Injectable()
export class RoomService {
  private rooms = new Map<string, GameState>();

  createRoom(playerName: string, socketId: string, maxPlayers: number = 4, isPublic: boolean = true): GameState {
    const roomId = generateRoomId();
    const player = makePlayer(socketId, playerName);
    const state: GameState = {
      roomId,
      players: [player],
      activePlayerIndex: 0,
      dice: [1, 1, 1, 1, 1],
      held: [false, false, false, false, false],
      rollsUsed: 0,
      phase: 'waiting',
      winnerId: null,
      maxPlayers,
      isPublic,
      hostName: playerName,
    };
    this.rooms.set(roomId, state);
    return state;
  }

  joinRoom(roomId: string, playerName: string, socketId: string): GameState | null {
    const state = this.rooms.get(roomId);
    if (!state) return null;
    if (state.players.length >= state.maxPlayers) return null;

    const player = makePlayer(socketId, playerName);
    state.players.push(player);

    // Start game when 2+ players
    if (state.players.length >= 2 && state.phase === 'waiting') {
      state.phase = 'playing';
    }

    return state;
  }

  getRoom(roomId: string): GameState | undefined {
    return this.rooms.get(roomId);
  }

  removePlayer(socketId: string): { roomId: string; state: GameState } | null {
    for (const [roomId, state] of this.rooms) {
      const idx = state.players.findIndex((p) => p.id === socketId);
      if (idx < 0) continue;

      const wasActive = state.activePlayerIndex === idx;
      state.players.splice(idx, 1);

      // Delete room if empty
      if (state.players.length === 0) {
        this.rooms.delete(roomId);
        return null;
      }

      // 1명만 남으면 게임 종료
      if (state.players.length === 1 && state.phase === 'playing') {
        state.phase = 'ended';
        state.winnerId = state.players[0].id;
        return { roomId, state };
      }

      // 나간 플레이어가 active였으면 해당 index로 턴 넘기기 (이미 splice됐으므로 범위 조정)
      if (wasActive) {
        state.activePlayerIndex = idx % state.players.length;
        state.dice = [1, 1, 1, 1, 1];
        state.held = [false, false, false, false, false];
        state.rollsUsed = 0;
      } else if (state.activePlayerIndex >= state.players.length) {
        state.activePlayerIndex = 0;
      }

      return { roomId, state };
    }
    return null;
  }

  updateRoom(roomId: string, state: GameState): void {
    this.rooms.set(roomId, state);
  }

  getPublicRooms(): RoomInfo[] {
    const rooms: RoomInfo[] = [];
    for (const [, state] of this.rooms) {
      if (state.isPublic && state.phase === 'waiting') {
        rooms.push({
          roomId: state.roomId,
          hostName: state.hostName,
          playerCount: state.players.length,
          maxPlayers: state.maxPlayers,
          isPublic: state.isPublic,
        });
      }
    }
    return rooms;
  }
}
