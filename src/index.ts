import { candyCarnage1000Game } from './games/candyCarnage1000/config';
import { autoRunSlotEngineWorker } from './slotEngineRunner';

export { candyCarnage1000Game };

if (require.main === module) {
  const config = candyCarnage1000Game.getConfig();
  console.log(`Loaded Slot Engine config for ${config.name} (${config.id})`);
}

autoRunSlotEngineWorker();

