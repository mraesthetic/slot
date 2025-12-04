export const GAME_ID = 'candy-carnage-1000';
export const GAME_NAME = 'Candy Carnage 1000';

export const REELS = 6;
export const VISIBLE_ROWS = 5;
export const TOP_PADDING = 1;
export const BOTTOM_PADDING = 1;
export const TOTAL_ROWS_WITH_PADDING = VISIBLE_ROWS + TOP_PADDING + BOTTOM_PADDING;

export const CLUSTER_MIN_SIZE = 8;

export const INITIAL_FREE_SPINS = 10;
export const RETRIGGER_SPINS = 5;

export const MAX_WIN_MULTIPLIER = 25_000;

export type BonusType = 'regular' | 'super';

export const PAY_SYMBOL_IDS = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'L5'] as const;

export const REGULAR_BOMB_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 500, 1_000];
export const SUPER_BOMB_VALUES = [20, 25, 50, 100, 500, 1_000];

export interface WinLevelConfig {
  id: number;
  name: string;
  min: number;
  max: number | null;
  animation: 'none' | 'big' | 'superwin' | 'mega' | 'epic' | 'max';
}

export const WIN_LEVELS: WinLevelConfig[] = [
  { id: 0, name: 'zero', min: 0, max: 2, animation: 'none' },
  { id: 1, name: 'standard', min: 2, max: 5, animation: 'none' },
  { id: 2, name: 'small', min: 5, max: 10, animation: 'none' },
  { id: 3, name: 'nice', min: 10, max: 15, animation: 'none' },
  { id: 4, name: 'substantial', min: 15, max: 20, animation: 'none' },
  { id: 6, name: 'big', min: 20, max: 50, animation: 'big' },
  { id: 7, name: 'superwin', min: 50, max: 100, animation: 'superwin' },
  { id: 8, name: 'mega', min: 100, max: 250, animation: 'mega' },
  { id: 9, name: 'epic', min: 250, max: 1_000, animation: 'epic' },
  { id: 10, name: 'max', min: 1_000, max: null, animation: 'max' },
];

export const SCATTER_PAYOUTS = new Map([
  [4, 0],
  [5, 5],
  [6, 100],
]);

