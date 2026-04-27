"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scoring_1 = require("../scoring");
(0, vitest_1.describe)('Upper section scoring', () => {
    (0, vitest_1.it)('scoreOnes sums only 1s', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreOnes)([1, 1, 2, 3, 4])).toBe(2);
        (0, vitest_1.expect)((0, scoring_1.scoreOnes)([2, 3, 4, 5, 6])).toBe(0);
        (0, vitest_1.expect)((0, scoring_1.scoreOnes)([1, 1, 1, 1, 1])).toBe(5);
    });
    (0, vitest_1.it)('scoreTwos sums only 2s', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreTwos)([2, 2, 3, 4, 5])).toBe(4);
        (0, vitest_1.expect)((0, scoring_1.scoreTwos)([1, 3, 4, 5, 6])).toBe(0);
        (0, vitest_1.expect)((0, scoring_1.scoreTwos)([2, 2, 2, 2, 2])).toBe(10);
    });
    (0, vitest_1.it)('scoreThrees sums only 3s', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreThrees)([3, 3, 1, 2, 4])).toBe(6);
        (0, vitest_1.expect)((0, scoring_1.scoreThrees)([1, 2, 4, 5, 6])).toBe(0);
    });
    (0, vitest_1.it)('scoreFours sums only 4s', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreFours)([4, 4, 4, 1, 2])).toBe(12);
        (0, vitest_1.expect)((0, scoring_1.scoreFours)([1, 2, 3, 5, 6])).toBe(0);
    });
    (0, vitest_1.it)('scoreFives sums only 5s', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreFives)([5, 5, 1, 2, 3])).toBe(10);
        (0, vitest_1.expect)((0, scoring_1.scoreFives)([1, 2, 3, 4, 6])).toBe(0);
    });
    (0, vitest_1.it)('scoreSixes sums only 6s', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreSixes)([6, 6, 6, 1, 2])).toBe(18);
        (0, vitest_1.expect)((0, scoring_1.scoreSixes)([1, 2, 3, 4, 5])).toBe(0);
    });
});
(0, vitest_1.describe)('Lower section scoring', () => {
    (0, vitest_1.it)('scoreChoice sums all dice', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreChoice)([1, 2, 3, 4, 5])).toBe(15);
        (0, vitest_1.expect)((0, scoring_1.scoreChoice)([6, 6, 6, 6, 6])).toBe(30);
    });
    (0, vitest_1.it)('scoreFourKind requires at least 4 of a kind', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreFourKind)([4, 4, 4, 4, 1])).toBe(16);
        (0, vitest_1.expect)((0, scoring_1.scoreFourKind)([3, 3, 3, 3, 3])).toBe(12);
        (0, vitest_1.expect)((0, scoring_1.scoreFourKind)([1, 2, 3, 4, 5])).toBe(0);
        (0, vitest_1.expect)((0, scoring_1.scoreFourKind)([2, 2, 2, 3, 4])).toBe(0);
    });
    (0, vitest_1.it)('scoreFullHouse requires 3+2', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreFullHouse)([2, 2, 3, 3, 3])).toBe(13);
        (0, vitest_1.expect)((0, scoring_1.scoreFullHouse)([5, 5, 5, 5, 5])).toBe(0);
        (0, vitest_1.expect)((0, scoring_1.scoreFullHouse)([1, 2, 3, 4, 5])).toBe(0);
    });
    (0, vitest_1.it)('scoreSmallStraight detects 4 in a row', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreSmallStraight)([1, 2, 3, 4, 6])).toBe(15);
        (0, vitest_1.expect)((0, scoring_1.scoreSmallStraight)([2, 3, 4, 5, 5])).toBe(15);
        (0, vitest_1.expect)((0, scoring_1.scoreSmallStraight)([3, 4, 5, 6, 1])).toBe(15);
        (0, vitest_1.expect)((0, scoring_1.scoreSmallStraight)([1, 2, 3, 5, 6])).toBe(0);
        (0, vitest_1.expect)((0, scoring_1.scoreSmallStraight)([1, 3, 4, 6, 6])).toBe(0);
    });
    (0, vitest_1.it)('scoreLargeStraight detects 5 in a row', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreLargeStraight)([1, 2, 3, 4, 5])).toBe(30);
        (0, vitest_1.expect)((0, scoring_1.scoreLargeStraight)([2, 3, 4, 5, 6])).toBe(30);
        (0, vitest_1.expect)((0, scoring_1.scoreLargeStraight)([1, 2, 3, 4, 6])).toBe(0);
        (0, vitest_1.expect)((0, scoring_1.scoreLargeStraight)([1, 3, 5, 6, 2])).toBe(0);
    });
    (0, vitest_1.it)('scoreYacht requires all 5 same', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreYacht)([3, 3, 3, 3, 3])).toBe(50);
        (0, vitest_1.expect)((0, scoring_1.scoreYacht)([1, 1, 1, 1, 2])).toBe(0);
        (0, vitest_1.expect)((0, scoring_1.scoreYacht)([1, 2, 3, 4, 5])).toBe(0);
    });
});
(0, vitest_1.describe)('scoreCategory dispatcher', () => {
    (0, vitest_1.it)('dispatches to correct scorer', () => {
        (0, vitest_1.expect)((0, scoring_1.scoreCategory)('ones', [1, 1, 2, 3, 4])).toBe(2);
        (0, vitest_1.expect)((0, scoring_1.scoreCategory)('yacht', [5, 5, 5, 5, 5])).toBe(50);
        (0, vitest_1.expect)((0, scoring_1.scoreCategory)('choice', [1, 2, 3, 4, 5])).toBe(15);
    });
});
(0, vitest_1.describe)('makeEmptyScorecard', () => {
    (0, vitest_1.it)('creates scorecard with all null values', () => {
        const card = (0, scoring_1.makeEmptyScorecard)();
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
        ];
        for (const key of keys) {
            (0, vitest_1.expect)(card[key]).toBeNull();
        }
    });
});
(0, vitest_1.describe)('computeTotals', () => {
    (0, vitest_1.it)('calculates upper, lower, bonus, and grand total', () => {
        const card = (0, scoring_1.makeEmptyScorecard)();
        card.ones = 3;
        card.twos = 4;
        card.choice = 15;
        const totals = (0, scoring_1.computeTotals)(card);
        (0, vitest_1.expect)(totals.upper).toBe(7);
        (0, vitest_1.expect)(totals.lower).toBe(15);
        (0, vitest_1.expect)(totals.bonus).toBe(0);
        (0, vitest_1.expect)(totals.grand).toBe(22);
    });
    (0, vitest_1.it)('awards upper bonus when threshold met', () => {
        const card = (0, scoring_1.makeEmptyScorecard)();
        card.ones = 3;
        card.twos = 6;
        card.threes = 9;
        card.fours = 12;
        card.fives = 15;
        card.sixes = 18;
        const totals = (0, scoring_1.computeTotals)(card);
        (0, vitest_1.expect)(totals.upper).toBe(63);
        (0, vitest_1.expect)(totals.bonus).toBe(scoring_1.UPPER_BONUS_VALUE);
        (0, vitest_1.expect)(totals.grand).toBe(63 + scoring_1.UPPER_BONUS_VALUE);
    });
    (0, vitest_1.it)('does not award bonus when under threshold', () => {
        const card = (0, scoring_1.makeEmptyScorecard)();
        card.ones = 1;
        card.twos = 2;
        const totals = (0, scoring_1.computeTotals)(card);
        (0, vitest_1.expect)(totals.upper).toBe(3);
        (0, vitest_1.expect)(totals.bonus).toBe(0);
    });
    (0, vitest_1.it)('handles exactly threshold', () => {
        const card = (0, scoring_1.makeEmptyScorecard)();
        card.ones = scoring_1.UPPER_BONUS_THRESHOLD;
        const totals = (0, scoring_1.computeTotals)(card);
        (0, vitest_1.expect)(totals.bonus).toBe(scoring_1.UPPER_BONUS_VALUE);
    });
    (0, vitest_1.it)('ignores null values', () => {
        const card = (0, scoring_1.makeEmptyScorecard)();
        const totals = (0, scoring_1.computeTotals)(card);
        (0, vitest_1.expect)(totals.upper).toBe(0);
        (0, vitest_1.expect)(totals.lower).toBe(0);
        (0, vitest_1.expect)(totals.bonus).toBe(0);
        (0, vitest_1.expect)(totals.grand).toBe(0);
    });
});
(0, vitest_1.describe)('allFilled', () => {
    (0, vitest_1.it)('returns false for empty card', () => {
        (0, vitest_1.expect)((0, scoring_1.allFilled)((0, scoring_1.makeEmptyScorecard)())).toBe(false);
    });
    (0, vitest_1.it)('returns true when all categories filled', () => {
        const card = (0, scoring_1.makeEmptyScorecard)();
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
        ];
        for (const key of keys) {
            card[key] = 0;
        }
        (0, vitest_1.expect)((0, scoring_1.allFilled)(card)).toBe(true);
    });
    (0, vitest_1.it)('returns false when one category missing', () => {
        const card = (0, scoring_1.makeEmptyScorecard)();
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
        (0, vitest_1.expect)((0, scoring_1.allFilled)(card)).toBe(false);
    });
});
//# sourceMappingURL=scoring.test.js.map