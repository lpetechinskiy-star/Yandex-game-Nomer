// Игровые действия над состоянием. Без DOM: экраны вызывают эти функции и показывают результат.
import { DAILY_BONUS } from "../config/bonus";
import { CARS, OFFERS, type CarDef, type OfferDef } from "../config/cars";
import { COUNTRIES, type CountryId } from "../config/countries";
import { ADS, ECONOMY, TIMERS } from "../config/economy";
import { RANKS } from "../config/ranks";
import { WHEEL_PRIZES } from "../config/wheel";
import { evaluate, type Evaluation } from "./evaluate";
import { makeOrder, orderMatches, type Order } from "./orders";
import { genDigits, genLetters, ordinaryRegion, rarePlate } from "./plate";
import { withX2 } from "./price";
import { pickWeighted, type Rng } from "./random";
import type { GameState } from "./state";
import type { InventoryPlate, OwnedPlate, Plate } from "./types";

export const country = (s: GameState) => COUNTRIES[s.country];
export const currentEval = (s: GameState) => evaluate(s.cur);
export const carById = (id: string): CarDef | undefined => CARS.find((c) => c.id === id);
export const ownedCars = (s: GameState) => CARS.filter((c) => s.cars[c.id]);
export const inventoryFull = (s: GameState) => s.inv.length >= ECONOMY.inventoryMax;
export const ownedPrice = (p: OwnedPlate) => withX2(evaluate(p)!.price, p.x2);

export function rankIndex(points: number): number {
  let i = 0;
  RANKS.forEach((r, k) => { if (points >= r.min) i = k; });
  return i;
}

/** Запоминает находки для коллекции и лучший номер. */
export function noteFound(s: GameState, ev: Evaluation | null): void {
  if (!ev) return;
  for (const t of ev.tags) if (!s.found.includes(t.key)) s.found.push(t.key);
  if (!s.best || ev.score > s.best.score) s.best = { p: { ...ev.plate }, score: ev.score };
}

// ---------- создание номера ----------

/** Повторная прокрутка редкого номера требует подтверждения. */
export function needsSpinConfirm(s: GameState): boolean {
  const ev = currentEval(s);
  return !!ev && ev.tier >= ECONOMY.rareConfirmTier;
}

/** Списывает плату за прокрутку. false — не хватает денег. */
export function paySpin(s: GameState): boolean {
  if (s.freeSpins > 0) s.freeSpins--;
  else if (s.money >= ECONOMY.spinCost) s.money -= ECONOMY.spinCost;
  else return false;
  s.x2 = false;
  return true;
}

export function applySpin(s: GameState, part: "d" | "l", rng: Rng): Evaluation | null {
  const c = country(s);
  s.cur[part] = part === "d" ? genDigits(c, rng) : genLetters(c, rng);
  const ev = currentEval(s);
  noteFound(s, ev);
  return ev;
}

export function resetCurrent(s: GameState): void {
  s.cur = { c: s.country, d: null, l: null, r: s.cur.r };
  s.x2 = false;
}

export const currentPrice = (s: GameState): number | null => {
  const ev = currentEval(s);
  return ev ? withX2(ev.price, s.x2) : null;
};

export function sellCurrent(s: GameState): number | null {
  const price = currentPrice(s);
  if (price === null) return null;
  s.money += price;
  resetCurrent(s);
  return price;
}

/** Сохраняет текущий номер в инвентарь. Возвращает очки сезона или null. */
export function saveCurrent(s: GameState): number | null {
  const ev = currentEval(s);
  if (!ev || inventoryFull(s)) return null;
  s.inv.push({ ...ev.plate, x2: s.x2, id: s.uid++ });
  s.season.points += ev.score;
  s.season.saves++;
  resetCurrent(s);
  return ev.score;
}

export interface InstallResult {
  car: CarDef;
  /** Очки сезона за установку (только с экрана создания). */
  points: number;
  /** Старый номер не влез в инвентарь и продан за эту сумму. */
  soldOld: number | null;
}

/** Ставит номер на машину. Старый номер уходит в инвентарь, а если там нет места — продаётся. */
export function mountPlate(s: GameState, carId: string, plate: OwnedPlate): InstallResult | null {
  const slot = s.cars[carId], car = carById(carId);
  if (!slot || !car) return null;
  let soldOld: number | null = null;
  if (slot.plate) {
    if (!inventoryFull(s)) s.inv.push({ ...slot.plate, id: s.uid++ });
    else {
      soldOld = ownedPrice(slot.plate);
      s.money += soldOld;
    }
  }
  slot.plate = { c: plate.c, d: plate.d, l: plate.l, r: plate.r, x2: plate.x2 };
  return { car, points: 0, soldOld };
}

