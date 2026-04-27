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
export declare const CATEGORY_KEYS: (keyof Scorecard)[];
export declare const UPPER_CATEGORIES: (keyof Scorecard)[];
export declare const LOWER_CATEGORIES: (keyof Scorecard)[];
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
//# sourceMappingURL=game.d.ts.map