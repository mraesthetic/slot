import {
  SPIN_TYPE,
  type GameContext,
  type GameHooks,
  type GameSymbol,
  type SpinType,
} from '@slot-engine/core';

import {
  CLUSTER_MIN_SIZE,
  GAME_NAME,
  INITIAL_FREE_SPINS,
  MAX_WIN_MULTIPLIER,
  PAY_SYMBOL_IDS,
  REGULAR_BOMB_VALUES,
  REELS,
  RETRIGGER_SPINS,
  SUPER_BOMB_VALUES,
  VISIBLE_ROWS,
  WIN_LEVELS,
  type BonusType,
} from './constants';

type CandyContext = GameContext<any, any, any>;

interface BoardCell {
  reel: number;
  row: number;
  symbol: GameSymbol;
}

interface RawSymbolPayload {
  name: string;
  scatter?: boolean;
  bomb?: boolean;
  multiplier?: number;
}

interface ClusterWin {
  symbolId: string;
  payout: number;
  matched: number;
  positions: BoardCell[];
  bombPositions: BoardCell[];
}

interface ScatterInfo {
  scatterCount: number;
  superScatterCount: number;
  scatterPositions: BoardCell[];
  superScatterPositions: BoardCell[];
}

interface SpinOutcome {
  totalWin: number;
  scatterInfo: ScatterInfo;
  triggeredBonus?: BonusType;
  retriggerSpins?: number;
}

const PAY_SYMBOL_SET = new Set<string>(PAY_SYMBOL_IDS);
const BASE_REEL_INDICES = [...Array(REELS).keys()];
const ZERO_POSITIONS: BoardCell[] = [];
const EMPTY_PADDING = Array(REELS).fill(0);

function pushEvent(ctx: CandyContext, event: Record<string, unknown>) {
  ctx.services.data.addBookEvent(event as any);
}

export const onHandleGameFlow: GameHooks['onHandleGameFlow'] = (ctx) => {
  resetUserData(ctx);

  if (ctx.state.currentGameMode === 'regular_buy') {
    handleBonusBuy(ctx, 'regular');
    finalizeSimulation(ctx);
    return;
  }

  if (ctx.state.currentGameMode === 'super_buy') {
    handleBonusBuy(ctx, 'super');
    finalizeSimulation(ctx);
    return;
  }

  playBaseSpin(ctx);

  if (ctx.state.userData.activeBonus) {
    playFreeSpins(ctx);
  }

  finalizeSimulation(ctx);
};

function resetUserData(ctx: CandyContext) {
  ctx.state.userData.activeBonus = null;
  ctx.state.userData.freespinsRemaining = 0;
  ctx.state.userData.totalBonusSpinsAwarded = 0;
  ctx.state.userData.bonusMultiplierStack = [];
}

function playBaseSpin(ctx: CandyContext) {
  ctx.state.currentSpinType = SPIN_TYPE.BASE_GAME;
  const forcedBonusType = ctx.state.currentResultSet.forceFreespins
    ? ((ctx.state.currentResultSet.userData?.forcedBonusType as BonusType) || 'regular')
    : undefined;

  const outcome = playSpin(ctx, {
    spinType: SPIN_TYPE.BASE_GAME,
    allowScatterPayout: true,
    allowBonusTrigger: true,
    clampScatter: forcedBonusType,
  });

  if (outcome.triggeredBonus) {
    startFreeSpins(ctx, outcome.triggeredBonus, outcome.scatterInfo);
  } else if (ctx.state.currentResultSet.forceFreespins) {
    const forcedType = (ctx.state.currentResultSet.userData?.forcedBonusType as BonusType) || 'regular';
    startFreeSpins(ctx, forcedType, outcome.scatterInfo, { forced: true });
  }
}

