// Номера рисуются в SVG. Ширина каждого символа задана через textLength,
// поэтому номер выглядит одинаково при любом шрифте и масштабе.
import { US_SLOGANS } from "../config/countries";
import type { DraftPlate } from "../core/types";
import { t } from "../i18n";
import { esc } from "./dom";

type Part = "d" | "l" | "r" | "x";
type Hits = ReadonlySet<string>;

/** Символ на месте ещё не прокрученной цифры или буквы. */
const PLACEHOLDER = "–";
const fx = (n: number) => n.toFixed(1);

function ch(x: number, y: number, fs: number, w: number, c: string | null, part: Part): string {
  const ph = c == null;
  return `<text class="ch${ph ? " pph" : ""}" data-p="${part}" x="${fx(x)}" y="${fx(y)}" font-size="${fs}" textLength="${fx(w)}" lengthAdjust="spacingAndGlyphs" text-anchor="middle">${esc(ph ? PLACEHOLDER : c)}</text>`;
}

const slots = (s: string | null, n: number): (string | null)[] => (s ? [...s] : Array(n).fill(null));
const hl = (cx: number, w: number, top: number, h: number) => `<rect x="${fx(cx - w / 2 - 3)}" y="${fx(top - 3)}" width="${fx(w + 6)}" height="${fx(h + 6)}" rx="5"/>`;

function aria(text: string): string {
  return esc(t("plate.aria", { text: text.trim() }));
}

function plateRU(p: DraftPlate, hits: Hits): string {
  const L = slots(p.l, 3), D = slots(p.d, 3), base = 95.5;
  const cells: [number, number, string | null, Part][] = [
    [59.5, 37, L[0], "l"], [117, 40.5, D[0], "d"], [168.5, 40.5, D[1], "d"], [220, 40.5, D[2], "d"], [280, 35, L[1], "l"], [331, 35, L[2], "l"],
  ];
  const r = [...p.r];
  const rp = r.length === 3 ? { pitch: 33, w: 26, f: 62 } : { pitch: 42, w: 28.5, f: 66 };
  const rx0 = 448 - ((r.length - 1) * rp.pitch) / 2;
  let h = "", g = "";
  for (const [x, w, c, part] of cells) {
    const dig = part === "d", ht = dig ? 73 : 57;
    if (hits.has(part)) h += hl(x, w, base - ht, ht);
    g += ch(x, base, dig ? 101 : 79, w, c, part);
  }
  r.forEach((c, i) => {
    const x = rx0 + i * rp.pitch;
    if (hits.has("r")) h += hl(x, rp.w, 19, 48);
    g += ch(x, 67, rp.f, rp.w, c, "r");
  });
  const label = (p.l ? p.l[0] : "") + (p.d ?? "") + (p.l ? p.l.slice(1) : "") + " " + p.r;
  return `<svg class="psvg" viewBox="0 0 520 112" role="img" aria-label="${aria(label)}">` +
    `<rect width="520" height="112" rx="11" fill="#141414"/><rect x="4.5" y="4.5" width="374" height="103" rx="8" fill="#fbfbf9"/><rect x="383.5" y="4.5" width="132" height="103" rx="8" fill="#fbfbf9"/>` +
    `<g class="hls">${h}</g><g fill="#141414">${g}<text x="422" y="99.5" font-size="29" textLength="54" lengthAdjust="spacingAndGlyphs" text-anchor="middle">RUS</text></g>` +
    `<rect x="455.6" y="78.4" width="42.5" height="21.6" fill="#fff" stroke="#141414" stroke-width="1.6"/><rect x="456.4" y="85.6" width="40.9" height="7.2" fill="#1c50c8"/><rect x="456.4" y="92.8" width="40.9" height="6.4" fill="#d52b1e"/>` +
    `</svg>`;
}

interface Cell { ch?: string | null; part?: Part; hit?: boolean; seals?: boolean }

/** Раскладка групп символов в строку с автоматическим сжатием, если не помещается. */
function rowLayout(groups: Cell[][], x0: number, x1: number, base: number, capH: number, cw0: number, pitch0: number, gap0: number) {
  const n = groups.reduce((t, g) => t + g.length, 0), gaps = groups.length - 1;
  let need = n * pitch0 - (pitch0 - cw0) + gaps * gap0;
  const k = Math.min(1, (x1 - x0) / need);
  const cw = cw0 * k, pitch = pitch0 * k, gap = gap0 * k;
  need *= k;
  let x = x0 + (x1 - x0 - need) / 2 + cw / 2, h = "", g = "";
  groups.forEach((grp, gi) => {
    grp.forEach((c, i) => {
      if (c.seals) {
        g += `<circle cx="${fx(x)}" cy="${fx(base - capH * 0.72)}" r="${fx(cw * 0.32)}" fill="#cfcfcf" stroke="#8a8a8a"/><circle cx="${fx(x)}" cy="${fx(base - capH * 0.25)}" r="${fx(cw * 0.32)}" fill="#e8a33a" stroke="#a8661a"/>`;
      } else {
        if (c.part !== "x" && c.hit) h += hl(x, cw, base - capH, capH);
        g += ch(x, base, +fx(capH / 0.72), cw, c.ch ?? null, c.part ?? "x");
      }
      if (i < grp.length - 1) x += pitch;
    });
    if (gi < groups.length - 1) x += cw + gap;
  });
  return { h, g };
}

