import { PAY_SYMBOL_IDS, REELS, VISIBLE_ROWS } from './constants';

type ModeName = 'base' | 'bonus_hunt' | 'regular_buy' | 'super_buy';

const BASE_REEL_LENGTH = 220;
const BONUS_HUNT_REEL_LENGTH = 200;
const BASE_MAX_RUN = 2;
const BASE_CLUSTER_HOTSPOTS = 1;
const BASE_CLUSTER_WIDTH = 2;
const BONUS_SCATTER_GAP = 10;
const BONUS_HUNT_MAX_RUN = 2;
const BONUS_HUNT_CLUSTER_HOTSPOTS = 2;
const BONUS_HUNT_CLUSTER_WIDTH = 2;
const BONUS_HUNT_EXTRA_SCATTERS = 2;
const BONUS_HUNT_SUPER_SCATTER_EVERY = 6;
const REGULAR_BONUS_BOMB_RATIO = 0.05;
const REGULAR_PROMOTION_CHANCE = 0.15;
const REGULAR_CLUSTER_HOTSPOTS = 2;
const REGULAR_CLUSTER_WIDTH = 3;
const SUPER_BONUS_BOMB_RATIO = 0.08;
const SUPER_BONUS_PROMOTION_CHANCE = 0.3;
const SUPER_CLUSTER_HOTSPOTS = 4;
const SUPER_CLUSTER_WIDTH = 4;
const SUPER_SCATTER_REEL = 2;
const RNG_SEEDS = [101, 203, 307, 401, 503, 607];

const BASE_SYMBOL_WEIGHTS: Record<(typeof PAY_SYMBOL_IDS)[number], number> = {
  H1: 3,
  H2: 3,
  H3: 4,
  H4: 5,
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

const BONUS_HUNT_REELS = Array.from({ length: REELS }, (_, index) => {
  const seed = (RNG_SEEDS[index] ?? 0) + 900;
  const rng = createRng(seed);
  const strip = buildSymbolStrip(BONUS_HUNT_REEL_LENGTH, rng, BONUS_HUNT_MAX_RUN);
  injectClusterHotspots(strip, rng, {
    count: BONUS_HUNT_CLUSTER_HOTSPOTS,
    width: BONUS_HUNT_CLUSTER_WIDTH,
  });

  // Scatter handling
  const superScatterPositions: number[] = [];
  if (index === SUPER_SCATTER_REEL) {
    placeSymbolWithGap(strip, 'BS', rng, BONUS_SCATTER_GAP);
    superScatterPositions.push(...getSymbolPositions(strip, 'BS'));
  } else {
    placeSymbolWithGap(strip, 'S', rng, BONUS_SCATTER_GAP, BONUS_HUNT_EXTRA_SCATTERS);
  }

  // Ensure no reel ends up with multiple scatters at the same stop
  const scatterPositions = new Set<number>([
    ...getSymbolPositions(strip, 'S'),
    ...superScatterPositions,
  ]);
  for (const pos of scatterPositions) {
    // Remove adjacent duplicates
    const next = (pos + 1) % strip.length;
    if (scatterPositions.has(next)) {
      const fallback = pickSymbol(BASE_SYMBOL_WEIGHTS, rng);
      strip[next] = fallback;
      scatterPositions.delete(next);
    }
  }

  // Force periodic super scatter for hunt strips
  if (index !== SUPER_SCATTER_REEL && BONUS_HUNT_SUPER_SCATTER_EVERY > 0) {
    const anchor = rng();
    const targetIndex = Math.floor(anchor * strip.length / BONUS_HUNT_SUPER_SCATTER_EVERY) * BONUS_HUNT_SUPER_SCATTER_EVERY;
    if (targetIndex < strip.length) {
      strip[targetIndex] = 'BS';
    }
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

