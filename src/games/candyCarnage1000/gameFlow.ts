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
}

interface ScatterInfo {
  scatterCount: number;
  superScatterCount: number;
  scatterPositions: BoardCell[];
  superScatterPositions: BoardCell[];
}

interface ClusterEvaluationResult {
  clusters: ClusterWin[];
  bombCells: BoardCell[];
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
      recordRetrigger(ctx);
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

  const activeBonusType = opts.bonusType ?? ctx.state.userData.activeBonus ?? 'regular';
  if (opts.spinType === SPIN_TYPE.FREE_SPINS) {
    assignBombMultipliers(ctx, activeBonusType);
  }

  recordReveal(ctx, opts.spinType);

  const scatterInfo = getScatterInfo(ctx);
  let totalTumbleWin = 0;

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
    const { clusters, bombCells } = evaluateClusters(ctx, opts.spinType);
    if (clusters.length === 0) {
      break;
    }

    const tumbleWin = clusters.reduce((sum, cluster) => sum + cluster.payout, 0);

    recordClusterWin(ctx, clusters);

    ctx.services.wallet.addTumbleWin(tumbleWin);
    totalTumbleWin += tumbleWin;
    recordTumbleWin(ctx, totalTumbleWin);

    if (opts.spinType === SPIN_TYPE.FREE_SPINS && bombCells.length > 0) {
      const boardMultiplier = bombCells.reduce(
        (sum, cell) => sum + (cell.symbol.properties.get('multiplier') ?? 0),
        0,
      );
      if (boardMultiplier > 0) {
        const multiplier = Math.max(boardMultiplier, 1);
        const bonusWin = tumbleWin * (multiplier - 1);
        ctx.state.userData.bonusMultiplierStack.push(multiplier);
        recordBombMultiplier(ctx, bombCells, tumbleWin, multiplier, tumbleWin * multiplier);
        if (bonusWin > 0) {
          ctx.services.wallet.addTumbleWin(bonusWin);
          totalTumbleWin += bonusWin;
          recordTumbleWin(ctx, totalTumbleWin);
        }
      }
    }

    const clearedPositions = clusters.flatMap((cluster) => cluster.positions);
    const positionsToClear =
      opts.spinType === SPIN_TYPE.FREE_SPINS ? clearedPositions.concat(bombCells) : clearedPositions;
    const tumbleResult = ctx.services.board.tumbleBoard(
      positionsToClear.map((pos) => ({ reelIdx: pos.reel, rowIdx: pos.row })),
    );
    if (opts.spinType === SPIN_TYPE.FREE_SPINS) {
      applyMultipliersToNewSymbols(tumbleResult.newBoardSymbols, ctx, activeBonusType);
      assignBombMultipliers(ctx, activeBonusType);
    }
    recordTumbleBoard(ctx, positionsToClear, tumbleResult);
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

function evaluateClusters(ctx: CandyContext, spinType: SpinType): ClusterEvaluationResult {
  const board = ctx.services.board.getBoardReels();
  const buckets = new Map<string, BoardCell[]>();
  const bombCells: BoardCell[] = [];

  for (let reel = 0; reel < REELS; reel++) {
    for (let row = 0; row < VISIBLE_ROWS; row++) {
      const symbol = board[reel]?.[row];
      if (!symbol) continue;

      if (symbol.id === 'M' && spinType === SPIN_TYPE.FREE_SPINS) {
        bombCells.push({ reel, row, symbol });
      }

      if (!PAY_SYMBOL_SET.has(symbol.id)) continue;

      if (!buckets.has(symbol.id)) {
        buckets.set(symbol.id, []);
      }
      buckets.get(symbol.id)!.push({ reel, row, symbol });
    }
  }

  const clusters: ClusterWin[] = [];
  buckets.forEach((cells, symbolId) => {
    const matched = cells.length;
    if (matched < CLUSTER_MIN_SIZE) {
      return;
    }
    const baseSymbol = ctx.config.symbols.get(symbolId as any);
    const pays = baseSymbol?.pays ?? {};
    const payout = pays[matched] ?? 0;
    if (payout <= 0) {
      return;
    }
    clusters.push({
      symbolId,
      payout,
      matched,
      positions: cells,
    });
  });

  return { clusters, bombCells };
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
  bombCells: BoardCell[],
  tumbleWin: number,
  boardMultiplier: number,
  totalWin: number,
) {
  pushEvent(ctx, {
    type: 'boardMultiplierInfo',
    multInfo: {
      positions: bombCells.map((cell) => ({
        reel: cell.reel,
        row: cell.row + 1,
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
    total: ctx.state.currentFreespinAmount,
  });
}

function recordRetrigger(ctx: CandyContext) {
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

  return board.map((reel, index) => {
    const column: RawSymbolPayload[] = [];
    const topSymbol = paddingTop[index]?.[0] ?? null;
    column.push(toRawSymbol(topSymbol));
    column.push(...reel.map(toRawSymbol));
    const bottomSymbol = paddingBottom[index]?.[0] ?? null;
    column.push(toRawSymbol(bottomSymbol));
    return column;
  });
}

function serializePositions(positions: BoardCell[] = ZERO_POSITIONS) {
  return positions.map((pos) => ({
    reel: pos.reel,
    row: pos.row + 1,
  }));
}

function toRawSymbol(symbol?: GameSymbol | null): RawSymbolPayload {
  if (!symbol) return { name: '' };
  const raw: RawSymbolPayload = { name: symbol.id };
  if (symbol.id === 'M') {
    raw.bomb = true;
    const multiplier = symbol.properties.get('multiplier') ?? 0;
    raw.multiplier = multiplier > 0 ? multiplier : 2;
  }
  if (symbol.id === 'S' || symbol.id === 'BS') {
    raw.scatter = true;
  }
  return raw;
}

function buildClusterMeta(cluster: ClusterWin) {
  const overlayAnchor = getClusterOverlayAnchor(cluster.positions);
  const overlay = serializeOverlay(overlayAnchor);
  return {
    clusterMult: 1,
    winWithoutMult: cluster.payout,
    overlay,
  };
}

function getClusterOverlayAnchor(positions: BoardCell[]): BoardCell | undefined {
  if (!positions.length) {
    return undefined;
  }
  const avgReel = positions.reduce((sum, cell) => sum + cell.reel, 0) / positions.length;
  const avgRow = positions.reduce((sum, cell) => sum + cell.row, 0) / positions.length;
  let best = positions[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const cell of positions) {
    const score = Math.abs(cell.reel - avgReel) + Math.abs(cell.row - avgRow);
    if (score < bestScore) {
      bestScore = score;
      best = cell;
    }
  }
  return best;
}

function serializeOverlay(cell?: BoardCell) {
  if (!cell) return { reel: 0, row: 1 };
  return { reel: cell.reel, row: cell.row + 1 };
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

