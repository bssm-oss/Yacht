import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { GameState, Scorecard } from '@shared/types/game';
import type { RoomInfo } from '@shared/types/ws';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface MultiplayerStore {
  socket: Socket | null;
  roomId: string | null;
  playerId: string | null;
  connectionState: ConnectionState;
  gameState: GameState | null;
  error: string | null;
  publicRooms: RoomInfo[];
  isSpectator: boolean;
  chatMessages: ChatMessage[];

  createRoom: (playerName: string, maxPlayers: number, isPublic: boolean) => Promise<void>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  disconnect: () => void;
  roll: () => void;
  hold: (index: number) => void;
  pickCategory: (catId: keyof Scorecard) => void;
  fetchPublicRooms: () => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;
  sendChat: (message: string) => void;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useMultiplayerStore = create<MultiplayerStore>((set, get) => ({
  socket: null,
  roomId: null,
  playerId: null,
  connectionState: 'disconnected',
  gameState: null,
  error: null,
  publicRooms: [],
  isSpectator: false,
  chatMessages: [],

  createRoom: async (playerName: string, maxPlayers: number, isPublic: boolean) => {
    set({ connectionState: 'connecting', error: null });
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      set({ playerId: socket.id });
      socket.emit('room:create', { playerName, maxPlayers, isPublic });
    });

    socket.on('room:created', (data: { roomId: string; gameState: GameState }) => {
      set({
        socket,
        roomId: data.roomId,
        gameState: data.gameState,
        connectionState: 'connected',
        isSpectator: false,
      });
    });

    socket.on('room:spectating', (data: { gameState: GameState }) => {
      set({
        socket,
        roomId: data.gameState.roomId,
        gameState: data.gameState,
        connectionState: 'connected',
        isSpectator: true,
      });
    });

    socket.on('room:error', (data: { message: string }) => {
      set({ error: data.message, connectionState: 'disconnected' });
      socket.disconnect();
    });

    socket.on('game:state', (state: GameState) => {
      set({ gameState: state });
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      set((s) => ({ chatMessages: [...s.chatMessages.slice(-99), msg] }));
    });

    socket.on('disconnect', () => {
      set({ connectionState: 'disconnected', socket: null, roomId: null, isSpectator: false, chatMessages: [] });
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
        isSpectator: false,
      });
    });

    socket.on('room:spectating', (data: { gameState: GameState }) => {
      set({
        socket,
        roomId: data.gameState.roomId,
        gameState: data.gameState,
        connectionState: 'connected',
        isSpectator: true,
      });
    });

    socket.on('room:error', (data: { message: string }) => {
      set({ error: data.message, connectionState: 'disconnected' });
      socket.disconnect();
    });

    socket.on('game:state', (state: GameState) => {
      set({ gameState: state });
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      set((s) => ({ chatMessages: [...s.chatMessages.slice(-99), msg] }));
    });

    socket.on('disconnect', () => {
      set({ connectionState: 'disconnected', socket: null, roomId: null, isSpectator: false, chatMessages: [] });
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
      isSpectator: false,
      chatMessages: [],
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

  fetchPublicRooms: () => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit('room:list');
      return;
    }
    const tempSocket = io(SOCKET_URL);
    tempSocket.on('connect', () => {
      tempSocket.emit('room:list');
    });
    tempSocket.on('room:list', (data: { rooms: RoomInfo[] }) => {
      set({ publicRooms: data.rooms });
      tempSocket.disconnect();
    });
    tempSocket.on('room:error', () => {
      tempSocket.disconnect();
    });
  },

  setReady: (ready: boolean) => {
    const { socket } = get();
    if (socket) {
      socket.emit('room:ready', { ready });
    }
  },

  startGame: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('room:start');
    }
  },

  sendChat: (message: string) => {
    const { socket, roomId } = get();
    if (socket && roomId && message.trim()) {
      socket.emit('chat:message', { roomId, message: message.trim() });
    }
  },
}));
