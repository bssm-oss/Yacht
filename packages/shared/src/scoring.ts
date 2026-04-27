import type { DiceValue, Scorecard } from '../types/game';

export const sumOf = (dice: DiceValue[]): number => dice.reduce((a, b) => a + b, 0);

export const counts = (dice: DiceValue[]): number[] => {
  const c = [0, 0, 0, 0, 0, 0, 0]; // index 1..6
  for (const d of dice) c[d]++;
  return c;
};

export const scoreOnes = (dice: DiceValue[]): number => dice.filter((v) => v === 1).length * 1;
export const scoreTwos = (dice: DiceValue[]): number => dice.filter((v) => v === 2).length * 2;
export const scoreThrees = (dice: DiceValue[]): number => dice.filter((v) => v === 3).length * 3;
export const scoreFours = (dice: DiceValue[]): number => dice.filter((v) => v === 4).length * 4;
export const scoreFives = (dice: DiceValue[]): number => dice.filter((v) => v === 5).length * 5;
export const scoreSixes = (dice: DiceValue[]): number => dice.filter((v) => v === 6).length * 6;

export const scoreChoice = (dice: DiceValue[]): number => sumOf(dice);

export const scoreFourKind = (dice: DiceValue[]): number => {
  const c = counts(dice);
  for (let n = 6; n >= 1; n--) if (c[n] >= 4) return n * 4;
  return 0;
};

export const scoreFullHouse = (dice: DiceValue[]): number => {
  const c = counts(dice);
  const has3 = c.includes(3);
  const has2 = c.includes(2);
  if (has3 && has2) return sumOf(dice);
  return 0;
};

export const scoreSmallStraight = (dice: DiceValue[]): number => {
  const set = new Set(dice);
  const runs = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6],
  ];
  return runs.some((r) => r.every((v) => set.has(v as DiceValue))) ? 15 : 0;
};

export const scoreLargeStraight = (dice: DiceValue[]): number => {
  const set = new Set(dice);
  const a = [1, 2, 3, 4, 5].every((v) => set.has(v as DiceValue));
  const b = [2, 3, 4, 5, 6].every((v) => set.has(v as DiceValue));
  return a || b ? 30 : 0;
};

export const scoreYacht = (dice: DiceValue[]): number => {
  const c = counts(dice);
  return c.some((n) => n === 5) ? 50 : 0;
};

export const CATEGORY_SCORERS: Record<
  keyof Scorecard,
  (dice: DiceValue[]) => number
> = {
  ones: scoreOnes,
  twos: scoreTwos,
  threes: scoreThrees,
  fours: scoreFours,
  fives: scoreFives,
  sixes: scoreSixes,
  choice: scoreChoice,
  fourkind: scoreFourKind,
  fullhouse: scoreFullHouse,
  sstraight: scoreSmallStraight,
  lstraight: scoreLargeStraight,
  yacht: scoreYacht,
};

export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS_VALUE = 35;

export const makeEmptyScorecard = (): Scorecard => ({
  ones: null,
  twos: null,
  threes: null,
  fours: null,
  fives: null,
  sixes: null,
  choice: null,
  fourkind: null,
  fullhouse: null,
  sstraight: null,
  lstraight: null,
  yacht: null,
});

export const computeTotals = (card: Scorecard): { upper: number; lower: number; bonus: number; grand: number } => {
  let upper = 0;
  let lower = 0;

  const upperKeys: (keyof Scorecard)[] = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  const lowerKeys: (keyof Scorecard)[] = ['choice', 'fourkind', 'fullhouse', 'sstraight', 'lstraight', 'yacht'];

  for (const key of upperKeys) {
    const v = card[key];
    if (v != null) upper += v;
  }

  for (const key of lowerKeys) {
    const v = card[key];
    if (v != null) lower += v;
  }

  const bonus = upper >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_VALUE : 0;
  return { upper, lower, bonus, grand: upper + bonus + lower };
};

export const allFilled = (card: Scorecard): boolean => {
  const keys: (keyof Scorecard)[] = [
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
  return keys.every((k) => card[k] != null);
};

export const scoreCategory = (category: keyof Scorecard, dice: DiceValue[]): number => {
  return CATEGORY_SCORERS[category](dice);
};
