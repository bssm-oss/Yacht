import { describe, it, expect } from 'vitest';
import {
  scoreOnes,
  scoreTwos,
  scoreThrees,
  scoreFours,
  scoreFives,
  scoreSixes,
  scoreChoice,
  scoreFourKind,
  scoreFullHouse,
  scoreSmallStraight,
  scoreLargeStraight,
  scoreYacht,
  scoreCategory,
  makeEmptyScorecard,
  computeTotals,
  allFilled,
  UPPER_BONUS_THRESHOLD,
  UPPER_BONUS_VALUE,
} from '../scoring';
import type { DiceValue } from '../../types/game';

describe('Upper section scoring', () => {
  it('scoreOnes sums only 1s', () => {
    expect(scoreOnes([1, 1, 2, 3, 4])).toBe(2);
    expect(scoreOnes([2, 3, 4, 5, 6])).toBe(0);
    expect(scoreOnes([1, 1, 1, 1, 1])).toBe(5);
  });

  it('scoreTwos sums only 2s', () => {
    expect(scoreTwos([2, 2, 3, 4, 5])).toBe(4);
    expect(scoreTwos([1, 3, 4, 5, 6])).toBe(0);
    expect(scoreTwos([2, 2, 2, 2, 2])).toBe(10);
  });

  it('scoreThrees sums only 3s', () => {
    expect(scoreThrees([3, 3, 1, 2, 4])).toBe(6);
    expect(scoreThrees([1, 2, 4, 5, 6])).toBe(0);
  });

  it('scoreFours sums only 4s', () => {
    expect(scoreFours([4, 4, 4, 1, 2])).toBe(12);
    expect(scoreFours([1, 2, 3, 5, 6])).toBe(0);
  });

  it('scoreFives sums only 5s', () => {
    expect(scoreFives([5, 5, 1, 2, 3])).toBe(10);
    expect(scoreFives([1, 2, 3, 4, 6])).toBe(0);
  });

  it('scoreSixes sums only 6s', () => {
    expect(scoreSixes([6, 6, 6, 1, 2])).toBe(18);
    expect(scoreSixes([1, 2, 3, 4, 5])).toBe(0);
  });
});

describe('Lower section scoring', () => {
  it('scoreChoice sums all dice', () => {
    expect(scoreChoice([1, 2, 3, 4, 5])).toBe(15);
    expect(scoreChoice([6, 6, 6, 6, 6])).toBe(30);
  });

  it('scoreFourKind requires at least 4 of a kind', () => {
    expect(scoreFourKind([4, 4, 4, 4, 1])).toBe(16);
    expect(scoreFourKind([3, 3, 3, 3, 3])).toBe(12);
    expect(scoreFourKind([1, 2, 3, 4, 5])).toBe(0);
    expect(scoreFourKind([2, 2, 2, 3, 4])).toBe(0);
  });

  it('scoreFullHouse requires 3+2', () => {
    expect(scoreFullHouse([2, 2, 3, 3, 3])).toBe(13);
    expect(scoreFullHouse([5, 5, 5, 5, 5])).toBe(0); // yacht doesn't count
    expect(scoreFullHouse([1, 2, 3, 4, 5])).toBe(0);
  });

  it('scoreSmallStraight detects 4 in a row', () => {
    expect(scoreSmallStraight([1, 2, 3, 4, 6])).toBe(15);
    expect(scoreSmallStraight([2, 3, 4, 5, 5])).toBe(15);
    expect(scoreSmallStraight([3, 4, 5, 6, 1])).toBe(15);
    expect(scoreSmallStraight([1, 2, 3, 5, 6])).toBe(0);
    expect(scoreSmallStraight([1, 3, 4, 6, 6])).toBe(0);
  });

  it('scoreLargeStraight detects 5 in a row', () => {
    expect(scoreLargeStraight([1, 2, 3, 4, 5])).toBe(30);
    expect(scoreLargeStraight([2, 3, 4, 5, 6])).toBe(30);
    expect(scoreLargeStraight([1, 2, 3, 4, 6])).toBe(0);
    expect(scoreLargeStraight([1, 3, 5, 6, 2])).toBe(0);
  });

  it('scoreYacht requires all 5 same', () => {
    expect(scoreYacht([3, 3, 3, 3, 3])).toBe(50);
    expect(scoreYacht([1, 1, 1, 1, 2])).toBe(0);
    expect(scoreYacht([1, 2, 3, 4, 5])).toBe(0);
  });
});

