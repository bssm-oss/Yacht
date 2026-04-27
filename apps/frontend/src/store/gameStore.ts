import { create } from 'zustand';
import type { DiceValue, Scorecard, Player, GameState } from '@shared/types/game';
import { makeEmptyScorecard, allFilled, scoreCategory, computeTotals } from '@shared/scoring';

function randomDice(): DiceValue[] {
  return Array.from({ length: 5 }, () =>
    (Math.floor(Math.random() * 6) + 1) as DiceValue
  );
}

function makePlayer(id: string, name: string): Player {
  return {
    id,
    name,
    card: makeEmptyScorecard(),
    connected: true,
  };
}

interface GameStore {
  gameState: GameState;
  rollSeed: number;
  theme: 'light' | 'dark';
  mood: 'soft' | 'warm' | 'cool';
  playerCount: number;
  showHints: boolean;

  // Actions
  roll: () => void;
  toggleHold: (index: number) => void;
  pickCategory: (catId: keyof Scorecard) => void;
  newGame: () => void;
  renamePlayer: (index: number, name: string) => void;
  setPlayerCount: (count: number) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setMood: (mood: 'soft' | 'warm' | 'cool') => void;
  setShowHints: (show: boolean) => void;
  onRollComplete: () => void;
}

function createInitialState(playerCount: number): GameState {
  const players = Array.from({ length: playerCount }, (_, i) =>
    makePlayer(`p${i}`, `Player ${i + 1}`)
  );
  return {
    roomId: 'local',
    players,
    activePlayerIndex: 0,
    dice: [1, 1, 1, 1, 1] as DiceValue[],
    held: [false, false, false, false, false],
    rollsUsed: 0,
    phase: 'playing',
    winnerId: null,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: createInitialState(1),
  rollSeed: 0,
  theme: 'light',
  mood: 'soft',
  playerCount: 1,
  showHints: true,

  roll: () => {
    const state = get().gameState;
    if (state.phase !== 'playing') return;
    if (state.rollsUsed >= 3) return;

    const newDice = randomDice();
    const dice = state.dice.map((v, i) => (state.held[i] ? v : newDice[i]));

    set({
      gameState: { ...state, dice, rollsUsed: state.rollsUsed + 1 },
      rollSeed: get().rollSeed + 1,
    });
  },

  toggleHold: (index: number) => {
    const state = get().gameState;
    if (state.phase !== 'playing') return;
    if (state.rollsUsed === 0) return;
    if (index < 0 || index >= 5) return;

    const held = [...state.held];
    held[index] = !held[index];
    set({ gameState: { ...state, held } });
  },

  pickCategory: (catId: keyof Scorecard) => {
    const state = get().gameState;
    if (state.phase !== 'playing') return;
    if (state.rollsUsed === 0) return;

    const player = state.players[state.activePlayerIndex];
    if (player.card[catId] != null) return;

    const score = scoreCategory(catId, state.dice);
    const newCard = { ...player.card, [catId]: score };
    const newPlayers = [...state.players];
    newPlayers[state.activePlayerIndex] = { ...player, card: newCard };

    // Check game over
    if (allFilled(newCard)) {
      // If all players have filled cards, find winner
      const allDone = newPlayers.every((p) => allFilled(p.card));
      if (allDone) {
        let bestId = newPlayers[0].id;
        let bestScore = -1;
        for (const p of newPlayers) {
          const t = computeTotals(p.card);
          if (t.grand > bestScore) {
            bestScore = t.grand;
            bestId = p.id;
          }
        }
        set({
          gameState: {
            ...state,
            players: newPlayers,
            phase: 'ended',
            winnerId: bestId,
          },
        });
        return;
      }
    }

    // Next player
    const nextIndex = (state.activePlayerIndex + 1) % state.players.length;
    set({
      gameState: {
        ...state,
        players: newPlayers,
        activePlayerIndex: nextIndex,
        dice: [1, 1, 1, 1, 1] as DiceValue[],
        held: [false, false, false, false, false],
        rollsUsed: 0,
      },
    });
  },

  newGame: () => {
    const count = get().playerCount;
    set({
      gameState: createInitialState(count),
      rollSeed: 0,
    });
  },

  renamePlayer: (index: number, name: string) => {
    const state = get().gameState;
    if (index < 0 || index >= state.players.length) return;
    const newPlayers = [...state.players];
    newPlayers[index] = { ...newPlayers[index], name };
    set({ gameState: { ...state, players: newPlayers } });
  },

  setPlayerCount: (count: number) => {
    set({ playerCount: count });
    get().newGame();
  },

  setTheme: (theme) => set({ theme }),
  setMood: (mood) => set({ mood }),
  setShowHints: (showHints) => set({ showHints }),

  onRollComplete: () => {
    // Called by Dice3D when animation finishes
    // State is already updated; this is for any post-roll logic
  },
}));
