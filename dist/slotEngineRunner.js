"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSlotEngineSimulation = runSlotEngineSimulation;
exports.autoRunSlotEngineWorker = autoRunSlotEngineWorker;
const worker_threads_1 = require("worker_threads");
const config_1 = require("./games/candyCarnage1000/config");
const SIM_RUNS = {
    base: 5000,
    bonus_hunt: 2500,
    regular_buy: 1000,
    super_buy: 1000,
};
async function runSlotEngineSimulation() {
    config_1.candyCarnage1000Game.configureSimulation({
        simRunsAmount: SIM_RUNS,
        concurrency: 4,
    });
    if (worker_threads_1.isMainThread) {
        const simulationConfig = config_1.candyCarnage1000Game.simulation;
        console.log('[slot-engine] configured sim runs', SIM_RUNS);
        console.log('[slot-engine] simulation keys', Object.keys(simulationConfig?.simRunsAmount ?? {}));
        console.log('[slot-engine] game modes', Object.keys(config_1.candyCarnage1000Game.getConfig().gameModes));
        console.log('[slot-engine] rootDir', config_1.candyCarnage1000Game.getConfig().rootDir);
    }
    await config_1.candyCarnage1000Game.runTasks({
        doSimulation: true,
        doAnalysis: worker_threads_1.isMainThread,
        simulationOpts: {
            debug: true,
        },
        analysisOpts: {
            gameModes: Object.keys(SIM_RUNS),
        },
    });
}
function autoRunSlotEngineWorker() {
    if (worker_threads_1.isMainThread)
        return;
    if (!worker_threads_1.workerData)
        return;
    runSlotEngineSimulation().catch((error) => {
        console.error('[slot-engine][worker] failed', error);
        process.exit(1);
    });
}
//# sourceMappingURL=slotEngineRunner.js.map