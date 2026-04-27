"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreCategory = exports.allFilled = exports.computeTotals = exports.makeEmptyScorecard = exports.UPPER_BONUS_VALUE = exports.UPPER_BONUS_THRESHOLD = exports.CATEGORY_SCORERS = exports.scoreYacht = exports.scoreLargeStraight = exports.scoreSmallStraight = exports.scoreFullHouse = exports.scoreFourKind = exports.scoreChoice = exports.scoreSixes = exports.scoreFives = exports.scoreFours = exports.scoreThrees = exports.scoreTwos = exports.scoreOnes = exports.counts = exports.sumOf = void 0;
const game_1 = require("./types/game");
const sumOf = (dice) => dice.reduce((a, b) => a + b, 0);
exports.sumOf = sumOf;
const counts = (dice) => {
    const c = [0, 0, 0, 0, 0, 0, 0];
    for (const d of dice)
        c[d]++;
    return c;
};
exports.counts = counts;
const scoreOnes = (dice) => dice.filter((v) => v === 1).length * 1;
exports.scoreOnes = scoreOnes;
const scoreTwos = (dice) => dice.filter((v) => v === 2).length * 2;
exports.scoreTwos = scoreTwos;
const scoreThrees = (dice) => dice.filter((v) => v === 3).length * 3;
exports.scoreThrees = scoreThrees;
const scoreFours = (dice) => dice.filter((v) => v === 4).length * 4;
exports.scoreFours = scoreFours;
const scoreFives = (dice) => dice.filter((v) => v === 5).length * 5;
exports.scoreFives = scoreFives;
const scoreSixes = (dice) => dice.filter((v) => v === 6).length * 6;
exports.scoreSixes = scoreSixes;
const scoreChoice = (dice) => (0, exports.sumOf)(dice);
exports.scoreChoice = scoreChoice;
const scoreFourKind = (dice) => {
    const c = (0, exports.counts)(dice);
    for (let n = 6; n >= 1; n--)
        if (c[n] >= 4)
            return n * 4;
    return 0;
};
exports.scoreFourKind = scoreFourKind;
const scoreFullHouse = (dice) => {
    const c = (0, exports.counts)(dice);
    const has3 = c.includes(3);
    const has2 = c.includes(2);
    if (has3 && has2)
        return (0, exports.sumOf)(dice);
    return 0;
};
exports.scoreFullHouse = scoreFullHouse;
const scoreSmallStraight = (dice) => {
    const set = new Set(dice);
    const runs = [
        [1, 2, 3, 4],
        [2, 3, 4, 5],
        [3, 4, 5, 6],
    ];
    return runs.some((r) => r.every((v) => set.has(v))) ? 15 : 0;
};
exports.scoreSmallStraight = scoreSmallStraight;
const scoreLargeStraight = (dice) => {
    const set = new Set(dice);
    const a = [1, 2, 3, 4, 5].every((v) => set.has(v));
    const b = [2, 3, 4, 5, 6].every((v) => set.has(v));
    return a || b ? 30 : 0;
};
exports.scoreLargeStraight = scoreLargeStraight;
const scoreYacht = (dice) => {
    const c = (0, exports.counts)(dice);
    return c.some((n) => n === 5) ? 50 : 0;
};
exports.scoreYacht = scoreYacht;
exports.CATEGORY_SCORERS = {
    ones: exports.scoreOnes,
    twos: exports.scoreTwos,
    threes: exports.scoreThrees,
    fours: exports.scoreFours,
    fives: exports.scoreFives,
    sixes: exports.scoreSixes,
    choice: exports.scoreChoice,
    fourkind: exports.scoreFourKind,
    fullhouse: exports.scoreFullHouse,
    sstraight: exports.scoreSmallStraight,
    lstraight: exports.scoreLargeStraight,
    yacht: exports.scoreYacht,
};
exports.UPPER_BONUS_THRESHOLD = 63;
exports.UPPER_BONUS_VALUE = 35;
const makeEmptyScorecard = () => ({
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
exports.makeEmptyScorecard = makeEmptyScorecard;
const computeTotals = (card) => {
    let upper = 0;
    let lower = 0;
    for (const key of game_1.UPPER_CATEGORIES) {
        const v = card[key];
        if (v != null)
            upper += v;
    }
    for (const key of game_1.LOWER_CATEGORIES) {
        const v = card[key];
        if (v != null)
            lower += v;
    }
    const bonus = upper >= exports.UPPER_BONUS_THRESHOLD ? exports.UPPER_BONUS_VALUE : 0;
    return { upper, lower, bonus, grand: upper + bonus + lower };
};
exports.computeTotals = computeTotals;
const allFilled = (card) => {
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
    return keys.every((k) => card[k] != null);
};
exports.allFilled = allFilled;
const scoreCategory = (category, dice) => {
    return exports.CATEGORY_SCORERS[category](dice);
};
exports.scoreCategory = scoreCategory;
//# sourceMappingURL=scoring.js.map