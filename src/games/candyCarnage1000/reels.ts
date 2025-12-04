import { PAY_SYMBOL_IDS, REELS, VISIBLE_ROWS } from './constants';

type ModeName = 'base' | 'bonus_hunt' | 'regular_buy' | 'super_buy';

const BASE_REEL_LENGTH = 220;
const BONUS_HUNT_REEL_LENGTH = 200;
const BASE_MAX_RUN = 2;
const BONUS_SCATTER_GAP = 10;
const BONUS_HUNT_MAX_RUN = 2;
const BASE_SCATTER_COUNT = 2;
const BONUS_HUNT_SCATTER_COUNT = 4;
const BONUS_HUNT_SUPER_SCATTER_COUNT = 1;
const REGULAR_BONUS_BOMB_RATIO = 0.03;
const REGULAR_PROMOTION_CHANCE = 0.1;
const SUPER_BONUS_BOMB_RATIO = 0.06;
const SUPER_BONUS_PROMOTION_CHANCE = 0.25;
const SUPER_SCATTER_REEL = 2;
const RNG_SEEDS = [101, 203, 307, 401, 503, 607];

const BASE_SYMBOL_WEIGHTS: Record<(typeof PAY_SYMBOL_IDS)[number], number> = {
  H1: 2,
  H2: 2,
  H3: 3,
  H4: 4,
  L1: 10,
  L2: 10,
  L3: 10,
  L4: 9,
  L5: 9,
};

const PREMIUM_SYMBOLS = ['H1', 'H2', 'H3', 'H4'] as const;
const LOW_SYMBOLS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
const LOW_SYMBOL_SET = new Set<string>(LOW_SYMBOLS);