function sideStrip(kind: string): string {
  const label = (txt: string, fill: string, size = 20, y = 92) =>
    `<text x="30" y="${y}" font-size="${size}" fill="${fill}" text-anchor="middle" font-family="Manrope,sans-serif" font-weight="800">${txt}</text>`;
  if (kind === "kz") return `<rect x="8" y="8" width="44" height="96" rx="4" fill="#00afca"/><circle cx="30" cy="42" r="11" fill="#fec50c"/>${label("KZ", "#fff")}`;
  if (kind === "by") return `<rect x="12" y="28" width="36" height="22" fill="#c8313e" stroke="#141414" stroke-width="1"/><rect x="12" y="43" width="36" height="7" fill="#4aa657"/><rect x="12" y="28" width="7" height="22" fill="#fff"/>${label("BY", "#141414")}`;
  if (kind === "ua") return `<rect x="8" y="8" width="44" height="96" rx="4" fill="#0057b7"/><rect x="13" y="26" width="34" height="11" fill="#0057b7" stroke="#fff" stroke-width="1.5"/><rect x="13" y="37" width="34" height="11" fill="#ffd700" stroke="#fff" stroke-width="1.5"/>${label("UA", "#fff")}`;
  let stars = "";
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    stars += `<circle cx="${fx(30 + 13 * Math.sin(a))}" cy="${fx(40 - 13 * Math.cos(a))}" r="2.2" fill="#ffcc00"/>`;
  }
  return `<rect x="8" y="8" width="44" height="96" rx="4" fill="#003399"/>${stars}${label("D", "#fff", 24, 94)}`;
}

function plateUS(p: DraftPlate, hits: Hits): string {
  const groups: Cell[][] = [
    slots(p.l, 3).map((c) => ({ ch: c, part: "l" as Part, hit: hits.has("l") })),
    slots(p.d, 4).map((c) => ({ ch: c, part: "d" as Part, hit: hits.has("d") })),
  ];
  const { h, g } = rowLayout(groups, 22, 278, 110, 52, 27, 32, 18);
  const font = `font-family="Manrope,sans-serif" font-weight="800"`;
  return `<svg class="psvg" viewBox="0 0 300 150" role="img" aria-label="${aria(`${p.l ?? ""} ${p.d ?? ""} ${p.r}`)}"><rect width="300" height="150" rx="14" fill="#1e3a8a"/><rect x="4" y="4" width="292" height="142" rx="11" fill="#fdfeff"/>` +
    `<text x="150" y="38" font-size="26" fill="#c81e3a" text-anchor="middle" ${font} font-style="italic">${esc(p.r)}</text>` +
    `<g class="hls">${h}</g><g fill="#1e3a8a">${g}</g><text x="150" y="134" font-size="11" fill="#1e3a8a" text-anchor="middle" ${font} letter-spacing="2.5">${esc(US_SLOGANS[p.r] ?? "USA")}</text></svg>`;
}

function plateEU(p: DraftPlate, hits: Hits): string {
  const mk = (arr: (string | null)[], part: Part): Cell[] => arr.map((c) => ({ ch: c, part, hit: hits.has(part) }));
  let groups: Cell[][], x1 = 510, extra = "";
  if (p.c === "kz") {
    groups = [mk(slots(p.d, 3), "d"), mk(slots(p.l, 3), "l")];
    x1 = 428;
    extra = `<line x1="436" y1="10" x2="436" y2="102" stroke="#141414" stroke-width="3"/>` +
      (hits.has("r") ? `<g class="hls">${hl(476, 52, 32, 50)}</g>` : "") +
      `<g fill="#141414">${ch(476, 82, 70, 52, p.r, "r")}</g>`;
  } else if (p.c === "by") {
    groups = [mk(slots(p.d, 4), "d"), mk(slots(p.l, 2), "l").concat([{ ch: "-", part: "x" }], mk([p.r], "r"))];
  } else if (p.c === "ua") {
    groups = [mk([...p.r], "r"), mk(slots(p.d, 4), "d"), mk(slots(p.l, 2), "l")];
  } else {
    groups = [mk([...p.r], "r"), [{ seals: true }], mk(slots(p.l, 2), "l"), mk(slots(p.d, p.d ? p.d.length : 3), "d")];
  }
  const { h, g } = rowLayout(groups, 62, x1, 87, 58, 36, 42, 20);
  return `<svg class="psvg" viewBox="0 0 520 112" role="img" aria-label="${aria(`${p.r} ${p.d ?? ""} ${p.l ?? ""}`)}"><rect width="520" height="112" rx="10" fill="#141414"/><rect x="4" y="4" width="512" height="104" rx="7" fill="#fbfbf9"/>${sideStrip(p.c)}` +
    `<g class="hls">${h}</g><g fill="#141414">${g}</g>${extra}</svg>`;
}

/** SVG номера. hits — подсвеченные части: d, l, r. */
export function plateSVG(p: DraftPlate, hits: Hits = new Set()): string {
  if (p.c === "ru") return plateRU(p, hits);
  if (p.c === "us") return plateUS(p, hits);
  return plateEU(p, hits);
}

/** Номер в обёртке, задающей ширину (номер США уже европейского). */
export const plateBox = (p: DraftPlate, hits?: Hits) => `<div class="pw${p.c === "us" ? " small-us" : ""}">${plateSVG(p, hits)}</div>`;
