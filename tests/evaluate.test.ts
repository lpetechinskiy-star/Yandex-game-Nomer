import { describe, expect, it } from "vitest";
import type { CountryId } from "../src/config/countries";
import { POINTS } from "../src/config/rarity";
import { evaluate, hitParts, tierOf } from "../src/core/evaluate";
import { priceFor } from "../src/core/price";

const ev = (c: CountryId, d: string, l: string, r: string) => evaluate({ c, d, l, r })!;
const ru = (d: string, l = "АВЕ", r = "01") => ev("ru", d, l, r);
const keys = (e: ReturnType<typeof ev>) => [...e.keys].sort();
const pts = (e: ReturnType<typeof ev>, key: string) => e.tags.find((t) => t.key === key)?.pts;

describe("evaluate: недокрученный номер", () => {
  it("без цифр или букв возвращает null", () => {
    expect(evaluate({ c: "ru", d: null, l: "АВЕ", r: "01" })).toBeNull();
    expect(evaluate({ c: "ru", d: "777", l: null, r: "01" })).toBeNull();
  });
});

describe("evaluate: обычный номер", () => {
  it("без находок — 0 очков, обычная редкость, минимальная цена", () => {
    const e = ru("482");
    expect(e.tags).toEqual([]);
    expect(e.score).toBe(0);
    expect(e.tier).toBe(0);
    expect(e.price).toBe(priceFor(0, "ru"));
  });
});

describe("evaluate: семёрки и одинаковые цифры", () => {
  it("777 — три семёрки, легендарный", () => {
    const e = ru("777");
    expect(keys(e)).toEqual(["seven"]);
    expect(e.score).toBe(POINTS.seven3);
    expect(e.tier).toBe(4);
    expect(e.tags[0].n).toBe(3);
  });

  it("777 не считается зеркальным и не попадает в «одинаковые цифры»", () => {
    const e = ru("777");
    expect(e.keys.has("mirrorD")).toBe(false);
    expect(e.keys.has("sameD")).toBe(false);
  });

  it("7777 (Беларусь) — четыре семёрки", () => {
    const e = ev("by", "7777", "AB", "3");
    expect(keys(e)).toEqual(["seven"]);
    expect(e.score).toBe(POINTS.seven4);
  });

  it("222 — одинаковые цифры", () => {
    const e = ru("222");
    expect(keys(e)).toEqual(["sameD"]);
    expect(e.score).toBe(POINTS.sameD);
  });

  it("5555 — одинаковые цифры, 4 знака", () => {
    expect(pts(ev("ua", "5555", "AB", "AI"), "sameD")).toBe(POINTS.sameD4);
  });
});

describe("evaluate: первая десятка, 007, круглые", () => {
  it("001 — первая десятка", () => {
    const e = ru("001");
    expect(keys(e)).toEqual(["first10"]);
    expect(e.score).toBe(POINTS.first10_3);
  });

  it("009 — первая десятка, 010 — уже нет", () => {
    expect(ru("009").keys.has("first10")).toBe(true);
    expect(ru("010").keys.has("first10")).toBe(false);
  });

  it("007 — первая десятка плюс «Агент 007»", () => {
    const e = ru("007");
    expect(keys(e)).toEqual(["bond", "first10"]);
    expect(e.score).toBe(POINTS.first10_3 + POINTS.bond);
  });

  it("0007 — первая десятка (4 цифры) плюс «Агент 007»", () => {
    const e = ev("by", "0007", "AB", "3");
    expect(keys(e)).toEqual(["bond", "first10"]);
    expect(e.score).toBe(POINTS.first10_4 + POINTS.bond);
  });

  it("0042 — первая сотня (только 4 цифры)", () => {
    const e = ev("by", "0042", "AB", "3");
    expect(keys(e)).toEqual(["first100"]);
    expect(e.score).toBe(POINTS.first100);
  });

  it("100 и 3000 — круглые", () => {
    expect(keys(ru("100"))).toEqual(["round"]);
    expect(keys(ev("by", "3000", "AB", "3"))).toEqual(["round"]);
  });
});

describe("evaluate: лесенки", () => {
  it.each(["123", "789", "987", "321"])("%s — лесенка из 3 цифр", (d) => {
    const e = ru(d);
    expect(keys(e)).toEqual(["ladder"]);
    expect(e.score).toBe(POINTS.ladder3);
  });

  it.each(["4567", "6543", "0123"])("%s — лесенка из 4 цифр", (d) => {
    const e = ev("by", d, "AB", "3");
    expect(e.keys.has("ladder")).toBe(true);
    expect(pts(e, "ladder")).toBe(POINTS.ladder4);
  });

  it("124 и 135 — не лесенки", () => {
    expect(ru("124").keys.has("ladder")).toBe(false);
    expect(ru("135").keys.has("ladder")).toBe(false);
  });

  it("890 — не лесенка (после 9 не идёт 0)", () => {
    expect(ru("890").keys.has("ladder")).toBe(false);
  });
});