export function installCurrent(s: GameState): InstallResult | null {
  const ev = currentEval(s);
  if (!ev || !s.activeCar) return null;
  const res = mountPlate(s, s.activeCar, { ...ev.plate, x2: s.x2 });
  if (!res) return null;
  res.points = Math.round(ev.score * res.car.cls);
  s.season.points += res.points;
  s.season.saves++;
  resetCurrent(s);
  return res;
}

// ---------- инвентарь ----------

const takeInventory = (s: GameState, id: number): InventoryPlate | null => {
  const i = s.inv.findIndex((x) => x.id === id);
  return i < 0 ? null : s.inv.splice(i, 1)[0];
};

export function sellInventory(s: GameState, id: number): number | null {
  const it = takeInventory(s, id);
  if (!it) return null;
  const price = ownedPrice(it);
  s.money += price;
  return price;
}

export function installFromInventory(s: GameState, id: number, carId = s.activeCar): InstallResult | null {
  if (!carId || !s.cars[carId]) return null;
  const it = takeInventory(s, id);
  return it ? mountPlate(s, carId, it) : null;
}

export function unmount(s: GameState, carId: string): boolean {
  const slot = s.cars[carId];
  if (!slot?.plate || inventoryFull(s)) return false;
  s.inv.push({ ...slot.plate, id: s.uid++ });
  slot.plate = null;
  return true;
}

export function setActiveCar(s: GameState, carId: string): void {
  if (s.cars[carId]) s.activeCar = carId;
}

// ---------- заказы ----------

/** Заказы, которые выгоднее продажи этого номера. */
export function profitableOrders(s: GameState, ev: Evaluation | null, price: number): Order[] {
  return s.orders.filter((o) => orderMatches(o, ev) && o.reward > price);
}

export function readyOrdersCount(s: GameState): number {
  const cur = currentEval(s);
  const inv = s.inv.map((it) => evaluate(it));
  return s.orders.filter((o) => orderMatches(o, cur) || inv.some((e) => orderMatches(o, e))).length;
}

function completeOrder(s: GameState, orderId: number, ev: Evaluation | null, rng: Rng): Order | null {
  const i = s.orders.findIndex((o) => o.id === orderId);
  if (i < 0 || !orderMatches(s.orders[i], ev)) return null;
  const o = s.orders[i];
  s.money += o.reward;
  s.orders.splice(i, 1);
  s.orders.splice(i, 0, makeOrder(s.orders, s.uid++, rng));
  return o;
}

export function giveCurrent(s: GameState, orderId: number, rng: Rng): Order | null {
  const o = completeOrder(s, orderId, currentEval(s), rng);
  if (o) resetCurrent(s);
  return o;
}

export function giveInventory(s: GameState, invId: number, orderId: number, rng: Rng): Order | null {
  const it = s.inv.find((x) => x.id === invId);
  if (!it) return null;
  const o = completeOrder(s, orderId, evaluate(it), rng);
  if (o) takeInventory(s, invId);
  return o;
}

/** «Другой покупатель». false — не хватает денег. */
export function replaceOrder(s: GameState, orderId: number, rng: Rng): boolean {
  const i = s.orders.findIndex((o) => o.id === orderId);
  if (i < 0 || s.money < ECONOMY.replaceOrderCost) return false;
  s.money -= ECONOMY.replaceOrderCost;
  const rest = s.orders.filter((o) => o.id !== orderId);
  // Новый заказ не должен совпасть с заменяемым.
  s.orders[i] = makeOrder([...rest, s.orders[i]], s.uid++, rng);
  return true;
}

// ---------- страны и регионы ----------

export function regionCost(c: CountryId, r: string): number {
  const pr = COUNTRIES[c].prestige[r];
  return pr ? pr.pts * ECONOMY.regionCostPerPoint : 0;
}

export function selectRegion(s: GameState, r: string): "same" | "broke" | "ok" {
  if (s.cur.r === r) return "same";
  if (!country(s).regions.includes(r)) return "same";
  const cost = regionCost(s.country, r);
  if (s.money < cost) return "broke";
  s.money -= cost;
  s.cur.r = r;
  noteFound(s, currentEval(s));
  return "ok";
}

export function unlockCountry(s: GameState, id: CountryId): boolean {
  const c = COUNTRIES[id];
  if (s.unlocked.includes(id) || s.money < c.unlock) return false;
  s.money -= c.unlock;
  s.unlocked.push(id);
  return true;
}

/** Смена страны. Возвращает true, если незаконченный номер сброшен. */
export function selectCountry(s: GameState, id: CountryId, rng: Rng): boolean {
  if (!s.unlocked.includes(id)) return false;
  const dropped = !!(s.cur.d || s.cur.l);
  s.country = id;
  s.cur = { c: id, d: null, l: null, r: ordinaryRegion(COUNTRIES[id], rng) };
  s.x2 = false;
  return dropped;
}

