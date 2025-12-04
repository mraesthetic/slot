import { runSlotEngineSimulation } from '../src/slotEngineRunner';

if (require.main === module) {
  runSlotEngineSimulation().catch((error) => {
    console.error('[slot-engine] failed', error);
    process.exit(1);
  });
}

