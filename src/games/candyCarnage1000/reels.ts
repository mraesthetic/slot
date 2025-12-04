import { PAY_SYMBOL_IDS, REELS, VISIBLE_ROWS } from './constants';

type ModeName = 'base' | 'bonus_hunt' | 'regular_buy' | 'super_buy';

const BASE_REEL_LENGTH = 180;
const BASE_MAX_RUN = 3;
const BASE_CLUSTER_HOTSPOTS = 4;
const BASE_CLUSTER_WIDTH = 3;
const BONUS_SCATTER_GAP = 6;
const BONUS_HUNT_EXTRA_SCATTERS = 2;
const REGULAR_BONUS_BOMB_RATIO = 0.1;
const REGULAR_PROMOTION_CHANCE = 0.25;
const REGULAR_CLUSTER_HOTSPOTS = 5;
const REGULAR_CLUSTER_WIDTH = 4;
const SUPER_BONUS_BOMB_RATIO = 0.04;
const SUPER_BONUS_PROMOTION_CHANCE = 0.2;
const SUPER_CLUSTER_HOTSPOTS = 3;
const SUPER_CLUSTER_WIDTH = 3;
const SUPER_SCATTER_REEL = 2;
const RNG_SEEDS = [101, 203, 307, 401, 503, 607];

const BASE_SYMBOL_WEIGHTS: Record<(typeof PAY_SYMBOL_IDS)[number], number> = {
  H1: 4,
  H2: 4,
  H3: 5,
  H4: 6,
  L1: 9,
  L2: 9,
  L3: 9,
  L4: 8,
  L5: 8,
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
  while (strip.length < length) {
    const candidate = pickSymbol(BASE_SYMBOL_WEIGHTS, rng);
    if (strip.length >= maxRun) {
      const recent = strip.slice(strip.length - maxRun);
      if (recent.every((symbol) => symbol === candidate)) {
        continue;
      }
    }
    strip.push(candidate);
  }
  return strip;
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

function injectClusterHotspots(
  strip: string[],
  rng: () => number,
  opts: { count: number; width: number },
) {
  const { count, width } = opts;
  for (let i = 0; i < count; i += 1) {
    const anchor = Math.floor(rng() * strip.length);
    const symbol = pickSymbol(BASE_SYMBOL_WEIGHTS, rng);
    for (let j = 0; j < width; j += 1) {
      const idx = (anchor + j) % strip.length;
      strip[idx] = symbol;
    }
  }
}

function generateBaseReels() {
  return Array.from({ length: REELS }, (_, index) => {
    const seed = RNG_SEEDS[index] ?? (101 + index * 97);
    const rng = createRng(seed);
    const strip = buildSymbolStrip(BASE_REEL_LENGTH, rng, BASE_MAX_RUN);
    injectClusterHotspots(strip, rng, { count: BASE_CLUSTER_HOTSPOTS, width: BASE_CLUSTER_WIDTH });
    if (index === SUPER_SCATTER_REEL) {
      placeSymbolWithGap(strip, 'BS', rng, BONUS_SCATTER_GAP);
    } else {
      placeSymbolWithGap(strip, 'S', rng, BONUS_SCATTER_GAP);
    }
    return strip;
  });
}

const BASE_REELS = generateBaseReels();

const BONUS_HUNT_REELS = BASE_REELS.map((reel, index) => {
  const rng = createRng((RNG_SEEDS[index] ?? 0) + 900);
  const strip = [...reel];
  if (index !== SUPER_SCATTER_REEL) {
    placeSymbolWithGap(strip, 'S', rng, BONUS_SCATTER_GAP, BONUS_HUNT_EXTRA_SCATTERS);
  }
  return strip;
});

const REGULAR_BONUS_REELS = BASE_REELS.map((reel, index) => {
  const rng = createRng((RNG_SEEDS[index] ?? 0) + 2_000);
  const strip = [...reel];
  removeScatters(strip, rng);
  injectClusterHotspots(strip, rng, {
    count: REGULAR_CLUSTER_HOTSPOTS,
    width: REGULAR_CLUSTER_WIDTH,
  });
  promoteLowSymbols(strip, rng, REGULAR_PROMOTION_CHANCE);
  injectBombs(strip, rng, Math.max(6, Math.round(strip.length * REGULAR_BONUS_BOMB_RATIO)));
  return strip;
});

const SUPER_BONUS_REELS_PER_REEL = BASE_REELS.map((reel, index) => {
  const rng = createRng((RNG_SEEDS[index] ?? 0) + 3_000);
  const strip = [...reel];
  removeScatters(strip, rng);
  promoteLowSymbols(strip, rng, SUPER_BONUS_PROMOTION_CHANCE);
  injectClusterHotspots(strip, rng, { count: SUPER_CLUSTER_HOTSPOTS, width: SUPER_CLUSTER_WIDTH });
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