describe('scoreCategory dispatcher', () => {
  it('dispatches to correct scorer', () => {
    expect(scoreCategory('ones', [1, 1, 2, 3, 4])).toBe(2);
    expect(scoreCategory('yacht', [5, 5, 5, 5, 5])).toBe(50);
    expect(scoreCategory('choice', [1, 2, 3, 4, 5])).toBe(15);
  });
});

describe('makeEmptyScorecard', () => {
  it('creates scorecard with all null values', () => {
    const card = makeEmptyScorecard();
    const keys = [
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
    ] as const;
    for (const key of keys) {
      expect(card[key]).toBeNull();
    }
  });
});

describe('computeTotals', () => {
  it('calculates upper, lower, bonus, and grand total', () => {
    const card = makeEmptyScorecard();
    card.ones = 3;
    card.twos = 4;
    card.choice = 15;

    const totals = computeTotals(card);
    expect(totals.upper).toBe(7);
    expect(totals.lower).toBe(15);
    expect(totals.bonus).toBe(0);
    expect(totals.grand).toBe(22);
  });

  it('awards upper bonus when threshold met', () => {
    const card = makeEmptyScorecard();
    card.ones = 3;
    card.twos = 6;
    card.threes = 9;
    card.fours = 12;
    card.fives = 15;
    card.sixes = 18;
    // upper = 63

    const totals = computeTotals(card);
    expect(totals.upper).toBe(63);
    expect(totals.bonus).toBe(UPPER_BONUS_VALUE);
    expect(totals.grand).toBe(63 + UPPER_BONUS_VALUE);
  });

  it('does not award bonus when under threshold', () => {
    const card = makeEmptyScorecard();
    card.ones = 1;
    card.twos = 2;
    // upper = 3

    const totals = computeTotals(card);
    expect(totals.upper).toBe(3);
    expect(totals.bonus).toBe(0);
  });

  it('handles exactly threshold', () => {
    const card = makeEmptyScorecard();
    card.ones = UPPER_BONUS_THRESHOLD;

    const totals = computeTotals(card);
    expect(totals.bonus).toBe(UPPER_BONUS_VALUE);
  });

  it('ignores null values', () => {
    const card = makeEmptyScorecard();
    const totals = computeTotals(card);
    expect(totals.upper).toBe(0);
    expect(totals.lower).toBe(0);
    expect(totals.bonus).toBe(0);
    expect(totals.grand).toBe(0);
  });
});

describe('allFilled', () => {
  it('returns false for empty card', () => {
    expect(allFilled(makeEmptyScorecard())).toBe(false);
  });

  it('returns true when all categories filled', () => {
    const card = makeEmptyScorecard();
    const keys = [
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
    ] as const;
    for (const key of keys) {
      card[key] = 0;
    }
    expect(allFilled(card)).toBe(true);
  });

  it('returns false when one category missing', () => {
    const card = makeEmptyScorecard();
    card.ones = 1;
    card.twos = 2;
    card.threes = 3;
    card.fours = 4;
    card.fives = 5;
    card.sixes = 6;
    card.choice = 7;
    card.fourkind = 8;
    card.fullhouse = 9;
    card.sstraight = 10;
    card.lstraight = 11;
    // yacht missing
    expect(allFilled(card)).toBe(false);
  });
});
