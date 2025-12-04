"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userState = exports.symbols = exports.gameModes = exports.candyCarnage1000Game = void 0;
const core_1 = require("@slot-engine/core");
const constants_1 = require("./constants");
const gameFlow_1 = require("./gameFlow");
const reels_1 = require("./reels");
const SYMBOLS_PER_REEL = Array.from({ length: constants_1.REELS }, () => constants_1.VISIBLE_ROWS);
const createClusterPays = (tiers) => {
    const pays = {};
    for (let count = constants_1.CLUSTER_MIN_SIZE; count <= constants_1.REELS * constants_1.VISIBLE_ROWS; count += 1) {
        if (count >= 12) {
            pays[count] = tiers.high;
        }
        else if (count >= 10) {
            pays[count] = tiers.mid;
        }
        else {
            pays[count] = tiers.low;
        }
    }
    return pays;
};
const symbols = (0, core_1.defineSymbols)({
    H1: new core_1.GameSymbol({
        id: 'H1',
        pays: createClusterPays({ low: 10, mid: 25, high: 50 }),
        properties: { group: 'high', displayName: 'Premium 1' },
    }),
    H2: new core_1.GameSymbol({
        id: 'H2',
        pays: createClusterPays({ low: 2.5, mid: 10, high: 25 }),
        properties: { group: 'high', displayName: 'Premium 2' },
    }),
    H3: new core_1.GameSymbol({
        id: 'H3',
        pays: createClusterPays({ low: 2, mid: 5, high: 15 }),
        properties: { group: 'high', displayName: 'Premium 3' },
    }),
    H4: new core_1.GameSymbol({
        id: 'H4',
        pays: createClusterPays({ low: 1.5, mid: 2, high: 12 }),
        properties: { group: 'high', displayName: 'Premium 4' },
    }),
    L1: new core_1.GameSymbol({
        id: 'L1',
        pays: createClusterPays({ low: 1, mid: 1.5, high: 10 }),
        properties: { group: 'low', displayName: 'Low 1' },
    }),
    L2: new core_1.GameSymbol({
        id: 'L2',
        pays: createClusterPays({ low: 0.8, mid: 1.2, high: 8 }),
        properties: { group: 'low', displayName: 'Low 2' },
    }),
    L3: new core_1.GameSymbol({
        id: 'L3',
        pays: createClusterPays({ low: 0.5, mid: 1, high: 5 }),
        properties: { group: 'low', displayName: 'Low 3' },
    }),
    L4: new core_1.GameSymbol({
        id: 'L4',
        pays: createClusterPays({ low: 0.4, mid: 0.9, high: 4 }),
        properties: { group: 'low', displayName: 'Low 4' },
    }),
    L5: new core_1.GameSymbol({
        id: 'L5',
        pays: createClusterPays({ low: 0.25, mid: 0.75, high: 2 }),
        properties: { group: 'low', displayName: 'Low 5' },
    }),
    S: new core_1.GameSymbol({
        id: 'S',
        pays: { 5: 5, 6: 100 },
        properties: { isScatter: true, scatterType: 'regular' },
    }),
    BS: new core_1.GameSymbol({
        id: 'BS',
        properties: { isScatter: true, scatterType: 'super' },
    }),
    M: new core_1.GameSymbol({
        id: 'M',
        properties: { isBomb: true, appliesIn: 'bonus' },
    }),
});
exports.symbols = symbols;
const userState = (0, core_1.defineUserState)({
    activeBonus: null,
    freespinsRemaining: 0,
    totalBonusSpinsAwarded: 0,
    bonusMultiplierStack: [],
});
exports.userState = userState;
const createReelSet = (id, reels) => new core_1.StaticReelSet({
    id,
    reels,
});
const createResultSet = (criteria, baseReelId, bonusReelId, overrides = {}) => new core_1.ResultSet({
    criteria,
    quota: 1,
    reelWeights: {
        [core_1.SPIN_TYPE.BASE_GAME]: { [baseReelId]: 1 },
        [core_1.SPIN_TYPE.FREE_SPINS]: { [bonusReelId]: 1 },
    },
    ...overrides,
});
const createGameMode = (opts) => {
    const baseReelId = `${opts.name}_base_default`;
    const bonusReelId = `${opts.name}_bonus_default`;
    const baseReelSet = createReelSet(baseReelId, (0, reels_1.getReelsForMode)(opts.name, 'base'));
    const bonusReelSet = createReelSet(bonusReelId, (0, reels_1.getReelsForMode)(opts.name, 'bonus'));
    const resultSet = createResultSet(`${opts.name}_default`, baseReelId, bonusReelId, opts.resultSetOverrides);
    return new core_1.GameMode({
        name: opts.name,
        reelsAmount: constants_1.REELS,
        symbolsPerReel: SYMBOLS_PER_REEL,
        cost: opts.cost,
        rtp: 0.962,
        reelSets: [baseReelSet, bonusReelSet],
        resultSets: [resultSet],
        isBonusBuy: Boolean(opts.isBonusBuy),
    });
};
const gameModes = (0, core_1.defineGameModes)({
    base: createGameMode({ name: 'base', cost: 1 }),
    bonus_hunt: createGameMode({ name: 'bonus_hunt', cost: 3 }),
    regular_buy: createGameMode({
        name: 'regular_buy',
        cost: 100,
        isBonusBuy: true,
        resultSetOverrides: {
            forceFreespins: true,
            userData: { forcedBonusType: 'regular' },
        },
    }),
    super_buy: createGameMode({
        name: 'super_buy',
        cost: 500,
        isBonusBuy: true,
        resultSetOverrides: {
            forceFreespins: true,
            userData: { forcedBonusType: 'super' },
        },
    }),
});
exports.gameModes = gameModes;
const scatterToFreespins = {
    [core_1.SPIN_TYPE.BASE_GAME]: {
        4: constants_1.INITIAL_FREE_SPINS,
        5: constants_1.INITIAL_FREE_SPINS,
        6: constants_1.INITIAL_FREE_SPINS,
    },
    [core_1.SPIN_TYPE.FREE_SPINS]: {
        3: constants_1.RETRIGGER_SPINS,
        4: constants_1.RETRIGGER_SPINS,
        5: constants_1.RETRIGGER_SPINS,
        6: constants_1.RETRIGGER_SPINS,
    },
};
exports.candyCarnage1000Game = (0, core_1.createSlotGame)({
    id: constants_1.GAME_ID,
    name: constants_1.GAME_NAME,
    gameModes,
    symbols,
    scatterToFreespins,
    padSymbols: 1,
    maxWinX: constants_1.MAX_WIN_MULTIPLIER,
    userState,
    hooks: {
        onHandleGameFlow: gameFlow_1.onHandleGameFlow,
    },
});
//# sourceMappingURL=config.js.map