describe("evaluate: зеркальные", () => {
  it("121 — зеркальные цифры", () => {
    const e = ru("121");
    expect(keys(e)).toEqual(["mirrorD"]);
    expect(e.score).toBe(POINTS.mirror3);
  });

  it("4554 — зеркальные цифры, 4 знака", () => {
    expect(pts(ev("by", "4554", "AB", "3"), "mirrorD")).toBe(POINTS.mirror4);
  });

  it("4545 — не зеркальные", () => {
    expect(ev("by", "4545", "AB", "3").keys.has("mirrorD")).toBe(false);
  });

  it("199 и регион 199 — «цифры = регион» плюс статусный регион", () => {
    const e = ru("199", "АВЕ", "199");
    expect(keys(e)).toEqual(["mirrorR", "region"]);
    expect(e.score).toBe(POINTS.mirrorR + 10);
    expect(hitParts(e)).toEqual(new Set(["d", "r"]));
  });

  it("зеркальные цифры и статусный регион — подходят для заказа «mirReg»", () => {
    const e = ru("353", "АВЕ", "77");
    expect(keys(e)).toEqual(["mirrorD", "region"]);
  });
});

describe("evaluate: буквы и блатные серии", () => {
  it.each(["ЕКХ", "АМР", "ВОР", "КМР", "ОМР"])("%s — блатная серия", (l) => {
    const e = ru("482", l);
    expect(keys(e)).toEqual(["blat"]);
    expect(e.score).toBe(POINTS.blat);
    expect(hitParts(e)).toEqual(new Set(["l"]));
  });

  it("АВР — не блатная серия", () => {
    expect(ru("482", "АВР").keys.has("blat")).toBe(false);
  });

  it("блатные серии есть только в России", () => {
    expect(ev("kz", "482", "EKX", "05").keys.has("blat")).toBe(false);
  });

  it("ООО — одинаковые буквы", () => {
    const e = ru("482", "ООО");
    expect(keys(e)).toEqual(["sameL"]);
    expect(e.score).toBe(POINTS.sameL3);
  });

  it("MM (Беларусь, 2 буквы) — одинаковые буквы, меньше очков", () => {
    expect(pts(ev("by", "4821", "MM", "3"), "sameL")).toBe(POINTS.sameL2);
  });

  it("777 ООО — полный комплект", () => {
    const e = ru("777", "ООО");
    expect(keys(e)).toEqual(["combo", "sameL", "seven"]);
    expect(e.score).toBe(POINTS.seven3 + POINTS.sameL3 + POINTS.combo);
  });
});

describe("evaluate: статусные регионы", () => {
  it.each([
    ["77", 15, "moscow"],
    ["777", 30, "moscow"],
    ["78", 10, "spb"],
    ["750", 8, "moscowRegion"],
  ])("Россия, регион %s — +%i очков (%s)", (r, p, city) => {
    const e = ru("482", "АВЕ", r);
    expect(keys(e)).toEqual(["region"]);
    expect(e.score).toBe(p);
    expect(e.tags[0].city).toBe(city);
  });

  it("регион 01 — обычный", () => {
    expect(ru("482", "АВЕ", "01").keys.has("region")).toBe(false);
  });

  it.each([
    ["by", "4821", "AB", "7", 12],
    ["ua", "4821", "AB", "AA", 12],
    ["kz", "482", "ABC", "02", 12],
    ["de", "4821", "AB", "B", 12],
    ["us", "4821", "ABC", "Nevada", 12],
  ] as const)("%s, регион %s — статусный", (c, d, l, r, p) => {
    expect(pts(ev(c, d, l, r), "region")).toBe(p);
  });

  it("777 ЕКХ 777 — семёрки, блатная серия, Москва 777 и «цифры = регион»", () => {
    const e = ru("777", "ЕКХ", "777");
    expect(keys(e)).toEqual(["blat", "mirrorR", "region", "seven"]);
    expect(e.score).toBe(POINTS.seven3 + POINTS.blat + 30 + POINTS.mirrorR);
  });
});

describe("evaluate: немецкие короткие номера", () => {
  it("M AB 1 — короткий номер, 1 цифра", () => {
    const e = ev("de", "1", "AB", "K");
    expect(keys(e)).toEqual(["short"]);
    expect(e.score).toBe(POINTS.short1);
    expect(e.tags[0].n).toBe(1);
  });

  it("2 цифры — короткий номер поменьше", () => {
    const e = ev("de", "42", "AB", "K");
    expect(keys(e)).toEqual(["short"]);
    expect(e.score).toBe(POINTS.short2);
  });

  it("77 — короткий номер и одинаковые цифры", () => {
    const e = ev("de", "77", "AB", "K");
    expect(keys(e)).toEqual(["sameD", "short"]);
    expect(e.score).toBe(POINTS.short2 + POINTS.sameD);
  });

  it("3 цифры — уже не короткий", () => {
    expect(ev("de", "482", "AB", "K").keys.has("short")).toBe(false);
  });

  it("короткий номер бывает только в Германии", () => {
    expect(ev("by", "0042", "AB", "3").keys.has("short")).toBe(false);
  });

  it("M AB 1 в Мюнхене — короткий номер плюс статусный регион", () => {
    const e = ev("de", "1", "AB", "M");
    expect(keys(e)).toEqual(["region", "short"]);
    expect(e.score).toBe(POINTS.short1 + 12);
  });
});

describe("уровни и цены", () => {
  it("границы уровней редкости", () => {
    expect([0, 4, 5, 14, 15, 34, 35, 59, 60, 200].map(tierOf)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("цена растёт квадратично и умножается на коэффициент страны", () => {
    expect(priceFor(0, "ru")).toBe(30);
    expect(priceFor(60, "ru")).toBe(7230);
    expect(priceFor(60, "us")).toBe(13010);
    expect(ru("777").price).toBe(priceFor(60, "ru"));
  });
});