function playFreeSpins(ctx: CandyContext) {
  const bonusType = ctx.state.userData.activeBonus as BonusType;
  ctx.state.currentSpinType = SPIN_TYPE.FREE_SPINS;
  let freeSpinIndex = 0;
  const totalBonusStart = ctx.services.wallet.getCurrentWin();

  while (ctx.state.currentFreespinAmount > 0) {
    freeSpinIndex += 1;
    recordUpdateFreeSpin(ctx, freeSpinIndex);

    const outcome = playSpin(ctx, {
      spinType: SPIN_TYPE.FREE_SPINS,
      allowScatterPayout: false,
      allowBonusTrigger: false,
      bonusType,
    });

    ctx.state.currentFreespinAmount -= 1;
    ctx.state.userData.freespinsRemaining = ctx.state.currentFreespinAmount;

    if (outcome.retriggerSpins) {
      ctx.services.game.awardFreespins(outcome.retriggerSpins);
      ctx.state.userData.totalBonusSpinsAwarded += outcome.retriggerSpins;
      recordRetrigger(ctx, outcome.retriggerSpins);
    }

    if (ctx.services.wallet.getCurrentWin() >= MAX_WIN_MULTIPLIER) {
      ctx.state.triggeredMaxWin = true;
      ctx.state.currentFreespinAmount = 0;
      ctx.state.userData.freespinsRemaining = 0;
      break;
    }
  }

  const bonusWin = ctx.services.wallet.getCurrentWin() - totalBonusStart;
  recordFreeSpinEnd(ctx, bonusWin);
  ctx.state.userData.activeBonus = null;
  ctx.state.currentSpinType = SPIN_TYPE.BASE_GAME;
}

function handleBonusBuy(ctx: CandyContext, bonusType: BonusType) {
  ctx.state.currentSpinType = SPIN_TYPE.BASE_GAME;
  playSpin(ctx, {
    spinType: SPIN_TYPE.BASE_GAME,
    allowScatterPayout: false,
    allowBonusTrigger: false,
    clampScatter: bonusType,
  });
  startFreeSpins(ctx, bonusType, getScatterInfo(ctx), { forced: true, skipPayout: true });
  playFreeSpins(ctx);
}

function playSpin(
  ctx: CandyContext,
  opts: {
    spinType: SpinType;
    allowScatterPayout: boolean;
    allowBonusTrigger: boolean;
    clampScatter?: BonusType | undefined;
    bonusType?: BonusType | undefined;
  },
): SpinOutcome {
  const reels = ctx.services.board.getRandomReelset();
  ctx.services.board.drawBoardWithRandomStops(reels);

  if (opts.clampScatter) {
    forceScatterLayout(ctx, opts.clampScatter);
  }

  if (opts.spinType === SPIN_TYPE.FREE_SPINS) {
    assignBombMultipliers(ctx, opts.bonusType ?? ctx.state.userData.activeBonus ?? 'regular');
  }

  recordReveal(ctx, opts.spinType);

  const scatterInfo = getScatterInfo(ctx);
  let totalTumbleWin = 0;
  let tumbleIndex = 0;

  // Scatter payout before tumbles if configured
  if (opts.allowScatterPayout) {
    const scatterPayout = getScatterPayout(scatterInfo.scatterCount);
    if (scatterPayout > 0) {
      ctx.services.wallet.addSpinWin(scatterPayout);
      recordScatterWinInfo(ctx, scatterInfo, scatterPayout);
      totalTumbleWin += scatterPayout;
    }
  }

  while (true) {
    const clusters = evaluateClusters(ctx, opts.spinType);
    if (clusters.length === 0) {
      break;
    }

    tumbleIndex += 1;
    const tumbleWin = clusters.reduce((sum, cluster) => sum + cluster.payout, 0);

    recordClusterWin(ctx, clusters);

    let bombSum = 0;
    if (opts.spinType === SPIN_TYPE.FREE_SPINS) {
      bombSum = clusters
        .flatMap((cluster) => cluster.bombPositions)
        .reduce((sum, cell) => {
          const multiplier = cell.symbol.properties.get('multiplier') ?? 0;
          return sum + multiplier;
        }, 0);
    }

    ctx.services.wallet.addTumbleWin(tumbleWin);
    totalTumbleWin += tumbleWin;
    recordTumbleWin(ctx, totalTumbleWin);

    const clearedPositions = clusters.flatMap((cluster) => cluster.positions);
    const tumbleResult = ctx.services.board.tumbleBoard(
      clearedPositions.map((pos) => ({ reelIdx: pos.reel, rowIdx: pos.row })),
    );
    if (opts.spinType === SPIN_TYPE.FREE_SPINS) {
      applyMultipliersToNewSymbols(tumbleResult.newBoardSymbols, ctx, opts.bonusType ?? ctx.state.userData.activeBonus ?? 'regular');
      assignBombMultipliers(ctx, opts.bonusType ?? ctx.state.userData.activeBonus ?? 'regular');
    }
    recordTumbleBoard(ctx, clearedPositions, tumbleResult);

    if (opts.spinType === SPIN_TYPE.FREE_SPINS && bombSum > 0) {
      const multiplier = Math.max(bombSum, 1);
      const bonusWin = tumbleWin * (multiplier - 1);
      if (bonusWin > 0) {
        ctx.state.userData.bonusMultiplierStack.push(multiplier);
        recordBombMultiplier(ctx, clusters, tumbleWin, multiplier, tumbleWin * multiplier);
        ctx.services.wallet.addTumbleWin(bonusWin);
        totalTumbleWin += bonusWin;
        recordTumbleWin(ctx, totalTumbleWin);
      }
    }

  }

  ctx.services.wallet.confirmSpinWin();
  recordSetTotalWin(ctx, totalTumbleWin);

  if (ctx.services.wallet.getCurrentWin() >= MAX_WIN_MULTIPLIER) {
    ctx.state.triggeredMaxWin = true;
  }

  const result: SpinOutcome = {
    totalWin: totalTumbleWin,
    scatterInfo,
  };

  if (opts.allowBonusTrigger) {
    const triggeredBonus = determineBonusTrigger(scatterInfo);
    if (triggeredBonus) {
      result.triggeredBonus = triggeredBonus;
    }
  }

  if (opts.spinType === SPIN_TYPE.FREE_SPINS && scatterInfo.scatterCount >= 3) {
    result.retriggerSpins = RETRIGGER_SPINS;
  }

  return result;
}

