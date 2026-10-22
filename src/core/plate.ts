import { COUNTRIES, DE_DIGIT_LENGTHS, type CountryDef, type CountryId } from "../config/countries";
import { RARE_PLATE } from "../config/economy";
import { evaluate } from "./evaluate";
import { pick, pickWeighted, type Rng } from "./random";
import type { Plate } from "./types";

const digit = (rng: Rng) => String(Math.floor(rng() * 10));

export function genDigits(c: CountryDef, rng: Rng): string {
  if (c.digits === "var") {
    const len = DE_DIGIT_LENGTHS[pickWeighted(rng, DE_DIGIT_LENGTHS.map((x) => x.weight))].len;
    // Немецкий номер не начинается с нуля.
    let s = String(1 + Math.floor(rng() * 9));
    while (s.length < len) s += digit(rng);
    return s;
  }
  let s = "";
  for (let i = 0; i < c.digits; i++) s += digit(rng);
  // Номера из одних нулей не бывает.
  if (/^0+$/.test(s)) s = s.slice(0, -1) + (1 + Math.floor(rng() * 9));
  return s;
}

export function genLetters(c: CountryDef, rng: Rng): string {
  let s = "";
  for (let i = 0; i < c.letters; i++) s += pick(rng, [...c.alphabet]);
  return s;
}

export function ordinaryRegion(c: CountryDef, rng: Rng): string {
  return pick(rng, c.regions.filter((r) => !c.prestige[r]));
}

/** Случайный номер редкости «Редкий» или выше — приз рулетки. */
export function rarePlate(country: CountryId, rng: Rng): Plate {
  const c = COUNTRIES[country];
  for (let i = 0; i < RARE_PLATE.attempts; i++) {
    const p: Plate = { c: c.id, d: genDigits(c, rng), l: genLetters(c, rng), r: pick(rng, c.regions) };
    const ev = evaluate(p);
    if (ev && ev.score >= RARE_PLATE.minScore) return p;
  }
  const d = c.digits === "var" ? "77" : "7".repeat(c.digits);
  return { c: c.id, d, l: genLetters(c, rng), r: ordinaryRegion(c, rng) };
}
