import { COUNTRIES } from "../../config/countries";
import { ECONOMY } from "../../config/economy";
import { TAGS, TIERS } from "../../config/rarity";
import { hitParts } from "../../core/evaluate";
import * as G from "../../core/game";
import { withX2 } from "../../core/price";
import { t } from "../../i18n";
import type { App, Page } from "../app";
import { $, esc, reducedMotion } from "../dom";
import { celebrate } from "../fx";
import { buyerName, carName, countryName, odds, tagLabel, tierName } from "../format";
import { ICON } from "../icons";
import { plateBox } from "../plates";
import { beep, cashSound } from "../sound";

const oddsOf = (key: string) => TAGS.find((x) => x.key === key)?.odds ?? null;

let armTimer: ReturnType<typeof setTimeout> | undefined;

function disarm(app: App): void {
  app.ui.armed = null;
  clearTimeout(armTimer);
}

const AD = () => `<span class="ad">${esc(t("ad.label"))}</span>`;

function render(app: App): string {
  const { s, ui } = app;
  const spinning = ui.spinning;
  // Во время прокрутки крутящаяся часть показана заглушками, результат не раскрываем.
  const shown = spinning ? { ...s.cur, [spinning]: null } : s.cur;
  const ev = spinning ? null : G.currentEval(s);
  const tier = ev ? TIERS[ev.tier] : null;
  const c = COUNTRIES[s.country];
  const price = ev ? withX2(ev.price, s.x2) : 0;
  const cost = s.freeSpins > 0 ? t("create.free") : app.money(ECONOMY.spinCost);
  const spinLabel = (p: "d" | "l") => (ui.armed === p ? t("create.sure") : cost);
  const dis = spinning ? " disabled" : "";

  let tags: string;
  if (spinning) tags = `<p class="hintline">${esc(t("create.spinning"))}</p>`;
  else if (!ev) {
    const hint = !s.cur.d && !s.cur.l ? "create.hint.both" : !s.cur.d ? "create.hint.digits" : "create.hint.letters";
    tags = `<p class="hintline">${esc(t(hint))}</p>`;
  } else {
    tags = `<div class="tagline">${ev.tags.map((x) => {
      const o = odds(oddsOf(x.key));
      return `<span>${esc(tagLabel(x, s.cur.r))} <b>+${x.pts}</b><small>${esc(o)}</small></span>`;
    }).join("")}<span class="worth">${esc(t("create.worth", { price: app.money(price) }))}${s.x2 ? " · ×2" : ""}</span></div>`;
  }

  const orderBtns = ev
    ? G.profitableOrders(s, ev, price).map((o) =>
      `<button class="mbtn go" data-act="giveCur" data-order="${o.id}" type="button">${esc(t("create.give", { buyer: buyerName(o.buyer), reward: app.money(o.reward) }))}</button>`).join("")
    : "";

  return app.header("create", t("create.title"),
    `<button class="wbtn" data-act="modal" data-modal="country" type="button"><span class="flagdot" style="background:${c.flag}"></span>${esc(countryName(c.id))}</button>` +
    `<button class="wbtn" data-act="go" data-page="rating" type="button">${ICON.rating}${esc(t("nav.rating"))}</button>`) +
    `<div class="rar">${esc(t("create.rarity"))} <span class="rchip" style="--c:${tier ? tier.color : "var(--muted)"}">${tier ? esc(tierName(ev!.tier)) : "—"}</span></div>` +
    `<div class="plate-zone${s.cur.c === "us" ? " us-zone" : ""}" id="pzone"><div class="frame" id="frame" style="--tier:${tier ? tier.color : "var(--blue)"}">${plateBox(shown, ev ? hitParts(ev) : undefined)}</div></div>${tags}` +
    `<div class="sep"></div>` +
    `<div class="cash">${ICON.wallet}<span>${esc(t("create.cash"))}</span>${s.freeSpins ? `<span class="free">${esc(t("create.freeSpins", { n: s.freeSpins }))}</span>` : ""}<span class="amt">${esc(app.money(s.money))}</span></div>` +
    `<div class="cards3">` +
    `<div class="ccard"><h3>${esc(t("create.spinDigits"))}</h3><button class="lbtn${ui.armed === "d" ? " armed" : ""}" data-act="spin" data-part="d" type="button"${dis}>${esc(spinLabel("d"))}</button></div>` +
    `<div class="ccard"><h3>${esc(t("create.spinLetters"))}</h3><button class="lbtn${ui.armed === "l" ? " armed" : ""}" data-act="spin" data-part="l" type="button"${dis}>${esc(spinLabel("l"))}</button></div>` +
    `<div class="ccard"><h3>${esc(t("create.region"))}</h3><button class="bbtn" data-act="modal" data-modal="region" type="button"${dis}>${esc(t("create.change"))} <span class="rg">${esc(s.cur.r)}</span></button></div>` +
    `</div>` +
    `<div class="duo"><button class="act blue" data-act="installCur" type="button"${ev ? "" : " disabled"}>${ICON.car}${esc(t("create.install"))}</button>` +
    `<button class="act green" data-act="saveCur" type="button"${ev && !G.inventoryFull(s) ? "" : " disabled"}>${ICON.box}${esc(t("create.save"))}</button></div>` +
    `<div class="minor">${orderBtns}` +
    (ev ? `<button class="mbtn" data-act="sellCur" type="button">${esc(t("create.sell", { price: app.money(price) }))}</button>` : "") +
    (ev && !s.x2 && ev.score > 0 ? `<button class="mbtn" data-act="x2Ad" type="button">${AD()}${esc(t("create.x2"))}</button>` : "") +
    `<button class="mbtn" data-act="freeSpinAd" type="button"${dis}>${AD()}${esc(t("create.freeSpin"))}</button></div>`;
}


