// Очки редкости, уровни редкости и подсказки для коллекции.

export type TagKey =
  | "seven" | "sameD" | "first10" | "first100" | "bond" | "round" | "ladder"
  | "mirrorD" | "short" | "sameL" | "blat" | "region" | "combo" | "mirrorR";

/** Очки за каждую находку. Суффикс — длина цифровой части или серии. */
export const POINTS = {
  seven3: 60, seven4: 70,
  sameD: 40, sameD4: 50,
  first10_3: 45, first10_4: 50,
  first100: 25,
  bond: 10,
  round: 20,
  ladder3: 15, ladder4: 25,
  mirror3: 8, mirror4: 12,
  short1: 50, short2: 25,
  sameL2: 20, sameL3: 35,
  blat: 40,
  combo: 30,
  mirrorR: 20,
} as const;

export interface TagDef {
  key: TagKey;
  /** Шанс «1 из N»; null — регион выбирается игроком. */
  odds: number | null;
  /** Очки для подсказки: одно число или диапазон. */
  pts: readonly number[];
  /** Бонус к другой находке — в коллекции показывается со знаком «+». */
  bonus?: boolean;
}

/** Порядок совпадает с порядком в коллекции. */
export const TAGS: readonly TagDef[] = [
  { key: "seven", odds: 1000, pts: [POINTS.seven3, POINTS.seven4] },
  { key: "sameD", odds: 125, pts: [POINTS.sameD, POINTS.sameD4] },
  { key: "first10", odds: 111, pts: [POINTS.first10_3, POINTS.first10_4] },
  { key: "first100", odds: 110, pts: [POINTS.first100] },
  { key: "bond", odds: 1000, pts: [POINTS.bond], bonus: true },
  { key: "round", odds: 111, pts: [POINTS.round] },
  { key: "ladder", odds: 62, pts: [POINTS.ladder3, POINTS.ladder4] },
  { key: "mirrorD", odds: 12, pts: [POINTS.mirror3, POINTS.mirror4] },
  { key: "short", odds: 10, pts: [POINTS.short2, POINTS.short1] },
  { key: "sameL", odds: 144, pts: [POINTS.sameL2, POINTS.sameL3] },
  { key: "blat", odds: 346, pts: [POINTS.blat] },
  { key: "region", odds: null, pts: [5, 30] },
  { key: "combo", odds: 16000, pts: [POINTS.combo], bonus: true },
  { key: "mirrorR", odds: 4000, pts: [POINTS.mirrorR], bonus: true },
];

export interface TierDef {
  /** Минимум очков для уровня. */
  min: number;
  /** CSS-цвет уровня. */
  color: string;
}

/** 0 обычный, 1 необычный, 2 редкий, 3 эпический, 4 легендарный. */
export const TIERS: readonly TierDef[] = [
  { min: 0, color: "#7a8594" },
  { min: 5, color: "#2f8f5b" },
  { min: 15, color: "#2457c5" },
  { min: 35, color: "#7c4dd8" },
  { min: 60, color: "#e38a00" },
];
