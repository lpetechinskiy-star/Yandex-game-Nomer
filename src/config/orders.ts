// Заказы покупателей. Условие описано декларативно и проверяется в core/orders.ts.
import type { TagKey } from "./rarity";

export interface OrderRule {
  /** Подходит, если есть хотя бы одна из находок. */
  any?: readonly TagKey[];
  /** Подходит, если есть все находки. */
  all?: readonly TagKey[];
  /** Подходит, если очков редкости не меньше. */
  minScore?: number;
  /** Подходит любой номер не из России. */
  foreign?: boolean;
}

export interface OrderTemplate {
  /** Ключ текста в i18n: order.<id>. */
  id: string;
  /** Базовая награда в рублях. */
  reward: number;
  rule: OrderRule;
}

export const ORDER_TEMPLATES: readonly OrderTemplate[] = [
  { id: "sameD", reward: 3000, rule: { any: ["sameD", "seven"] } },
  { id: "seven", reward: 10000, rule: { any: ["seven"] } },
  { id: "blat", reward: 10000, rule: { any: ["blat"] } },
  { id: "sameL", reward: 3000, rule: { any: ["sameL"] } },
  { id: "first10", reward: 3000, rule: { any: ["first10"] } },
  { id: "ladder", reward: 1500, rule: { any: ["ladder"] } },
  { id: "round", reward: 5000, rule: { any: ["round"] } },
  { id: "mirror", reward: 1500, rule: { any: ["mirrorD"] } },
  { id: "rare", reward: 3000, rule: { minScore: 15 } },
  { id: "foreign", reward: 1500, rule: { foreign: true } },
  { id: "mirReg", reward: 6000, rule: { all: ["mirrorD", "region"] } },
  { id: "short", reward: 10000, rule: { any: ["short"] } },
];

/** Ключи покупателей в i18n: buyer.<id>. */
export const BUYERS: readonly string[] = ["taxi", "dima", "wedding", "collector", "blogger", "dealer", "trucker", "tow"];