function evaluateClusters(ctx: CandyContext, spinType: SpinType): ClusterWin[] {
  const board = ctx.services.board.getBoardReels();
  const visited = Array.from({ length: REELS }, () => Array(VISIBLE_ROWS).fill(false));
  const clusters: ClusterWin[] = [];

  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < VISIBLE_ROWS; row++) {
      if (visited[reel]?.[row]) continue;
      const symbol = board[reel]?.[row];
      if (!symbol) continue;
      if (!PAY_SYMBOL_SET.has(symbol.id)) continue;

      const cluster = floodFillCluster(ctx, board, { reel, row, symbol }, visited, spinType);
      if (cluster && cluster.matched >= CLUSTER_MIN_SIZE && cluster.payout > 0) {
        clusters.push(cluster);
      }
    }
  }

  return clusters;
}

function floodFillCluster(
  ctx: CandyContext,
  board: GameSymbol[][],
  start: BoardCell,
  visited: boolean[][],
  spinType: SpinType,
): ClusterWin | null {
  const queue: BoardCell[] = [start];
  const positions: BoardCell[] = [];
  const bombPositions: BoardCell[] = [];
  const baseSymbolId = start.symbol.id;

  let matchedCount = 0;

  while (queue.length) {
    const cell = queue.shift()!;
    const { reel, row, symbol } = cell;
    if (visited[reel]?.[row]) continue;
    visited[reel]![row] = true;
    positions.push(cell);

    if (symbol.id === baseSymbolId) {
      matchedCount += 1;
    } else if (symbol.id === 'M' && spinType === SPIN_TYPE.FREE_SPINS) {
      bombPositions.push(cell);
    }

    for (const neighbor of getNeighbors(board, reel, row)) {
      if (visited[neighbor.reel]?.[neighbor.row]) continue;
      if (shouldJoinCluster(neighbor.symbol, baseSymbolId, spinType)) {
        queue.push(neighbor);
      }
    }
  }

  if (matchedCount < CLUSTER_MIN_SIZE) {
    return null;
  }

  const baseSymbol = ctx.config.symbols.get(baseSymbolId as any);
  const pays = baseSymbol?.pays ?? {};
  const payout = pays[matchedCount] ?? 0;

  return {
    symbolId: baseSymbolId,
    payout,
    matched: matchedCount,
    positions,
    bombPositions,
  };
}

