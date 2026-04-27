import type { Scorecard } from './game';

// Client → Server
export type ClientEvents = {
  'room:create': { playerName: string };
  'room:join': { roomId: string; playerName: string };
  'game:roll': { roomId: string };
  'game:hold': { roomId: string; index: number };
  'game:pick': { roomId: string; categoryId: keyof Scorecard };
};

// Server → Client
export type ServerEvents = {
  'room:created': { roomId: string; gameState: import('./game').GameState };
  'room:joined': { gameState: import('./game').GameState };
  'room:error': { message: string };
  'game:state': import('./game').GameState;
  'game:rolled': { dice: import('./game').DiceValue[]; rollsUsed: number };
  'game:held': { held: boolean[] };
  'game:picked': { gameState: import('./game').GameState };
  'game:ended': { winnerId: string; finalState: import('./game').GameState };
};
