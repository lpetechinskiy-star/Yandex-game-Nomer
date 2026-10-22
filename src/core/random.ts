/** Источник случайных чисел в [0, 1). В тестах подменяется на детерминированный. */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** Индекс по весам. */
export function pickWeighted(rng: Rng, weights: readonly number[]): number {
  const total = weights.reduce((t, w) => t + w, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** Простой детерминированный генератор (mulberry32) для тестов. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