function shouldJoinCluster(symbol: GameSymbol, baseSymbolId: string, spinType: SpinType): boolean {
  if (!symbol) return false;
  if (symbol.id === baseSymbolId) return true;
  if (symbol.id === 'M' && spinType === SPIN_TYPE.FREE_SPINS) return true;
  return false;
}

function getNeighbors(board: GameSymbol[][], reel: number, row: number): BoardCell[] {
  const neighbors: BoardCell[] = [];
  const deltas: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (const [dx, dy] of deltas) {
    const nr = reel + dx;
    const nc = row + dy;
    if (nr >= 0 && nr < REELS && nc >= 0 && nc < VISIBLE_ROWS) {
      const symbol = board[nr]?.[nc];
      if (symbol) {
        neighbors.push({ reel: nr, row: nc, symbol });
      }
    }
  }

  return neighbors;
}

function assignBombMultipliers(ctx: CandyContext, bonusType: BonusType) {
  const board = ctx.services.board.getBoardReels();
  const availableValues = bonusType === 'super' ? SUPER_BOMB_VALUES : REGULAR_BOMB_VALUES;

  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < VISIBLE_ROWS; row++) {
      const symbol = board[reel]?.[row];
      if (symbol?.id === 'M' && !symbol.properties.has('multiplier')) {
        const clone = symbol.clone();
        const multiplier = ctx.services.rng.randomItem(availableValues);
        clone.properties.set('multiplier', multiplier);
        ctx.services.board.setSymbol(reel, row, clone);
      }
    }
  }
}

function applyMultipliersToNewSymbols(
  newSymbols: Record<string, GameSymbol[]>,
  ctx: CandyContext,
  bonusType: BonusType,
) {
  const rng = ctx.services.rng;
  const availableValues = bonusType === 'super' ? SUPER_BOMB_VALUES : REGULAR_BOMB_VALUES;
  Object.values(newSymbols ?? {}).forEach((symbols) => {
    symbols?.forEach((symbol) => {
      if (symbol?.id === 'M' && !symbol.properties.has('multiplier')) {
        const multiplier = rng.randomItem(availableValues);
        symbol.properties.set('multiplier', multiplier);
      }
    });
  });
}

function determineBonusTrigger(info: ScatterInfo): BonusType | undefined {
  if (info.superScatterCount >= 1 && info.scatterCount >= 3) {
    return 'super';
  }
  if (info.scatterCount + info.superScatterCount >= 4) {
    return 'regular';
  }
  return undefined;
}

function getScatterInfo(ctx: CandyContext): ScatterInfo {
  const board = ctx.services.board.getBoardReels();
  const scatterPositions: BoardCell[] = [];
  const superScatterPositions: BoardCell[] = [];

  for (let reel = 0; reel < REELS; reel++) {
    let scatterPlaced = false;
    for (let row = 0; row < VISIBLE_ROWS; row++) {
      const symbol = board[reel]?.[row];
      if (!symbol) continue;
      if (symbol.id === 'S') {
        if (!scatterPlaced) {
          scatterPositions.push({ reel, row, symbol });
          scatterPlaced = true;
        }
      } else if (symbol.id === 'BS') {
        if (!scatterPlaced) {
          superScatterPositions.push({ reel, row, symbol });
          scatterPlaced = true;
        }
      }
    }
  }

  return {
    scatterCount: scatterPositions.length,
    superScatterCount: superScatterPositions.length,
    scatterPositions,
    superScatterPositions,
  };
}

function startFreeSpins(
  ctx: CandyContext,
  type: BonusType,
  scatterInfo: ScatterInfo,
  options?: { forced?: boolean; skipPayout?: boolean },
) {
  ctx.state.userData.activeBonus = type;
  ctx.state.userData.freespinsRemaining = INITIAL_FREE_SPINS;
  ctx.state.userData.totalBonusSpinsAwarded = INITIAL_FREE_SPINS;
  ctx.services.game.awardFreespins(INITIAL_FREE_SPINS);
  ctx.state.triggeredFreespins = true;

  recordFreeSpinTrigger(ctx, scatterInfo, type);
}

function recordReveal(ctx: CandyContext, spinType: SpinType) {
  pushEvent(ctx, {
    type: 'reveal',
    gameType: spinType === SPIN_TYPE.BASE_GAME ? 'basegame' : 'freegame',
    board: serializeFullBoard(ctx),
    paddingPositions: [...EMPTY_PADDING],
    anticipation: [...EMPTY_PADDING],
  });
}

