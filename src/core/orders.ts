import { ORDERS_ECONOMY } from "../config/economy";
import { BUYERS, ORDER_TEMPLATES, type OrderRule, type OrderTemplate } from "../config/orders";
import type { Evaluation } from "./evaluate";
import { pick, type Rng } from "./random";

export interface Order {
  id: number;
  /** id шаблона из ORDER_TEMPLATES. */
  tid: string;
  buyer: string;
  reward: number;
}

export const orderTemplate = (tid: string): OrderTemplate | undefined => ORDER_TEMPLATES.find((t) => t.id === tid);

export function ruleMatches(rule: OrderRule, ev: Evaluation): boolean {
  if (rule.any && !rule.any.some((k) => ev.keys.has(k))) return false;
  if (rule.all && !rule.all.every((k) => ev.keys.has(k))) return false;
  if (rule.minScore !== undefined && ev.score < rule.minScore) return false;
  if (rule.foreign && ev.plate.c === "ru") return false;
  return true;
}

export function orderMatches(order: Order, ev: Evaluation | null): boolean {
  const t = orderTemplate(order.tid);
  return !!ev && !!t && ruleMatches(t.rule, ev);
}

/** Новый заказ, не повторяющий уже висящие. */
export function makeOrder(existing: readonly Order[], id: number, rng: Rng): Order {
  const taken = new Set(existing.map((o) => o.tid));
  const free = ORDER_TEMPLATES.filter((t) => !taken.has(t.id));
  const t = pick(rng, free.length ? free : ORDER_TEMPLATES);
  const k = ORDERS_ECONOMY.rewardMin + rng() * ORDERS_ECONOMY.rewardSpread;
  const reward = Math.round((t.reward * k) / ORDERS_ECONOMY.rewardStep) * ORDERS_ECONOMY.rewardStep;
  return { id, tid: t.id, buyer: pick(rng, BUYERS), reward };
}
