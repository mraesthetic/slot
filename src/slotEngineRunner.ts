import os from 'os';
import { isMainThread, workerData } from 'worker_threads';

import { ResultSet } from '@slot-engine/core';

import { candyCarnage1000Game } from './games/candyCarnage1000/config';

const SIM_RUNS = {
  base: 100,
  bonus_hunt: 100,
  regular_buy: 100,
  super_buy: 100,
};
const DEFAULT_CONCURRENCY = parseInt(process.env.SLOT_ENGINE_CONCURRENCY || '', 10) || os.cpus().length || 4;
const VERBOSE_PROGRESS = process.env.SLOT_ENGINE_PROGRESS || 'detailed';
const ALLOW_ZERO_WIN_BUYS = process.env.SLOT_ENGINE_ALLOW_ZERO_BUY === '1';
const DEFAULT_PROGRESS_MODE_STRING = 'regular_buy,super_buy';
const PROGRESS_MODE_FILTER = new Set(
  (process.env.SLOT_ENGINE_PROGRESS_MODES ?? DEFAULT_PROGRESS_MODE_STRING)
    .split(',')
    .map((mode) => mode.trim())
    .filter(Boolean),
);
const ATTEMPT_LOG_INTERVAL = Number(process.env.SLOT_ENGINE_ATTEMPT_INTERVAL) || 100;
const ATTEMPT_TRACKER = new Map<string, number>();
let resultSetPatchApplied = false;

const shouldReportMode = (mode: string) => {
  if (VERBOSE_PROGRESS === 'off') return false;
  if (VERBOSE_PROGRESS === 'all') return true;
  if (VERBOSE_PROGRESS === 'detailed') {
    return PROGRESS_MODE_FILTER.size === 0 || PROGRESS_MODE_FILTER.has(mode);
  }
  return false;
};

const formatWin = (value: number) => {
  const trimmed = value.toFixed(2).replace(/\.?0+$/, '');
  return trimmed.length > 0 ? trimmed : '0';
};

const noteFailure = (mode: string, simId: number, win: number) => {
  if (!shouldReportMode(mode) || ATTEMPT_LOG_INTERVAL <= 0) {
    return;
  }
  const key = `${mode}:${simId}`;
  const next = (ATTEMPT_TRACKER.get(key) ?? 0) + 1;
  ATTEMPT_TRACKER.set(key, next);
  if (next % ATTEMPT_LOG_INTERVAL === 0) {
    console.log(`[slot-engine] sim#${simId} ${mode} attempts=${next} (lastWin=${formatWin(win)})`);
  }
};

const noteSuccess = (mode: string, simId: number, win: number, allowZero = false) => {
  const key = `${mode}:${simId}`;
  const totalAttempts = (ATTEMPT_TRACKER.get(key) ?? 0) + 1;
  ATTEMPT_TRACKER.delete(key);
  if (!shouldReportMode(mode)) {
    return;
  }
  const attemptsLabel = `${totalAttempts} attempt${totalAttempts === 1 ? '' : 's'}`;
  const tag = allowZero ? ' [allowZeroWin]' : '';
  console.log(
    `[slot-engine] sim#${simId} ${mode} accepted after ${attemptsLabel} with win=${formatWin(win)}${tag}`,
  );
};

const getCurrentWin = (ctx: any) => {
  try {
    const wallet = ctx.services?.wallet?._getWallet?.();
    const win = wallet?.getCurrentWin?.();
    return typeof win === 'number' ? win : 0;
  } catch {
    return 0;
  }
};

const patchResultSetAllowZeroWin = () => {
  if (resultSetPatchApplied) return;
  const originalMeetsCriteria = ResultSet.prototype.meetsCriteria;

  ResultSet.prototype.meetsCriteria = function patchedMeetsCriteria(this: ResultSet<any>, ctx: any) {
    const mode = ctx.state.currentGameMode;
    const simId = ctx.state.currentSimulationId;
    const win = getCurrentWin(ctx);
    const baseResult = originalMeetsCriteria.call(this, ctx);
    if (baseResult) {
      noteSuccess(mode, simId, win);
      return true;
    }

    const allowZero =
      ALLOW_ZERO_WIN_BUYS &&
      Boolean(this.userData?.allowZeroWin || ctx.state.currentResultSet?.userData?.allowZeroWin);
    const freespinsMet = this.forceFreespins ? ctx.state.triggeredFreespins : true;
    const maxWinMet = this.forceMaxWin ? win >= ctx.config.maxWinX : true;
    if (allowZero && win === 0 && freespinsMet && maxWinMet) {
      noteSuccess(mode, simId, win, true);
      return true;
    }

    noteFailure(mode, simId, win);
    return false;
  };

  resultSetPatchApplied = true;
  if (isMainThread && VERBOSE_PROGRESS !== 'off') {
    console.log('[slot-engine] enabled zero-win acceptance for flagged result sets');
  }
};

patchResultSetAllowZeroWin();

export async function runSlotEngineSimulation() {
  candyCarnage1000Game.configureSimulation({
    simRunsAmount: SIM_RUNS,
    concurrency: DEFAULT_CONCURRENCY,
  });

  const simulation = (candyCarnage1000Game as any).simulation;
  if (simulation && !simulation.__progressPatched && VERBOSE_PROGRESS !== 'off') {
    const originalCallWorker = simulation.callWorker.bind(simulation);
    simulation.callWorker = function patchedCallWorker(opts: any) {
      const { mode, simStart, simEnd, index } = opts;
      console.log(`[slot-engine] worker#${index} start ${mode} sims ${simStart}-${simEnd}`);
      return originalCallWorker(opts)
        .then((result: unknown) => {
          console.log(`[slot-engine] worker#${index} done ${mode} sims ${simStart}-${simEnd}`);
          return result;
        })
        .catch((error: unknown) => {
          console.error(`[slot-engine] worker#${index} error ${mode} sims ${simStart}-${simEnd}`, error);
          throw error;
        });
    };
    simulation.__progressPatched = true;
  }

  if (isMainThread) {
    const simulationConfig = (candyCarnage1000Game as any).simulation;
    console.log('[slot-engine] configured sim runs', SIM_RUNS);
    console.log('[slot-engine] simulation keys', Object.keys(simulationConfig?.simRunsAmount ?? {}));
    console.log('[slot-engine] game modes', Object.keys(candyCarnage1000Game.getConfig().gameModes));
    console.log('[slot-engine] rootDir', candyCarnage1000Game.getConfig().rootDir);
    console.log('[slot-engine] concurrency', DEFAULT_CONCURRENCY);
  }

  const heartbeat = setInterval(() => {
    console.log(`[slot-engine] still running at ${new Date().toISOString()}`);
  }, 60_000);

  await candyCarnage1000Game.runTasks({
    doSimulation: true,
    doAnalysis: false,
    simulationOpts: {
      debug: true,
    },
    analysisOpts: {
      gameModes: Object.keys(SIM_RUNS),
    },
  });
  clearInterval(heartbeat);
}

export function autoRunSlotEngineWorker() {
  if (isMainThread) return;
  if (!workerData) return;
  runSlotEngineSimulation().catch((error) => {
    console.error('[slot-engine][worker] failed', error);
    process.exit(1);
  });
}

