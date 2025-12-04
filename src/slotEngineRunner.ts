import os from 'os';
import { isMainThread, workerData } from 'worker_threads';

import { candyCarnage1000Game } from './games/candyCarnage1000/config';

const SIM_RUNS = {
  base: 5_000,
  bonus_hunt: 2_500,
  regular_buy: 1_000,
  super_buy: 1_000,
};
const DEFAULT_CONCURRENCY = parseInt(process.env.SLOT_ENGINE_CONCURRENCY || '', 10) || os.cpus().length || 4;

export async function runSlotEngineSimulation() {
  candyCarnage1000Game.configureSimulation({
    simRunsAmount: SIM_RUNS,
    concurrency: DEFAULT_CONCURRENCY,
  });

  if (isMainThread) {
    const simulationConfig = (candyCarnage1000Game as any).simulation;
    console.log('[slot-engine] configured sim runs', SIM_RUNS);
    console.log('[slot-engine] simulation keys', Object.keys(simulationConfig?.simRunsAmount ?? {}));
    console.log('[slot-engine] game modes', Object.keys(candyCarnage1000Game.getConfig().gameModes));
    console.log('[slot-engine] rootDir', candyCarnage1000Game.getConfig().rootDir);
    console.log('[slot-engine] concurrency', DEFAULT_CONCURRENCY);
  }

  await candyCarnage1000Game.runTasks({
    doSimulation: true,
    doAnalysis: isMainThread,
    simulationOpts: {
      debug: true,
    },
    analysisOpts: {
      gameModes: Object.keys(SIM_RUNS),
    },
  });
}

export function autoRunSlotEngineWorker() {
  if (isMainThread) return;
  if (!workerData) return;
  runSlotEngineSimulation().catch((error) => {
    console.error('[slot-engine][worker] failed', error);
    process.exit(1);
  });
}