function recordClusterWin(ctx: CandyContext, clusters: ClusterWin[]) {
  const total = clusters.reduce((sum, cluster) => sum + cluster.payout, 0);
  pushEvent(ctx, {
    type: 'winInfo',
    totalWin: total,
    wins: clusters.map((cluster) => ({
      symbol: cluster.symbolId,
      win: cluster.payout,
      positions: serializePositions(cluster.positions),
      meta: buildClusterMeta(cluster),
    })),
  });
}

function recordTumbleWin(ctx: CandyContext, total: number) {
  pushEvent(ctx, {
    type: 'updateTumbleWin',
    amount: total,
  });
}

function recordBombMultiplier(
  ctx: CandyContext,
  clusters: ClusterWin[],
  tumbleWin: number,
  boardMultiplier: number,
  totalWin: number,
) {
  pushEvent(ctx, {
    type: 'boardMultiplierInfo',
    multInfo: {
      positions: clusters
        .flatMap((cluster) => cluster.bombPositions)
        .map((cell) => ({
          reel: cell.reel,
          row: cell.row,
          name: cell.symbol.id,
          multiplier: cell.symbol.properties.get('multiplier') ?? 0,
        })),
    },
    winInfo: {
      tumbleWin,
      boardMult: boardMultiplier,
      totalWin,
    },
  });
}

function recordTumbleBoard(
  ctx: CandyContext,
  cleared: BoardCell[],
  tumbleResult: { newBoardSymbols: Record<string, GameSymbol[]> },
) {
  const newSymbols: RawSymbolPayload[][] = Array.from({ length: REELS }, () => []);
  Object.entries(tumbleResult.newBoardSymbols ?? {}).forEach(([reel, symbols]) => {
    const index = Number(reel);
    if (!Number.isNaN(index)) {
      newSymbols[index] = symbols.map(toRawSymbol);
    }
  });

  pushEvent(ctx, {
    type: 'tumbleBoard',
    explodingSymbols: serializePositions(cleared),
    newSymbols,
  });
}

function recordScatterWinInfo(ctx: CandyContext, scatterInfo: ScatterInfo, payout: number) {
  const positions = [...scatterInfo.scatterPositions, ...scatterInfo.superScatterPositions];
  pushEvent(ctx, {
    type: 'winInfo',
    totalWin: payout,
    wins: [
      {
        symbol: scatterInfo.superScatterCount > 0 ? 'BS' : 'S',
        win: payout,
        positions: serializePositions(positions),
        meta: {
          clusterMult: 1,
          winWithoutMult: payout,
          overlay: serializeOverlay(positions[0]),
        },
      },
    ],
  });
}

function recordSetTotalWin(ctx: CandyContext, amount: number) {
  if (amount <= 0) return;
  pushEvent(ctx, {
    type: 'setTotalWin',
    amount,
  });
  const level = getWinLevel(amount);
  if (level >= 6) {
    recordSetWin(ctx, amount, level);
  }
}

function recordSetWin(ctx: CandyContext, amount: number, level: number) {
  pushEvent(ctx, {
    type: 'setWin',
    amount,
    winLevel: level,
  });
}

function recordUpdateFreeSpin(ctx: CandyContext, spinIndex: number) {
  pushEvent(ctx, {
    type: 'updateFreeSpin',
    amount: spinIndex,
    total: ctx.state.userData.totalBonusSpinsAwarded,
  });
}

function recordRetrigger(ctx: CandyContext, added: number) {
  pushEvent(ctx, {
    type: 'freeSpinRetrigger',
    totalFs: ctx.state.currentFreespinAmount,
  });
}

function recordFreeSpinTrigger(ctx: CandyContext, scatterInfo: ScatterInfo, type: BonusType) {
  pushEvent(ctx, {
    type: 'freeSpinTrigger',
    totalFs: ctx.state.userData.totalBonusSpinsAwarded,
    positions: serializePositions([...scatterInfo.scatterPositions, ...scatterInfo.superScatterPositions]),
  });

  pushEvent(ctx, {
    type: 'enterBonus',
    reason: type,
  });
}

