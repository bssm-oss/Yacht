import type { DiceValue, Scorecard } from './types/game';
export declare const sumOf: (dice: DiceValue[]) => number;
export declare const counts: (dice: DiceValue[]) => number[];
export declare const scoreOnes: (dice: DiceValue[]) => number;
export declare const scoreTwos: (dice: DiceValue[]) => number;
export declare const scoreThrees: (dice: DiceValue[]) => number;
export declare const scoreFours: (dice: DiceValue[]) => number;
export declare const scoreFives: (dice: DiceValue[]) => number;
export declare const scoreSixes: (dice: DiceValue[]) => number;
export declare const scoreChoice: (dice: DiceValue[]) => number;
export declare const scoreFourKind: (dice: DiceValue[]) => number;
export declare const scoreFullHouse: (dice: DiceValue[]) => number;
export declare const scoreSmallStraight: (dice: DiceValue[]) => number;
export declare const scoreLargeStraight: (dice: DiceValue[]) => number;
export declare const scoreYacht: (dice: DiceValue[]) => number;
export declare const CATEGORY_SCORERS: Record<keyof Scorecard, (dice: DiceValue[]) => number>;
export declare const UPPER_BONUS_THRESHOLD = 63;
export declare const UPPER_BONUS_VALUE = 35;
export declare const makeEmptyScorecard: () => Scorecard;
export declare const computeTotals: (card: Scorecard) => {
    upper: number;
    lower: number;
    bonus: number;
    grand: number;
};
export declare const allFilled: (card: Scorecard) => boolean;
export declare const scoreCategory: (category: keyof Scorecard, dice: DiceValue[]) => number;
//# sourceMappingURL=scoring.d.ts.map