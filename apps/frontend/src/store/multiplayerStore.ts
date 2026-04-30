import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { GameState, Scorecard } from '@shared/types/game';
import type { RoomInfo } from '@shared/types/ws';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

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
  myName: string | null;
  connectionState: ConnectionState;
  gameState: GameState | null;
  error: string | null;
  publicRooms: RoomInfo[];
  isSpectator: boolean;
  chatMessages: ChatMessage[];
  pendingRejoinModal: boolean;

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
  rejoin: () => void;
  spectate: () => void;
  restartRoom: () => void;
  kickPlayer: (targetId: string) => void;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useMultiplayerStore = create<MultiplayerStore>((set, get) => ({
  socket: null,
  roomId: null,
  playerId: null,
  myName: null,
  connectionState: 'disconnected',
  gameState: null,
  error: null,
  publicRooms: [],
  isSpectator: false,
  chatMessages: [],
  pendingRejoinModal: false,

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
        myName: playerName,
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
      const { connectionState } = get();
      if (connectionState !== 'connected') {
        set({ error: data.message, connectionState: 'disconnected' });
        socket.disconnect();
      } else {
        set({ error: data.message });
      }
    });

    socket.on('room:kicked', () => {
      socket.disconnect();
      set({ socket: null, roomId: null, playerId: null, myName: null, connectionState: 'disconnected', gameState: null, error: '방장에 의해 강퇴되었습니다.', isSpectator: false, chatMessages: [], pendingRejoinModal: false });
    });

    socket.on('game:state', (state: GameState) => {
      set({ gameState: state, ...(state.phase !== 'playing' ? { pendingRejoinModal: false } : {}) });
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      set((s) => ({ chatMessages: [...s.chatMessages.slice(-99), msg] }));
    });

    socket.on('room:rejoined', (data: { gameState: GameState }) => {
      set({ gameState: data.gameState, connectionState: 'connected', playerId: socket.id });
    });

    socket.on('room:rejoin_failed', () => {
      set({ connectionState: 'disconnected', socket: null, roomId: null, gameState: null, isSpectator: false, chatMessages: [], myName: null });
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect' || reason === 'io server disconnect') {
        set({ connectionState: 'disconnected', socket: null, roomId: null, isSpectator: false, chatMessages: [], myName: null });
      } else {
        set({ connectionState: 'reconnecting' });
      }
    });

    socket.io.on('reconnect', () => {
      const { roomId: currentRoomId, myName: currentName, isSpectator, gameState } = get();
      if (currentRoomId && currentName && !isSpectator) {
        set({ playerId: socket.id });
        if (gameState?.phase === 'playing') {
          set({ pendingRejoinModal: true });
        } else {
          socket.emit('room:rejoin', { roomId: currentRoomId, playerName: currentName });
        }
      }
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
        myName: playerName,
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
      const { connectionState } = get();
      if (connectionState !== 'connected') {
        set({ error: data.message, connectionState: 'disconnected' });
        socket.disconnect();
      } else {
        set({ error: data.message });
      }
    });

    socket.on('room:kicked', () => {
      socket.disconnect();
      set({ socket: null, roomId: null, playerId: null, myName: null, connectionState: 'disconnected', gameState: null, error: '방장에 의해 강퇴되었습니다.', isSpectator: false, chatMessages: [], pendingRejoinModal: false });
    });

    socket.on('game:state', (state: GameState) => {
      set({ gameState: state, ...(state.phase !== 'playing' ? { pendingRejoinModal: false } : {}) });
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      set((s) => ({ chatMessages: [...s.chatMessages.slice(-99), msg] }));
    });

    socket.on('room:rejoined', (data: { gameState: GameState }) => {
      set({ gameState: data.gameState, connectionState: 'connected', playerId: socket.id });
    });

    socket.on('room:rejoin_failed', () => {
      set({ connectionState: 'disconnected', socket: null, roomId: null, gameState: null, isSpectator: false, chatMessages: [], myName: null });
    });

    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect' || reason === 'io server disconnect') {
        set({ connectionState: 'disconnected', socket: null, roomId: null, isSpectator: false, chatMessages: [], myName: null });
      } else {
        set({ connectionState: 'reconnecting' });
      }
    });

    socket.io.on('reconnect', () => {
      const { roomId: currentRoomId, myName: currentName, isSpectator, gameState } = get();
      if (currentRoomId && currentName && !isSpectator) {
        set({ playerId: socket.id });
        if (gameState?.phase === 'playing') {
          set({ pendingRejoinModal: true });
        } else {
          socket.emit('room:rejoin', { roomId: currentRoomId, playerName: currentName });
        }
      }
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
      myName: null,
      connectionState: 'disconnected',
      gameState: null,
      error: null,
      isSpectator: false,
      chatMessages: [],
      pendingRejoinModal: false,
    });
  },

  rejoin: () => {
    const { socket, roomId, myName } = get();
    if (socket && roomId && myName) {
      set({ pendingRejoinModal: false });
      socket.emit('room:rejoin', { roomId, playerName: myName });
    }
  },

  spectate: () => {
    const { socket, roomId, myName } = get();
    if (socket && roomId && myName) {
      set({ pendingRejoinModal: false, isSpectator: true });
      socket.emit('room:join', { roomId, playerName: myName });
    }
  },

  restartRoom: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('room:restart');
    }
  },

  kickPlayer: (targetId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('room:kick', { targetId });
    }
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
      // 기존 연결된 소켓에는 room:list 리스너가 없으므로 one-time 리스너 등록 후 요청
      socket.once('room:list', (data: { rooms: RoomInfo[] }) => {
        set({ publicRooms: data.rooms });
      });
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
