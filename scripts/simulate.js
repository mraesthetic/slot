"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
async function run() {
    const simRuns = {
        base: 5000,
        bonus_hunt: 2500,
        regular_buy: 1000,
        super_buy: 1000,
    };
    index_1.candyCarnage1000Game.configureSimulation({
        simRunsAmount: simRuns,
        concurrency: 4,
    });
    // eslint-disable-next-line no-console
    const simulationConfig = index_1.candyCarnage1000Game.simulation;
    console.log('[simulate] configured sim runs', simRuns);
    console.log('[simulate] Slot Engine sim keys', Object.keys(simulationConfig?.simRunsAmount ?? {}));
    console.log('[simulate] raw sim runs', simulationConfig?.simRunsAmount);
    console.log('[simulate] Game modes', Object.keys(index_1.candyCarnage1000Game.getConfig().gameModes));
    await index_1.candyCarnage1000Game.runTasks({
        doSimulation: true,
        simulationOpts: {
            debug: true,
        },
        doAnalysis: true,
        analysisOpts: {
            gameModes: ['base', 'bonus_hunt', 'regular_buy', 'super_buy'],
        },
    });
}
run().catch((error) => {
    console.error('[simulate] failed', error);
    process.exit(1);
});
//# sourceMappingURL=simulate.js.map