/** Прокрутка цифр или букв с анимацией перебора символов. */
async function spin(app: App, part: "d" | "l"): Promise<void> {
  const { s, ui } = app;
  if (ui.spinning) return;
  if (G.needsSpinConfirm(s) && ui.armed !== part) {
    ui.armed = part;
    app.render();
    clearTimeout(armTimer);
    armTimer = setTimeout(() => {
      ui.armed = null;
      app.render();
    }, ECONOMY.rareConfirmMs);
    return;
  }
  disarm(app);
  if (!G.paySpin(s)) {
    app.toast(t("toast.broke"));
    app.render();
    return;
  }
  // Результат известен сразу и сохраняется: перезагрузка во время анимации ничего не меняет.
  const ev = G.applySpin(s, part, app.rng);
  ui.spinning = part;
  app.render();

  const els = [...($("frame")?.querySelectorAll<SVGTextElement>(`.ch[data-p="${part}"]`) ?? [])];
  const pool = part === "d" ? "0123456789" : COUNTRIES[s.country].alphabet;
  const fast = reducedMotion();
  await Promise.all(els.map((el, i) => new Promise<void>((res) => {
    el.classList.remove("pph");
    el.classList.add("rolling");
    const iv = setInterval(() => { el.textContent = pool[Math.floor(Math.random() * pool.length)]; }, 55);
    setTimeout(() => {
      clearInterval(iv);
      el.classList.remove("rolling");
      beep(330 + i * 45, 0.04, "square", 0.03);
      res();
    }, (fast ? 150 : 420) + i * (fast ? 60 : 170));
  })));

  ui.spinning = null;
  app.render();
  if (ev && ev.tier >= 1 && ui.page === "create") celebrate(ev.tier);
}

export const createPage: Page = {
  render,
  actions: {
    spin: (app, el) => void spin(app, el.dataset.part as "d" | "l"),
    sellCur: (app) => {
      const price = G.sellCurrent(app.s);
      if (price === null) return;
      disarm(app);
      cashSound();
      app.toast(t("toast.sold", { price: app.money(price) }));
      app.render();
      app.interstitial();
    },
    saveCur: (app) => {
      if (G.inventoryFull(app.s)) return app.toast(t("toast.invFull"));
      const pts = G.saveCurrent(app.s);
      if (pts === null) return;
      disarm(app);
      app.toast(t("toast.saved", { n: pts }));
      app.render();
    },
    installCur: (app) => {
      if (!app.s.activeCar) {
        app.toast(t("toast.needCar"));
        return app.go("shop");
      }
      const res = G.installCurrent(app.s);
      if (!res) return;
      disarm(app);
      beep(660, 0.1, "triangle", 0.05);
      let msg = t("toast.installedPts", { car: carName(res.car.id), n: res.points });
      if (res.soldOld !== null) msg += ` · ${t("toast.oldSold", { price: app.money(res.soldOld) })}`;
      app.toast(msg);
      app.render();
    },
    giveCur: (app, el) => {
      const o = G.giveCurrent(app.s, Number(el.dataset.order), app.rng);
      if (!o) return;
      disarm(app);
      cashSound();
      app.toast(t("toast.orderDone", { reward: app.money(o.reward), buyer: buyerName(o.buyer) }));
      app.render();
      app.interstitial();
    },
    x2Ad: (app) => void app.rewarded(() => {
      G.applyX2(app.s);
      app.toast(t("toast.x2"));
    }),
    freeSpinAd: (app) => void app.rewarded(() => {
      G.addFreeSpin(app.s);
      app.toast(t("toast.freeSpin"));
    }),
  },
};
