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
const VERBOSE_PROGRESS = process.env.SLOT_ENGINE_PROGRESS || 'detailed';

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
    doAnalysis: isMainThread,
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

