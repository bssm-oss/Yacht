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
    ready: false,
  };
}

@Injectable()
export class RoomService {
  private rooms = new Map<string, GameState>();
  private spectators = new Map<string, Set<string>>();
  private pendingRemovals = new Map<string, { timer: ReturnType<typeof setTimeout>; roomId: string }>();

  createRoom(playerName: string, socketId: string, maxPlayers: number = 4, isPublic: boolean = true): GameState {
    const roomId = generateRoomId();
    const player = makePlayer(socketId, playerName);
    player.ready = false;
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
      hostId: socketId,
    };
    this.rooms.set(roomId, state);
    this.spectators.set(roomId, new Set());
    return state;
  }

  joinRoom(roomId: string, playerName: string, socketId: string): GameState | { spectating: true; state: GameState } | null {
    const state = this.rooms.get(roomId);
    if (!state) return null;

    // If game is already in progress or ended, add as spectator
    if (state.phase === 'playing' || state.phase === 'ended') {
      const spectatorSet = this.spectators.get(roomId) ?? new Set<string>();
      spectatorSet.add(socketId);
      this.spectators.set(roomId, spectatorSet);
      return { spectating: true, state };
    }

    if (state.players.length >= state.maxPlayers) return null;

    const player = makePlayer(socketId, playerName);
    player.ready = false;
    state.players.push(player);

    return state;
  }

  setReady(socketId: string, ready: boolean): { roomId: string; state: GameState } | null {
    for (const [roomId, state] of this.rooms) {
      const player = state.players.find((p) => p.id === socketId);
      if (!player) continue;
      player.ready = ready;
      return { roomId, state };
    }
    return null;
  }

  startGame(socketId: string): { roomId: string; state: GameState } | null {
    for (const [roomId, state] of this.rooms) {
      if (state.hostId !== socketId) continue;
      if (state.phase !== 'waiting') return null;
      if (state.players.length < 2) return null;
      if (!state.players.every((p) => p.ready)) return null;

      state.phase = 'playing';
      return { roomId, state };
    }
    return null;
  }

  removeSpectator(socketId: string): void {
    for (const [, spectatorSet] of this.spectators) {
      spectatorSet.delete(socketId);
    }
  }

  disconnectPlayer(
    socketId: string,
    onExpire: (roomId: string, state: GameState | null) => void,
  ): { roomId: string; state: GameState } | null {
    for (const [roomId, state] of this.rooms) {
      const player = state.players.find((p) => p.id === socketId);
      if (!player) continue;

      const existing = this.pendingRemovals.get(socketId);
      if (existing) clearTimeout(existing.timer);

      player.connected = false;

      const timer = setTimeout(() => {
        this.pendingRemovals.delete(socketId);
        const result = this.removePlayer(socketId);
        onExpire(roomId, result?.state ?? null);
      }, 30_000);

      this.pendingRemovals.set(socketId, { timer, roomId });
      return { roomId, state };
    }
    return null;
  }

  rejoinRoom(
    roomId: string,
    playerName: string,
    newSocketId: string,
  ): { roomId: string; state: GameState; oldSocketId: string } | null {
    const state = this.rooms.get(roomId);
    if (!state) return null;

    const player = state.players.find((p) => p.name === playerName && !p.connected);
    if (!player) return null;

    const oldSocketId = player.id;
    const pending = this.pendingRemovals.get(oldSocketId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRemovals.delete(oldSocketId);
    }

    player.id = newSocketId;
    player.connected = true;
    if (state.hostId === oldSocketId) state.hostId = newSocketId;

    return { roomId, state, oldSocketId };
  }

  kickPlayer(hostSocketId: string, targetId: string): { roomId: string; state: GameState } | null {
    for (const [roomId, state] of this.rooms) {
      if (state.hostId !== hostSocketId) continue;
      if (state.phase !== 'waiting') return null;

      const idx = state.players.findIndex((p) => p.id === targetId);
      if (idx < 0 || targetId === hostSocketId) return null;

      state.players.splice(idx, 1);
      if (state.activePlayerIndex >= state.players.length) {
        state.activePlayerIndex = 0;
      }
      return { roomId, state };
    }
    return null;
  }

  restartRoom(socketId: string): { roomId: string; state: GameState } | null {
    for (const [roomId, state] of this.rooms) {
      if (state.hostId !== socketId) continue;
      if (state.phase !== 'ended') return null;

      state.phase = 'waiting';
      state.activePlayerIndex = 0;
      state.dice = [1, 1, 1, 1, 1];
      state.held = [false, false, false, false, false];
      state.rollsUsed = 0;
      state.winnerId = null;
      state.players.forEach((p) => {
        p.card = makeEmptyScorecard();
        p.ready = false;
      });

      return { roomId, state };
    }
    return null;
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
        this.spectators.delete(roomId);
        return null;
      }

      // 1명만 남으면 게임 종료 (playing 중일 때만)
      if (state.players.length === 1 && state.phase === 'playing') {
        state.phase = 'ended';
        state.winnerId = state.players[0].id;
        return { roomId, state };
      }

      // host가 나가면 다음 플레이어에게 host 이전
      if (state.hostId === socketId && state.players.length > 0) {
        state.hostId = state.players[0].id;
        state.hostName = state.players[0].name;
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
      if (state.isPublic && (state.phase === 'waiting' || state.phase === 'playing')) {
        rooms.push({
          roomId: state.roomId,
          hostName: state.hostName,
          playerCount: state.players.length,
          maxPlayers: state.maxPlayers,
          isPublic: state.isPublic,
          phase: state.phase,
        });
      }
    }
    return rooms;
  }
}