function recordFreeSpinEnd(ctx: CandyContext, amount: number) {
  pushEvent(ctx, {
    type: 'freeSpinEnd',
    amount,
    winLevel: getWinLevel(amount),
  });
}

function finalizeSimulation(ctx: CandyContext) {
  const totalWin = ctx.services.wallet.getCurrentWin();
  pushEvent(ctx, {
    type: 'finalWin',
    amount: totalWin,
    winLevel: getWinLevel(totalWin),
  });
}

function getScatterPayout(count: number): number {
  if (count >= 6) return 100;
  if (count === 5) return 5;
  return 0;
}

function getWinLevel(amount: number) {
  for (const level of WIN_LEVELS) {
    if (level.max === null && amount >= level.min) {
      return level.id;
    }
    if (level.max !== null && amount >= level.min && amount < level.max) {
      return level.id;
    }
  }
  return 0;
}

function serializeFullBoard(ctx: CandyContext) {
  const board = ctx.services.board.getBoardReels();
  const paddingTop = ctx.services.board.getPaddingTop();
  const paddingBottom = ctx.services.board.getPaddingBottom();
  const padCount = ctx.config.padSymbols ?? 0;

  return board.map((reel, index) => {
    const column: RawSymbolPayload[] = [];
    const topColumn = paddingTop[index] ?? [];
    const bottomColumn = paddingBottom[index] ?? [];

    for (let i = 0; i < padCount; i += 1) {
      column.push(toRawSymbol(topColumn[i]));
    }

    column.push(...reel.map(toRawSymbol));

    for (let i = 0; i < padCount; i += 1) {
      column.push(toRawSymbol(bottomColumn[i]));
    }

    return column;
  });
}

function serializePositions(positions: BoardCell[] = ZERO_POSITIONS) {
  return positions.map((pos) => ({
    reel: pos.reel,
    row: pos.row,
  }));
}

function toRawSymbol(symbol?: GameSymbol | null): RawSymbolPayload {
  if (!symbol) return { name: '' };
  const raw: RawSymbolPayload = { name: symbol.id };
  if (symbol.id === 'M') {
    raw.bomb = true;
    raw.multiplier = symbol.properties.get('multiplier') ?? 0;
  }
  if (symbol.id === 'S' || symbol.id === 'BS') {
    raw.scatter = true;
  }
  return raw;
}

function buildClusterMeta(cluster: ClusterWin) {
  const overlay = serializeOverlay(cluster.positions[0]);
  return {
    clusterMult: 1,
    winWithoutMult: cluster.payout,
    overlay,
  };
}

function serializeOverlay(cell?: BoardCell) {
  if (!cell) return { reel: 0, row: 0 };
  return { reel: cell.reel, row: cell.row };
}

function forceScatterLayout(ctx: CandyContext, bonusType: BonusType) {
  const targetScatters = bonusType === 'super' ? 3 : 4;
  const scatterSymbol = ctx.config.symbols.get('S');
  const superSymbol = ctx.config.symbols.get('BS');
  if (!scatterSymbol || !superSymbol) return;
  const fillerSymbol = ctx.config.symbols.get('L3') ?? ctx.config.symbols.get('L1');

  const reels = ctx.services.board.getBoardReels();
  const shuffledReels = ctx.services.rng.shuffle([...BASE_REEL_INDICES]);

  for (let i = 0; i < targetScatters && i < shuffledReels.length; i++) {
    const reelIdx = shuffledReels[i];
    if (reelIdx === undefined) continue;
    ctx.services.board.setSymbol(reelIdx, 0, scatterSymbol.clone());
  }

  if (bonusType === 'super') {
    const remaining = shuffledReels.slice(targetScatters);
    const bsReel = remaining.length ? remaining[0] : shuffledReels[0];
    if (bsReel !== undefined) {
      ctx.services.board.setSymbol(bsReel, 1, superSymbol.clone());
    }
  }

  if (!fillerSymbol) {
    return;
  }

  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < VISIBLE_ROWS; row++) {
      const symbol = reels[reel]?.[row];
      if (!symbol) {
        ctx.services.board.setSymbol(reel, row, fillerSymbol.clone());
      }
    }
  }
}

