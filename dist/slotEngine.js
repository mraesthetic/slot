"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotEngineConfigError = void 0;
exports.createSlotGame = createSlotGame;
class SlotEngineConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SlotEngineConfigError';
    }
}
exports.SlotEngineConfigError = SlotEngineConfigError;
function createSlotGame(config) {
    validateGameConfig(config);
    return {
        config,
        describe() {
            const { title, grid, cluster, betModes } = config;
            const betModeSummary = betModes
                .map((mode) => `${mode.id}@${mode.costMultiplier}x`)
                .join(', ');
            return `${title} • ${grid.reels}x${grid.rows} cluster (${cluster.minSize}+) • Modes: ${betModeSummary}`;
        },
    };
}
function validateGameConfig(config) {
    if (config.grid.reels !== 6 || config.grid.rows !== 5) {
        throw new SlotEngineConfigError('Candy Carnage 1000 must be a 6x5 grid.');
    }
    if (config.cluster.minSize !== 8) {
        throw new SlotEngineConfigError('Cluster minimum must be 8 symbols.');
    }
    const hasBombConfig = config.bonuses.every((bonus) => bonus.bombMultipliers.length > 0);
    if (!hasBombConfig) {
        throw new SlotEngineConfigError('All bonus modes must define bomb multipliers.');
    }
    const symbolNames = new Set(config.symbols.map((symbol) => symbol.name));
    const requiredSymbols = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'L5', 'W', 'S', 'BS', 'M'];
    for (const symbol of requiredSymbols) {
        if (!symbolNames.has(symbol)) {
            throw new SlotEngineConfigError(`Missing symbol definition for ${symbol}.`);
        }
    }
}
//# sourceMappingURL=slotEngine.js.map