// ---------- реклама за вознаграждение ----------

export function addFreeSpin(s: GameState): void {
  s.freeSpins++;
}

export function applyX2(s: GameState): void {
  if (currentEval(s)) s.x2 = true;
}

export interface OfferProgress {
  granted: boolean;
  progress: number;
  bonus: number;
}

export const offerOwned = (s: GameState, o: OfferDef) => o.cars.every((id) => s.cars[id]);

function grantOffer(s: GameState, o: OfferDef): void {
  for (const id of o.cars) if (!s.cars[id]) s.cars[id] = { plate: null };
  if (!s.activeCar) s.activeCar = o.cars[0];
}

/** Одна просмотренная реклама по предложению магазина. */
export function offerAdWatched(s: GameState, offerId: string): OfferProgress | null {
  const o = OFFERS.find((x) => x.id === offerId);
  if (!o?.ads || offerOwned(s, o)) return null;
  const bonus = o.adBonus ?? 0;
  s.money += bonus;
  const progress = (s.offers[o.id] ?? 0) + 1;
  s.offers[o.id] = progress;
  const granted = progress >= o.ads;
  if (granted) grantOffer(s, o);
  return { granted, progress, bonus };
}

export function buyOffer(s: GameState, offerId: string): boolean {
  const o = OFFERS.find((x) => x.id === offerId);
  if (!o?.price || offerOwned(s, o) || s.money < o.price) return false;
  s.money -= o.price;
  grantOffer(s, o);
  return true;
}

// ---------- рулетка ----------

export const wheelFree = (s: GameState, now: number) => now - s.wheel.last >= TIMERS.wheelCooldownMs;
export const wheelReady = (s: GameState, now: number) => wheelFree(s, now) || s.wheel.ads >= ADS.wheelAdsNeeded;
export const wheelLeftMs = (s: GameState, now: number) => Math.max(0, TIMERS.wheelCooldownMs - (now - s.wheel.last));

export function wheelAdWatched(s: GameState): void {
  s.wheel.ads = Math.min(ADS.wheelAdsNeeded, s.wheel.ads + 1);
}

/** Тратит бесплатную прокрутку или просмотренные рекламы и выбирает приз. null — крутить нельзя. */
export function startWheel(s: GameState, now: number, rng: Rng): number | null {
  if (wheelFree(s, now)) s.wheel.last = now;
  else if (s.wheel.ads >= ADS.wheelAdsNeeded) s.wheel.ads = 0;
  else return null;
  return pickWeighted(rng, WHEEL_PRIZES.map((w) => w.weight));
}

export type WheelResult =
  | { kind: "money" | "jackpot"; amount: number }
  | { kind: "spins"; count: number }
  | { kind: "plate"; plate: Plate; score: number; soldFor: number | null };

export function applyWheelPrize(s: GameState, idx: number, rng: Rng): WheelResult {
  const w = WHEEL_PRIZES[idx];
  if (w.kind === "spins") {
    s.freeSpins += w.value;
    return { kind: "spins", count: w.value };
  }
  if (w.kind === "plate") {
    const plate = rarePlate(s.country, rng);
    const ev = evaluate(plate)!;
    noteFound(s, ev);
    if (!inventoryFull(s)) {
      s.inv.push({ ...plate, x2: false, id: s.uid++ });
      s.fromWheel++;
      return { kind: "plate", plate, score: ev.score, soldFor: null };
    }
    s.money += ev.price;
    return { kind: "plate", plate, score: ev.score, soldFor: ev.price };
  }
  s.money += w.value;
  return { kind: w.kind, amount: w.value };
}

// ---------- ежедневный бонус ----------

export const bonusReady = (s: GameState, now: number) => now - s.bonus.last >= TIMERS.bonusPeriodMs;
export const bonusLeftMs = (s: GameState, now: number) => Math.max(0, TIMERS.bonusPeriodMs - (now - s.bonus.last));

/** Какой день серии сейчас (0..6). Пропуск дня обнуляет серию. */
export function bonusDay(s: GameState, now: number): number {
  if (s.bonus.last && now - s.bonus.last > TIMERS.bonusStreakResetMs) return 0;
  return s.bonus.day % DAILY_BONUS.length;
}

export function claimBonus(s: GameState, now: number): number | null {
  if (!bonusReady(s, now)) return null;
  const day = bonusDay(s, now);
  const amount = DAILY_BONUS[day];
  s.money += amount;
  s.bonus.day = (day + 1) % DAILY_BONUS.length;
  s.bonus.last = now;
  return amount;
}

// ---------- оценка игры ----------

export function rewardReview(s: GameState): boolean {
  if (s.reviewed) return false;
  s.reviewed = true;
  s.money += ECONOMY.reviewReward;
  return true;
}
