import { COUNTRIES } from "../config/countries";
import { POINTS, TIERS, type TagKey } from "../config/rarity";
import { priceFor } from "./price";
import type { DraftPlate, Plate } from "./types";

/** Где на номере находка: d — цифры, l — буквы, r — регион. */
export type TagWhere = "d" | "l" | "r" | "dl" | "dr";

export interface Tag {
  key: TagKey;
  pts: number;
  where: TagWhere;
  /** Длина цифр или серии — для подписи («Четыре семёрки», «Короткий номер · 1 цифра»). */
  n?: number;
  /** Для статусного региона: ключ города. */
  city?: string;
}

export interface Evaluation {
  tags: Tag[];
  score: number;
  /** Индекс в TIERS. */
  tier: number;
  /** Цена в рублях, без ×2. */
  price: number;
  keys: Set<TagKey>;
  plate: Plate;
}

export function tierOf(score: number): number {
  let tier = 0;
  TIERS.forEach((t, i) => { if (score >= t.min) tier = i; });
  return tier;
}

function isLadder(d: string): boolean {
  let up = true, down = true;
  for (let i = 1; i < d.length; i++) {
    if (+d[i] - +d[i - 1] !== 1) up = false;
    if (+d[i - 1] - +d[i] !== 1) down = false;
  }
  return up || down;
}

/** Оценка редкости номера. Для недокрученного номера — null. */
export function evaluate(p: DraftPlate): Evaluation | null {
  if (!p.d || !p.l) return null;
  const c = COUNTRIES[p.c];
  const { d, l, r } = p;
  const n = d.length;
  const tags: Tag[] = [];
  const add = (key: TagKey, pts: number, where: TagWhere, extra?: Partial<Tag>) => tags.push({ key, pts, where, ...extra });

  const allSame = n >= 2 && [...d].every((x) => x === d[0]);
  if (n >= 3 && allSame && d[0] === "7") add("seven", n >= 4 ? POINTS.seven4 : POINTS.seven3, "d", { n });
  else if (allSame) add("sameD", n >= 4 ? POINTS.sameD4 : POINTS.sameD, "d", { n });

  if (n >= 3 && /^0+[1-9]$/.test(d)) add("first10", n >= 4 ? POINTS.first10_4 : POINTS.first10_3, "d");
  else if (n === 4 && /^00/.test(d)) add("first100", POINTS.first100, "d");

  if (d === "007" || d === "0007") add("bond", POINTS.bond, "d");
  if (n >= 3 && /^[1-9]0+$/.test(d)) add("round", POINTS.round, "d");

  if (n >= 3) {
    if (isLadder(d)) add("ladder", n >= 4 ? POINTS.ladder4 : POINTS.ladder3, "d");
    if (!allSame && d === [...d].reverse().join("")) add("mirrorD", n >= 4 ? POINTS.mirror4 : POINTS.mirror3, "d");
  }

  if (c.digits === "var" && n <= 2) add("short", n === 1 ? POINTS.short1 : POINTS.short2, "d", { n });

  const sameL = [...l].every((x) => x === l[0]);
  if (sameL) add("sameL", l.length >= 3 ? POINTS.sameL3 : POINTS.sameL2, "l");
  if (c.blat.includes(l)) add("blat", POINTS.blat, "l");

  const pr = c.prestige[r];
  if (pr) add("region", pr.pts, "r", { city: pr.city });

  if (allSame && sameL) add("combo", POINTS.combo, "dl");
  if (r === d && n === 3) add("mirrorR", POINTS.mirrorR, "dr");

  const score = tags.reduce((t, x) => t + x.pts, 0);
  return {
    tags,
    score,
    tier: tierOf(score),
    price: priceFor(score, p.c),
    keys: new Set(tags.map((t) => t.key)),
    plate: { c: p.c, d, l, r },
  };
}

/** Какие части номера подсвечивать. */
export function hitParts(ev: Evaluation): Set<"d" | "l" | "r"> {
  const h = new Set<"d" | "l" | "r">();
  for (const t of ev.tags) for (const ch of t.where) h.add(ch as "d" | "l" | "r");
  return h;
}
