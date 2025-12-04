import {
  SPIN_TYPE,
  GameMode,
  GameSymbol,
  ResultSet,
  StaticReelSet,
  createSlotGame,
  defineGameModes,
  defineSymbols,
  defineUserState,
  type GameHooks,
  type InferGameType,
} from '@slot-engine/core';

import {
  CLUSTER_MIN_SIZE,
  GAME_ID,
  GAME_NAME,
  INITIAL_FREE_SPINS,
  MAX_WIN_MULTIPLIER,
  REGULAR_BOMB_VALUES,
  REELS,
  RETRIGGER_SPINS,
  SUPER_BOMB_VALUES,
  VISIBLE_ROWS,
  WIN_LEVELS,
} from './constants';
import { onHandleGameFlow } from './gameFlow';
import { getReelsForMode } from './reels';

const SYMBOLS_PER_REEL = Array.from({ length: REELS }, () => VISIBLE_ROWS);
type CandyCarnageBonusType = 'regular' | 'super';
type ResultSetOverride = Partial<ConstructorParameters<typeof ResultSet>[0]>;

const createClusterPays = (tiers: { low: number; mid: number; high: number }) => {
  const pays: Record<number, number> = {};
  for (let count = CLUSTER_MIN_SIZE; count <= REELS * VISIBLE_ROWS; count += 1) {
    if (count >= 12) {
      pays[count] = tiers.high;
    } else if (count >= 10) {
      pays[count] = tiers.mid;
    } else {
      pays[count] = tiers.low;
    }
  }
  return pays;
};

const symbols = defineSymbols({
  H1: new GameSymbol({
    id: 'H1',
    pays: createClusterPays({ low: 10, mid: 25, high: 50 }),
    properties: { group: 'high', displayName: 'Premium 1' },
  }),
  H2: new GameSymbol({
    id: 'H2',
    pays: createClusterPays({ low: 2.5, mid: 10, high: 25 }),
    properties: { group: 'high', displayName: 'Premium 2' },
  }),
  H3: new GameSymbol({
    id: 'H3',
    pays: createClusterPays({ low: 2, mid: 5, high: 15 }),
    properties: { group: 'high', displayName: 'Premium 3' },
  }),
  H4: new GameSymbol({
    id: 'H4',
    pays: createClusterPays({ low: 1.5, mid: 2, high: 12 }),
    properties: { group: 'high', displayName: 'Premium 4' },
  }),
  L1: new GameSymbol({
    id: 'L1',
    pays: createClusterPays({ low: 1, mid: 1.5, high: 10 }),
    properties: { group: 'low', displayName: 'Low 1' },
  }),
  L2: new GameSymbol({
    id: 'L2',
    pays: createClusterPays({ low: 0.8, mid: 1.2, high: 8 }),
    properties: { group: 'low', displayName: 'Low 2' },
  }),
  L3: new GameSymbol({
    id: 'L3',
    pays: createClusterPays({ low: 0.5, mid: 1, high: 5 }),
    properties: { group: 'low', displayName: 'Low 3' },
  }),
  L4: new GameSymbol({
    id: 'L4',
    pays: createClusterPays({ low: 0.4, mid: 0.9, high: 4 }),
    properties: { group: 'low', displayName: 'Low 4' },
  }),
  L5: new GameSymbol({
    id: 'L5',
    pays: createClusterPays({ low: 0.25, mid: 0.75, high: 2 }),
    properties: { group: 'low', displayName: 'Low 5' },
  }),
  S: new GameSymbol({
    id: 'S',
    pays: { 5: 5, 6: 100 },
    properties: { isScatter: true, scatterType: 'regular' },
  }),
  BS: new GameSymbol({
    id: 'BS',
    properties: { isScatter: true, scatterType: 'super' },
  }),
  M: new GameSymbol({
    id: 'M',
    properties: { isBomb: true, appliesIn: 'bonus' },
  }),
});

const userState = defineUserState({
  activeBonus: null as CandyCarnageBonusType | null,
  freespinsRemaining: 0,
  totalBonusSpinsAwarded: 0,
  bonusMultiplierStack: [] as number[],
});

const createReelSet = (id: string, reels: string[][]) =>
  new StaticReelSet({
    id,
    reels,
  });

const createResultSet = (criteria: string, baseReelId: string, bonusReelId: string, overrides: ResultSetOverride = {}) =>
  new ResultSet({
    criteria,
    quota: 1,
    reelWeights: {
      [SPIN_TYPE.BASE_GAME]: { [baseReelId]: 1 },
      [SPIN_TYPE.FREE_SPINS]: { [bonusReelId]: 1 },
    },
    ...overrides,
  });

const createGameMode = (opts: {
  name: 'base' | 'bonus_hunt' | 'regular_buy' | 'super_buy';
  cost: number;
  isBonusBuy?: boolean;
  resultSetOverrides?: ResultSetOverride;
}) => {
  const baseReelId = `${opts.name}_base_default`;
  const bonusReelId = `${opts.name}_bonus_default`;
  const baseReelSet = createReelSet(baseReelId, getReelsForMode(opts.name, 'base'));
  const bonusReelSet = createReelSet(bonusReelId, getReelsForMode(opts.name, 'bonus'));
  const resultSet = createResultSet(`${opts.name}_default`, baseReelId, bonusReelId, opts.resultSetOverrides);

  return new GameMode({
    name: opts.name,
    reelsAmount: REELS,
    symbolsPerReel: SYMBOLS_PER_REEL,
    cost: opts.cost,
    rtp: 0.962,
    reelSets: [baseReelSet, bonusReelSet],
    resultSets: [resultSet],
    isBonusBuy: Boolean(opts.isBonusBuy),
  });
};

const gameModes = defineGameModes({
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

const scatterToFreespins = {
  [SPIN_TYPE.BASE_GAME]: {
    4: INITIAL_FREE_SPINS,
    5: INITIAL_FREE_SPINS,
    6: INITIAL_FREE_SPINS,
  },
  [SPIN_TYPE.FREE_SPINS]: {
    3: RETRIGGER_SPINS,
    4: RETRIGGER_SPINS,
    5: RETRIGGER_SPINS,
    6: RETRIGGER_SPINS,
  },
};

export type CandyCarnage1000Game = InferGameType<typeof gameModes, typeof symbols, typeof userState>;

export const candyCarnage1000Game = createSlotGame<CandyCarnage1000Game>({
  id: GAME_ID,
  name: GAME_NAME,
  gameModes,
  symbols,
  scatterToFreespins,
  padSymbols: 1,
  maxWinX: MAX_WIN_MULTIPLIER,
  userState,
  hooks: {
    onHandleGameFlow: onHandleGameFlow as unknown as GameHooks<
      typeof gameModes,
      typeof symbols,
      typeof userState
    >['onHandleGameFlow'],
  },
});

export { gameModes, symbols, userState };

