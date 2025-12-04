export declare const GAME_ID = "candy-carnage-1000";
export declare const GAME_NAME = "Candy Carnage 1000";
export declare const REELS = 6;
export declare const VISIBLE_ROWS = 5;
export declare const TOP_PADDING = 1;
export declare const BOTTOM_PADDING = 1;
export declare const TOTAL_ROWS_WITH_PADDING: number;
export declare const CLUSTER_MIN_SIZE = 8;
export declare const INITIAL_FREE_SPINS = 10;
export declare const RETRIGGER_SPINS = 5;
export declare const MAX_WIN_MULTIPLIER = 25000;
export type BonusType = 'regular' | 'super';
export declare const PAY_SYMBOL_IDS: readonly ["H1", "H2", "H3", "H4", "L1", "L2", "L3", "L4", "L5"];
export declare const REGULAR_BOMB_VALUES: number[];
export declare const SUPER_BOMB_VALUES: number[];
export interface WinLevelConfig {
    id: number;
    name: string;
    min: number;
    max: number | null;
    animation: 'none' | 'big' | 'superwin' | 'mega' | 'epic' | 'max';
}
export declare const WIN_LEVELS: WinLevelConfig[];
export declare const SCATTER_PAYOUTS: Map<number, number>;
//# sourceMappingURL=constants.d.ts.map