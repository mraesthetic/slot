"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCATTER_PAYOUTS = exports.WIN_LEVELS = exports.SUPER_BOMB_VALUES = exports.REGULAR_BOMB_VALUES = exports.PAY_SYMBOL_IDS = exports.MAX_WIN_MULTIPLIER = exports.RETRIGGER_SPINS = exports.INITIAL_FREE_SPINS = exports.CLUSTER_MIN_SIZE = exports.TOTAL_ROWS_WITH_PADDING = exports.BOTTOM_PADDING = exports.TOP_PADDING = exports.VISIBLE_ROWS = exports.REELS = exports.GAME_NAME = exports.GAME_ID = void 0;
exports.GAME_ID = 'candy-carnage-1000';
exports.GAME_NAME = 'Candy Carnage 1000';
exports.REELS = 6;
exports.VISIBLE_ROWS = 5;
exports.TOP_PADDING = 1;
exports.BOTTOM_PADDING = 1;
exports.TOTAL_ROWS_WITH_PADDING = exports.VISIBLE_ROWS + exports.TOP_PADDING + exports.BOTTOM_PADDING;
exports.CLUSTER_MIN_SIZE = 8;
exports.INITIAL_FREE_SPINS = 10;
exports.RETRIGGER_SPINS = 5;
exports.MAX_WIN_MULTIPLIER = 25000;
exports.PAY_SYMBOL_IDS = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'L5'];
exports.REGULAR_BOMB_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 500, 1000];
exports.SUPER_BOMB_VALUES = [20, 25, 50, 100, 500, 1000];
exports.WIN_LEVELS = [
    { id: 0, name: 'zero', min: 0, max: 2, animation: 'none' },
    { id: 1, name: 'standard', min: 2, max: 5, animation: 'none' },
    { id: 2, name: 'small', min: 5, max: 10, animation: 'none' },
    { id: 3, name: 'nice', min: 10, max: 15, animation: 'none' },
    { id: 4, name: 'substantial', min: 15, max: 20, animation: 'none' },
    { id: 6, name: 'big', min: 20, max: 50, animation: 'big' },
    { id: 7, name: 'superwin', min: 50, max: 100, animation: 'superwin' },
    { id: 8, name: 'mega', min: 100, max: 250, animation: 'mega' },
    { id: 9, name: 'epic', min: 250, max: 1000, animation: 'epic' },
    { id: 10, name: 'max', min: 1000, max: null, animation: 'max' },
];
exports.SCATTER_PAYOUTS = new Map([
    [4, 0],
    [5, 5],
    [6, 100],
]);
//# sourceMappingURL=constants.js.map