import { CARS, OFFERS, type OfferDef } from "../../config/cars";
import { COUNTRIES, COUNTRY_ORDER } from "../../config/countries";
import * as G from "../../core/game";
import { hasKey, t, type I18nKey } from "../../i18n";
import type { App, Page } from "../app";
import { esc } from "../dom";
import { carName, countryName } from "../format";
import { ICON } from "../icons";
import { plateBox } from "../plates";
import { cashSound } from "../sound";

/** Неразрывный дефис в названиях вроде «ВАЗ-2109». */
const nb = (s: string) => esc(s).replace(/-/g, "‑");

function offerCard(app: App, o: OfferDef): string {
  const { s } = app;
  const got = G.offerOwned(s, o), prog = s.offers[o.id] ?? 0;
  const ad = `<span class="ad">${esc(t("ad.label"))}</span>`;
  let btn: string;
  if (got) btn = `<button class="wide" type="button" disabled>${esc(t("shop.owned"))}</button>`;
  else if (o.price) btn = `<button class="wide" data-act="offerBuy" data-offer="${o.id}" type="button"${s.money < o.price ? " disabled" : ""}>${esc(t("shop.buy", { price: app.money(o.price) }))}</button>`;
  else btn = `<button class="wide" data-act="offerAd" data-offer="${o.id}" type="button">${ad}${esc((o.ads ?? 1) > 1 ? t("shop.watchN", { n: prog, total: o.ads! }) : t("shop.watch"))}</button>`;
  const title = t(`offer.${o.id}` as I18nKey);
  const imgs = o.cars.map((id) => {
    const car = CARS.find((c) => c.id === id)!;
    return `<img src="${esc(import.meta.env.BASE_URL + car.img)}" alt="${esc(carName(id))}" draggable="false">`;
  }).join("");
  const badgeKey = `offer.badge.${o.id}`;
  const badge = hasKey(badgeKey) ? t(badgeKey) : "";
  return `<article class="offer"><div class="offer-head h-${o.head}">${nb(title)}</div><div class="offer-art">` +
    `<div class="offer-title">${nb(title)}</div>` +
    ((o.ads ?? 0) > 1 && !got ? `<div class="offer-note">${t("shop.note", { n: o.ads! })}</div>` : "") +
    `<div class="cars${o.cars.length > 1 ? " two" : ""}">${imgs}</div>` +
    (badge ? `<span class="offer-badge">${esc(badge)}</span>` : "") +
    (o.adBonus && !got ? `<div class="offer-bonus"><i class="bill" aria-hidden="true"></i><span>${esc(t("shop.adBonus"))}<b>+${esc(app.money(o.adBonus))}</b></span></div>` : "") +
    `</div><div class="offer-foot">${btn}</div></article>`;
}

/** Карточки стран — в магазине и в окне выбора страны. */
export function countryCards(app: App): string {
  const { s } = app;
  return COUNTRY_ORDER.map((id) => {
    const c = COUNTRIES[id], open = s.unlocked.includes(id), cur = s.country === id;
    const btn = cur ? `<span class="own">${esc(t("shop.selected"))}</span>`
      : open ? `<button class="wide green" data-act="selectCountry" data-country="${id}" type="button">${esc(t("shop.select"))}</button>`
      : `<button class="wide" data-act="unlockCountry" data-country="${id}" type="button"${s.money < c.unlock ? " disabled" : ""}>${esc(t("shop.unlock", { price: app.money(c.unlock) }))}</button>`;
    return `<div class="ccountry${cur ? " cur" : ""}"><div class="row"><span class="flagdot" style="background:${c.flag}"></span><b>${esc(countryName(id))}</b></div>` +
      `<span class="meta">${esc(t("shop.currency", { symbol: c.currency, name: t(`currency.${id}` as I18nKey) }))}${c.mult > 1 ? esc(t("shop.pricier", { mult: c.mult })) : ""}</span>` +
      `${plateBox({ c: id, ...c.sample })}${btn}</div>`;
  }).join("");
}

function render(app: App): string {
  return app.header("shop", t("shop.title"), `<span class="pill">${ICON.wallet}${esc(app.money(app.s.money))}</span>`) +
    `<div class="offer-grid">${OFFERS.map((o) => offerCard(app, o)).join("")}</div>` +
    `<div class="sec-t">${esc(t("shop.countries"))}</div><div class="shop-grid">${countryCards(app)}</div>`;
}

function granted(app: App, offerId: string): void {
  const o = OFFERS.find((x) => x.id === offerId)!;
  app.ui.garageIdx = Math.max(0, G.ownedCars(app.s).findIndex((c) => c.id === o.cars[0]));
  cashSound();
  app.toast(t("toast.carsGranted", { cars: o.cars.map(carName).join(t("toast.and")) }));
}

export const shopPage: Page = {
  render,
  actions: {
    offerAd: (app, el) => {
      const id = el.dataset.offer!;
      void app.rewarded(() => {
        const r = G.offerAdWatched(app.s, id);
        if (!r) return;
        const o = OFFERS.find((x) => x.id === id)!;
        if (r.granted) granted(app, id);
        else app.toast(r.bonus
          ? t("toast.adProgressBonus", { n: r.progress, total: o.ads!, bonus: app.money(r.bonus) })
          : t("toast.adProgress", { n: r.progress, total: o.ads! }));
      });
    },
    offerBuy: (app, el) => {
      const id = el.dataset.offer!;
      if (!G.buyOffer(app.s, id)) return app.toast(t("toast.noMoney"));
      granted(app, id);
      app.render();
    },
  },
};
