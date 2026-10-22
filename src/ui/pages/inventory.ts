import { ECONOMY } from "../../config/economy";
import { TIERS } from "../../config/rarity";
import { evaluate } from "../../core/evaluate";
import * as G from "../../core/game";
import { t } from "../../i18n";
import type { App, Page } from "../app";
import { esc } from "../dom";
import { buyerName, carName, countryName, tierName } from "../format";
import { ICON } from "../icons";
import { plateBox } from "../plates";
import { beep, cashSound } from "../sound";

function render(app: App): string {
  const { s } = app;
  let h = app.header("inv", t("inv.title"), `<button class="wbtn" data-act="go" data-page="create" type="button">${ICON.plus}${esc(t("nav.create"))}</button>`) +
    `<div class="box statbar"><div>${t("inv.count", { n: `<b>${s.inv.length}</b>`, max: ECONOMY.inventoryMax })}</div><span>${t("inv.fromWheel", { n: `<b>${s.fromWheel}</b>` })}</span></div>`;
  if (!s.inv.length) return h + `<div class="empty"><h3>${esc(t("inv.empty"))}</h3><p>${esc(t("inv.emptyHint"))}</p></div>`;
  h += `<div class="grid-plates">`;
  for (const it of s.inv) {
    const ev = evaluate(it)!, tier = TIERS[ev.tier], price = G.ownedPrice(it);
    const order = G.profitableOrders(s, ev, price)[0];
    h += `<div class="pcard">${plateBox(it)}<div class="row"><span class="rchip" style="--c:${tier.color}">${esc(tierName(ev.tier))}</span>` +
      `<span class="meta">${esc(t("pts", { n: ev.score }))} · ${esc(countryName(it.c))}</span><span class="val push">${esc(app.money(price))}</span></div>` +
      `<div class="row">${order ? `<button class="mbtn go" data-act="invGive" data-id="${it.id}" data-order="${order.id}" type="button" title="${esc(buyerName(order.buyer))}">${esc(t("inv.give", { reward: app.money(order.reward) }))}</button>` : ""}` +
      `<button class="mbtn" data-act="invInstall" data-id="${it.id}" type="button">${esc(t("inv.install"))}</button>` +
      `<button class="mbtn" data-act="invSell" data-id="${it.id}" type="button">${esc(t("inv.sell"))}</button></div></div>`;
  }
  return h + `</div>`;
}

export const inventoryPage: Page = {
  render,
  actions: {
    invSell: (app, el) => {
      const price = G.sellInventory(app.s, Number(el.dataset.id));
      if (price === null) return;
      cashSound();
      app.toast(t("toast.sold", { price: app.money(price) }));
      app.render();
      app.interstitial();
    },
    invInstall: (app, el) => {
      if (!app.s.activeCar) {
        app.toast(t("toast.needCar"));
        return app.go("shop");
      }
      const res = G.installFromInventory(app.s, Number(el.dataset.id));
      if (!res) return;
      beep(660, 0.1, "triangle", 0.05);
      let msg = t("toast.installed", { car: carName(res.car.id) });
      if (res.soldOld !== null) msg += ` · ${t("toast.oldSold", { price: app.money(res.soldOld) })}`;
      app.toast(msg);
      app.render();
    },
    invGive: (app, el) => {
      const o = G.giveInventory(app.s, Number(el.dataset.id), Number(el.dataset.order), app.rng);
      if (!o) return;
      cashSound();
      app.toast(t("toast.orderDone", { reward: app.money(o.reward), buyer: buyerName(o.buyer) }));
      app.render();
      app.interstitial();
    },
  },
};
