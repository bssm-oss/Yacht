import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { GameState, Scorecard } from '@shared/types/game';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface MultiplayerStore {
  socket: Socket | null;
  roomId: string | null;
  playerId: string | null;
  connectionState: ConnectionState;
  gameState: GameState | null;
  error: string | null;

  createRoom: (playerName: string) => Promise<void>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  disconnect: () => void;
  roll: () => void;
  hold: (index: number) => void;
  pickCategory: (catId: keyof Scorecard) => void;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useMultiplayerStore = create<MultiplayerStore>((set, get) => ({
  socket: null,
  roomId: null,
  playerId: null,
  connectionState: 'disconnected',
  gameState: null,
  error: null,

  createRoom: async (playerName: string) => {
    set({ connectionState: 'connecting', error: null });
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      set({ playerId: socket.id });
      socket.emit('room:create', { playerName });
    });

    socket.on('room:created', (data: { roomId: string; gameState: GameState }) => {
      set({
        socket,
        roomId: data.roomId,
        gameState: data.gameState,
        connectionState: 'connected',
      });
    });

    socket.on('room:error', (data: { message: string }) => {
      set({ error: data.message, connectionState: 'disconnected' });
      socket.disconnect();
    });

    socket.on('game:state', (state: GameState) => {
      set({ gameState: state });
    });

    socket.on('disconnect', () => {
      set({ connectionState: 'disconnected', socket: null, roomId: null });
    });
  },

  joinRoom: async (roomId: string, playerName: string) => {
    set({ connectionState: 'connecting', error: null });
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      set({ playerId: socket.id });
      socket.emit('room:join', { roomId, playerName });
    });

    socket.on('room:joined', (data: { gameState: GameState }) => {
      set({
        socket,
        roomId: data.gameState.roomId,
        gameState: data.gameState,
        connectionState: 'connected',
      });
    });

    socket.on('room:error', (data: { message: string }) => {
      set({ error: data.message, connectionState: 'disconnected' });
      socket.disconnect();
    });

    socket.on('game:state', (state: GameState) => {
      set({ gameState: state });
    });

    socket.on('disconnect', () => {
      set({ connectionState: 'disconnected', socket: null, roomId: null });
    });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({
      socket: null,
      roomId: null,
      playerId: null,
      connectionState: 'disconnected',
      gameState: null,
      error: null,
    });
  },

  roll: () => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('game:roll', { roomId });
    }
  },

  hold: (index: number) => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('game:hold', { roomId, index });
    }
  },

  pickCategory: (catId: keyof Scorecard) => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('game:pick', { roomId, categoryId: catId });
    }
  },
}));
