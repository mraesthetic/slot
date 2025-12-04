"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candyCarnage1000Game = void 0;
const config_1 = require("./games/candyCarnage1000/config");
Object.defineProperty(exports, "candyCarnage1000Game", { enumerable: true, get: function () { return config_1.candyCarnage1000Game; } });
const slotEngineRunner_1 = require("./slotEngineRunner");
if (require.main === module) {
    const config = config_1.candyCarnage1000Game.getConfig();
    console.log(`Loaded Slot Engine config for ${config.name} (${config.id})`);
}
(0, slotEngineRunner_1.autoRunSlotEngineWorker)();
//# sourceMappingURL=index.js.map