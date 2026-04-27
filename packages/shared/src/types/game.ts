export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface Scorecard {
  ones: number | null;
  twos: number | null;
  threes: number | null;
  fours: number | null;
  fives: number | null;
  sixes: number | null;
  choice: number | null;
  fourkind: number | null;
  fullhouse: number | null;
  sstraight: number | null;
  lstraight: number | null;
  yacht: number | null;
}

export const CATEGORY_KEYS: (keyof Scorecard)[] = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
  'choice',
  'fourkind',
  'fullhouse',
  'sstraight',
  'lstraight',
  'yacht',
];

export const UPPER_CATEGORIES: (keyof Scorecard)[] = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
];

export const LOWER_CATEGORIES: (keyof Scorecard)[] = [
  'choice',
  'fourkind',
  'fullhouse',
  'sstraight',
  'lstraight',
  'yacht',
];

export interface Player {
  id: string;
  name: string;
  card: Scorecard;
  connected: boolean;
}

export interface GameState {
  roomId: string;
  players: Player[];
  activePlayerIndex: number;
  dice: DiceValue[];
  held: boolean[];
  rollsUsed: number;
  phase: 'waiting' | 'playing' | 'ended';
  winnerId: string | null;
}