function createRng(seed: number) {
  let value = seed >>> 0;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickSymbol(
  weights: Record<(typeof PAY_SYMBOL_IDS)[number], number>,
  rng: () => number,
): (typeof PAY_SYMBOL_IDS)[number] {
  const keys = Object.keys(weights) as Array<(typeof PAY_SYMBOL_IDS)[number]>;
  const total = keys.reduce((sum, key) => sum + weights[key], 0);
  const target = rng() * total;
  let cumulative = 0;
  for (const symbol of keys) {
    cumulative += weights[symbol];
    if (target <= cumulative) {
      return symbol;
    }
  }
  return keys[keys.length - 1] ?? 'L1';
}

function buildSymbolStrip(length: number, rng: () => number, maxRun = 2) {
  const strip: string[] = [];
  let prev = '';
  let run = 0;
  while (strip.length < length) {
    const candidate = pickSymbol(BASE_SYMBOL_WEIGHTS, rng);
    if (candidate === prev) {
      if (run >= maxRun) {
        continue;
      }
      run += 1;
    } else {
      prev = candidate;
      run = 1;
    }
    strip.push(candidate);
  }
  return strip;
}

function insertScatterSymbols(strip: string[], rng: () => number, symbol: string, count: number) {
  const length = strip.length;
  const positions = new Set<number>();
  while (positions.size < count) {
    const idx = Math.floor(rng() * length);
    positions.add(idx);
  }
  for (const position of positions) {
    strip[position] = symbol;
  }
}

function getSymbolPositions(strip: string[], symbol: string) {
  const positions: number[] = [];
  for (let i = 0; i < strip.length; i += 1) {
    if (strip[i] === symbol) {
      positions.push(i);
    }
  }
  return positions;
}

function placeSymbolWithGap(
  strip: string[],
  symbol: string,
  rng: () => number,
  minGap: number,
  additionalCopies = 1,
) {
  const positions = getSymbolPositions(strip, symbol);
  const goal = positions.length + additionalCopies;
  let attempts = 0;
  while (positions.length < goal && attempts < 5_000) {
    attempts += 1;
    const idx = Math.floor(rng() * strip.length);
    if (strip[idx] === 'M' || strip[idx] === 'BS') continue;
    if (symbol === 'S' && strip[idx] === 'BS') continue;
    if (symbol === 'BS' && strip[idx] === 'S') continue;
    if (positions.some((pos) => Math.abs(pos - idx) < minGap)) continue;
    strip[idx] = symbol;
    positions.push(idx);
  }
}

function removeScatters(strip: string[], rng: () => number) {
  for (let i = 0; i < strip.length; i += 1) {
    if (strip[i] === 'S' || strip[i] === 'BS') {
      let replacement = pickSymbol(BASE_SYMBOL_WEIGHTS, rng);
      if (i >= 2 && strip[i - 1] === replacement && strip[i - 2] === replacement) {
        replacement = 'L5';
      }
      strip[i] = replacement;
    }
  }
}

function injectBombs(strip: string[], rng: () => number, count: number) {
  let added = 0;
  let attempts = 0;
  while (added < count && attempts < 5_000) {
    attempts += 1;
    const idx = Math.floor(rng() * strip.length);
    const symbol = strip[idx];
    if (symbol === 'S' || symbol === 'BS' || symbol === 'M') continue;
    strip[idx] = 'M';
    added += 1;
  }
}

function promoteLowSymbols(strip: string[], rng: () => number, probability: number) {
  for (let i = 0; i < strip.length; i += 1) {
    const current = strip[i];
    if (!current) continue;
    if (LOW_SYMBOL_SET.has(current) && rng() < probability) {
      const premium = PREMIUM_SYMBOLS[Math.floor(rng() * PREMIUM_SYMBOLS.length)] ?? current;
      strip[i] = premium;
    }
  }
}

const BASE_REELS = Array.from({ length: REELS }, (_, index) => {
  const rng = createRng(RNG_SEEDS[index] ?? 0);
  const strip = buildSymbolStrip(BASE_REEL_LENGTH, rng, BASE_MAX_RUN);
  insertScatterSymbols(strip, rng, 'S', BASE_SCATTER_COUNT);
  if (index === SUPER_SCATTER_REEL) {
    insertScatterSymbols(strip, rng, 'BS', 1);
  }
  return strip;
});

const BONUS_HUNT_REELS = Array.from({ length: REELS }, (_, index) => {
  const rng = createRng((RNG_SEEDS[index] ?? 0) + 5000);
  const strip = buildSymbolStrip(BONUS_HUNT_REEL_LENGTH, rng, BONUS_HUNT_MAX_RUN);
  insertScatterSymbols(strip, rng, 'S', BONUS_HUNT_SCATTER_COUNT);
  if (index === SUPER_SCATTER_REEL) {
    insertScatterSymbols(strip, rng, 'BS', BONUS_HUNT_SUPER_SCATTER_COUNT);
  }
  return strip;
});

const REGULAR_BONUS_REELS = BASE_REELS.map((reel, index) => {
  const rng = createRng((RNG_SEEDS[index] ?? 0) + 2_000);
  const strip = [...reel];
  removeScatters(strip, rng);
  promoteLowSymbols(strip, rng, REGULAR_PROMOTION_CHANCE);
  injectBombs(strip, rng, Math.max(2, Math.round(strip.length * REGULAR_BONUS_BOMB_RATIO)));
  return strip;
});

const SUPER_BONUS_REELS_PER_REEL = BASE_REELS.map((reel, index) => {
  const rng = createRng((RNG_SEEDS[index] ?? 0) + 3_000);
  const strip = [...reel];
  removeScatters(strip, rng);
  promoteLowSymbols(strip, rng, SUPER_BONUS_PROMOTION_CHANCE);
  injectBombs(strip, rng, Math.max(4, Math.round(strip.length * SUPER_BONUS_BOMB_RATIO)));
  return strip;
});

const MODE_BASE_REELS: Record<ModeName, string[][]> = {
  base: BASE_REELS,
  bonus_hunt: BONUS_HUNT_REELS,
  regular_buy: BASE_REELS,
  super_buy: BASE_REELS,
};

const MODE_BONUS_REELS: Record<ModeName, string[][]> = {
  base: REGULAR_BONUS_REELS,
  bonus_hunt: REGULAR_BONUS_REELS,
  regular_buy: REGULAR_BONUS_REELS,
  super_buy: SUPER_BONUS_REELS_PER_REEL,
};

function cloneReels(reels: string[][]): string[][] {
  return reels.map((reel) => [...reel]);
}

export function getReelsForMode(mode: ModeName, type: 'base' | 'bonus') {
  const reelSet = type === 'base' ? MODE_BASE_REELS[mode] : MODE_BONUS_REELS[mode];
  return cloneReels(reelSet);
}

