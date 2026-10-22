import { COUNTRIES, COUNTRY_ORDER, START_REGION, type CountryDef, type CountryId } from "../config/countries";
import { ECONOMY, ORDERS_ECONOMY } from "../config/economy";
import { CARS, OFFERS } from "../config/cars";
import { TAGS, type TagKey } from "../config/rarity";
import { genDigits, genLetters } from "./plate";
import { makeOrder, orderTemplate, type Order } from "./orders";
import type { Rng } from "./random";
import type { DraftPlate, InventoryPlate, OwnedPlate, Plate } from "./types";

export const SAVE_VERSION = 1;

export interface GameState {
  v: number;
  /** Когда состояние последний раз сохранялось (для выбора между облаком и localStorage). */
  savedAt: number;
  /** Деньги в рублях. */
  money: number;
  country: CountryId;
  unlocked: CountryId[];
  cur: DraftPlate;
  /** Цена текущего номера удвоена за рекламу. */
  x2: boolean;
  freeSpins: number;
  inv: InventoryPlate[];
  fromWheel: number;
  cars: Record<string, { plate: OwnedPlate | null }>;
  activeCar: string | null;
  /** Сколько реклам просмотрено по предложениям магазина. */
  offers: Record<string, number>;
  orders: Order[];
  found: TagKey[];
  best: { p: Plate; score: number } | null;
  wheel: { last: number; ads: number };
  bonus: { day: number; last: number };
  reviewed: boolean;
  season: { points: number; saves: number };
  muted: boolean;
  /** Счётчик для id номеров и заказов. */
  uid: number;
}

export function newGame(rng: Rng): GameState {
  const ru = COUNTRIES.ru;
  const s: GameState = {
    v: SAVE_VERSION,
    savedAt: 0,
    money: ECONOMY.startMoney,
    country: "ru",
    unlocked: ["ru"],
    cur: { c: "ru", d: genDigits(ru, rng), l: genLetters(ru, rng), r: START_REGION },
    x2: false,
    freeSpins: 0,
    inv: [],
    fromWheel: 0,
    cars: {},
    activeCar: null,
    offers: {},
    orders: [],
    found: [],
    best: null,
    wheel: { last: 0, ads: 0 },
    bonus: { day: 0, last: 0 },
    reviewed: false,
    season: { points: 0, saves: 0 },
    muted: false,
    uid: 1,
  };
  fillOrders(s, rng);
  return s;
}

export function fillOrders(s: GameState, rng: Rng): void {
  while (s.orders.length < ORDERS_ECONOMY.slots) s.orders.push(makeOrder(s.orders, s.uid++, rng));
}

// ---------- проверка сохранения ----------

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);
const num = (x: unknown, def: number) => (typeof x === "number" && Number.isFinite(x) ? x : def);
const bool = (x: unknown, def: boolean) => (typeof x === "boolean" ? x : def);
const isCountry = (x: unknown): x is CountryId => typeof x === "string" && (COUNTRY_ORDER as readonly string[]).includes(x);

const validDigits = (d: unknown): d is string => typeof d === "string" && /^\d{1,4}$/.test(d);
const validLetters = (c: CountryDef, l: unknown): l is string =>
  typeof l === "string" && l.length === c.letters && [...l].every((ch) => c.alphabet.includes(ch));

function plateOf(x: unknown): Plate | null {
  if (!isObj(x) || !isCountry(x.c)) return null;
  const c = COUNTRIES[x.c];
  if (!validDigits(x.d) || !validLetters(c, x.l) || typeof x.r !== "string" || !c.regions.includes(x.r)) return null;
  return { c: x.c, d: x.d, l: x.l, r: x.r };
}

function ownedOf(x: unknown): OwnedPlate | null {
  const p = plateOf(x);
  return p && isObj(x) ? { ...p, x2: bool(x.x2, false) } : null;
}

/**
 * Восстанавливает состояние из сохранения. Неизвестные и битые поля заменяются значениями по умолчанию,
 * чтобы старое или повреждённое сохранение не ломало игру.
 */
