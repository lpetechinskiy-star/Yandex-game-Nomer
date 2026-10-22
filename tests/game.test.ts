import { describe, expect, it } from "vitest";
import { ECONOMY, TIMERS } from "../src/config/economy";
import { DAILY_BONUS } from "../src/config/bonus";
import * as G from "../src/core/game";
import { genDigits } from "../src/core/plate";
import { seeded } from "../src/core/random";
import { newGame, restore } from "../src/core/state";
import { COUNTRIES } from "../src/config/countries";

describe("генерация номеров", () => {
  it("немецкие номера: 1–4 цифры, без ведущего нуля", () => {
    const rng = seeded(1);
    const lens = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const d = genDigits(COUNTRIES.de, rng);
      expect(d).toMatch(/^[1-9]\d{0,3}$/);
      lens.add(d.length);
    }
    expect([...lens].sort()).toEqual([1, 2, 3, 4]);
  });

  it("российские номера никогда не 000", () => {
    const rng = seeded(2);
    for (let i = 0; i < 5000; i++) expect(genDigits(COUNTRIES.ru, rng)).not.toBe("000");
  });
});

describe("игровые действия", () => {
  it("прокрутка списывает деньги, бесплатная — нет", () => {
    const s = newGame(seeded(3));
    expect(G.paySpin(s)).toBe(true);
    expect(s.money).toBe(ECONOMY.startMoney - ECONOMY.spinCost);
    s.freeSpins = 1;
    expect(G.paySpin(s)).toBe(true);
    expect(s.money).toBe(ECONOMY.startMoney - ECONOMY.spinCost);
    s.money = 0;
    expect(G.paySpin(s)).toBe(false);
  });

  it("сохранение в инвентарь даёт очки сезона и сбрасывает номер", () => {
    const s = newGame(seeded(4));
    s.cur = { c: "ru", d: "777", l: "АВЕ", r: "01" };
    expect(G.saveCurrent(s)).toBe(60);
    expect(s.season.points).toBe(60);
    expect(s.inv).toHaveLength(1);
    expect(s.cur.d).toBeNull();
  });

  it("установка на машину умножает очки на класс", () => {
    const s = newGame(seeded(5));
    s.cars["merc"] = { plate: null };
    s.activeCar = "merc";
    s.cur = { c: "ru", d: "777", l: "АВЕ", r: "01" };
    const res = G.installCurrent(s)!;
    expect(res.points).toBe(Math.round(60 * 2.2));
    expect(s.cars["merc"].plate?.d).toBe("777");
  });

  it("ежедневный бонус: серия и сброс после пропуска", () => {
    const s = newGame(seeded(6));
    let now = 1_000_000_000_000;
    expect(G.claimBonus(s, now)).toBe(DAILY_BONUS[0]);
    expect(G.claimBonus(s, now + 1000)).toBeNull();
    now += TIMERS.bonusPeriodMs;
    expect(G.claimBonus(s, now)).toBe(DAILY_BONUS[1]);
    now += TIMERS.bonusStreakResetMs + 1;
    expect(G.claimBonus(s, now)).toBe(DAILY_BONUS[0]);
  });

  it("Mercedes выдаётся после 3 реклам, за каждую +2 500 ₽", () => {
    const s = newGame(seeded(7));
    const m0 = s.money;
    expect(G.offerAdWatched(s, "merc")!.granted).toBe(false);
    expect(G.offerAdWatched(s, "merc")!.granted).toBe(false);
    expect(G.offerAdWatched(s, "merc")!.granted).toBe(true);
    expect(s.money).toBe(m0 + 3 * 2500);
    expect(s.cars["merc"]).toBeDefined();
    expect(G.offerAdWatched(s, "merc")).toBeNull();
  });

  it("рулетка: раз в 8 часов или после 2 реклам", () => {
    const s = newGame(seeded(8));
    const now = 2_000_000_000_000;
    expect(G.startWheel(s, now, seeded(1))).not.toBeNull();
    expect(G.startWheel(s, now + 1000, seeded(1))).toBeNull();
    G.wheelAdWatched(s);
    G.wheelAdWatched(s);
    expect(G.startWheel(s, now + 2000, seeded(1))).not.toBeNull();
    expect(s.wheel.ads).toBe(0);
  });

  it("награда за оценку выдаётся один раз", () => {
    const s = newGame(seeded(9));
    expect(G.rewardReview(s)).toBe(true);
    expect(G.rewardReview(s)).toBe(false);
    expect(s.money).toBe(ECONOMY.startMoney + ECONOMY.reviewReward);
  });
});

describe("сохранение", () => {
  it("состояние переживает JSON и восстановление", () => {
    const s = newGame(seeded(10));
    s.money = 12345;
    s.inv.push({ c: "ru", d: "777", l: "ЕКХ", r: "77", x2: true, id: 99 });
    const r = restore(JSON.parse(JSON.stringify(s)), seeded(11))!;
    expect(r.money).toBe(12345);
    expect(r.inv[0]).toEqual(s.inv[0]);
    expect(r.uid).toBeGreaterThan(99);
    expect(r.orders.map((o) => o.id)).toEqual(s.orders.map((o) => o.id));
  });

  it("битое сохранение не ломает игру", () => {
    expect(restore("мусор", seeded(1))).toBeNull();
    const r = restore({ v: 1, money: "много", inv: [{ c: "xx" }], country: "de" }, seeded(1))!;
    expect(r.money).toBe(ECONOMY.startMoney);
    expect(r.inv).toEqual([]);
    expect(r.country).toBe("ru");
  });
});
