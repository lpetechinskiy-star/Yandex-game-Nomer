// Призы рулетки. weight — относительный шанс выпадения.

export type WheelPrizeKind = "money" | "spins" | "plate" | "jackpot";

export interface WheelPrize {
  kind: WheelPrizeKind;
  /** Рубли для money/jackpot, число прокруток для spins. */
  value: number;
  weight: number;
  color: string;
}

export const WHEEL_PRIZES: readonly WheelPrize[] = [
  { kind: "money", value: 1000, weight: 20, color: "#3170c9" },
  { kind: "spins", value: 3, weight: 18, color: "#2e6b3f" },
  { kind: "money", value: 5000, weight: 12, color: "#e08a00" },
  { kind: "plate", value: 0, weight: 8, color: "#7c4dd8" },
  { kind: "money", value: 3000, weight: 16, color: "#1e9e9e" },
  { kind: "spins", value: 5, weight: 10, color: "#d6457a" },
  { kind: "money", value: 25000, weight: 5, color: "#c62828" },
  { kind: "jackpot", value: 100000, weight: 2, color: "#ecc544" },
];

export const WHEEL_SPIN = {
  /** Полных оборотов перед остановкой. */
  turns: 6,
  durationMs: 4200,
  /** Насколько стрелка может отклониться от центра сектора (доля сектора). */
  jitter: 0.6,
} as const;