export function restore(raw: unknown, rng: Rng): GameState | null {
  if (!isObj(raw) || typeof raw.v !== "number") return null;
  const s = newGame(rng);
  s.savedAt = num(raw.savedAt, 0);
  s.money = Math.max(0, num(raw.money, s.money));
  if (Array.isArray(raw.unlocked)) s.unlocked = Array.from(new Set(["ru" as CountryId, ...raw.unlocked.filter(isCountry)]));
  if (isCountry(raw.country) && s.unlocked.includes(raw.country)) s.country = raw.country;

  const cc = COUNTRIES[s.country];
  const rc = raw.cur;
  if (isObj(rc) && rc.c === s.country && typeof rc.r === "string" && cc.regions.includes(rc.r)) {
    s.cur = { c: s.country, d: validDigits(rc.d) ? rc.d : null, l: validLetters(cc, rc.l) ? rc.l : null, r: rc.r };
  } else if (s.country !== "ru") {
    s.cur = { c: s.country, d: null, l: null, r: cc.regions.find((r) => !cc.prestige[r]) ?? cc.regions[0] };
  }
  s.x2 = bool(raw.x2, false);
  s.freeSpins = Math.max(0, Math.floor(num(raw.freeSpins, 0)));
  s.uid = Math.max(1, Math.floor(num(raw.uid, 1)));

  if (Array.isArray(raw.inv)) {
    s.inv = [];
    for (const it of raw.inv) {
      const p = ownedOf(it);
      if (p && s.inv.length < ECONOMY.inventoryMax) s.inv.push({ ...p, id: isObj(it) ? num(it.id, s.uid++) : s.uid++ });
    }
  }
  s.fromWheel = Math.max(0, num(raw.fromWheel, 0));

  if (isObj(raw.cars)) {
    for (const car of CARS) {
      const slot = raw.cars[car.id];
      if (isObj(slot)) s.cars[car.id] = { plate: ownedOf(slot.plate) };
    }
  }
  if (typeof raw.activeCar === "string" && s.cars[raw.activeCar]) s.activeCar = raw.activeCar;
  else s.activeCar = Object.keys(s.cars)[0] ?? null;

  if (isObj(raw.offers)) for (const o of OFFERS) s.offers[o.id] = Math.max(0, num(raw.offers[o.id], 0));

  if (Array.isArray(raw.orders)) {
    s.orders = [];
    for (const o of raw.orders) {
      if (isObj(o) && typeof o.tid === "string" && orderTemplate(o.tid) && typeof o.buyer === "string" && s.orders.length < ORDERS_ECONOMY.slots)
        s.orders.push({ id: num(o.id, s.uid++), tid: o.tid, buyer: o.buyer, reward: num(o.reward, 0) });
    }
    fillOrders(s, rng);
  }

  const tagKeys = new Set<string>(TAGS.map((t) => t.key));
  if (Array.isArray(raw.found)) s.found = raw.found.filter((k): k is TagKey => typeof k === "string" && tagKeys.has(k));
  if (isObj(raw.best)) {
    const p = plateOf(raw.best.p);
    if (p) s.best = { p, score: num(raw.best.score, 0) };
  }
  if (isObj(raw.wheel)) s.wheel = { last: num(raw.wheel.last, 0), ads: Math.max(0, num(raw.wheel.ads, 0)) };
  if (isObj(raw.bonus)) s.bonus = { day: Math.max(0, num(raw.bonus.day, 0)), last: num(raw.bonus.last, 0) };
  s.reviewed = bool(raw.reviewed, false);
  if (isObj(raw.season)) s.season = { points: Math.max(0, num(raw.season.points, 0)), saves: Math.max(0, num(raw.season.saves, 0)) };
  s.muted = bool(raw.muted, false);

  // uid должен быть больше всех выданных id.
  const maxId = Math.max(0, ...s.inv.map((x) => x.id), ...s.orders.map((x) => x.id));
  if (s.uid <= maxId) s.uid = maxId + 1;
  return s;
}
