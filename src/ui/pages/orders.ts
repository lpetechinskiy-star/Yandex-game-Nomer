import { ECONOMY } from "../../config/economy";
import { evaluate } from "../../core/evaluate";
import * as G from "../../core/game";
import { orderMatches } from "../../core/orders";
import { t, type I18nKey } from "../../i18n";
import type { App, Page } from "../app";
import { esc } from "../dom";
import { buyerName } from "../format";
import { ICON } from "../icons";

function render(app: App): string {
  const { s } = app;
  const cur = app.ui.spinning ? null : G.currentEval(s);
  const inv = s.inv.map((it) => evaluate(it));
  return app.header("orders", t("orders.title"), `<span class="pill">${ICON.clock}${esc(t("orders.refresh"))}</span>`) +
    `<div class="stack">` + s.orders.map((o) => {
      const now = orderMatches(o, cur), inInv = inv.some((e) => orderMatches(o, e));
      const status = now ? `<span class="ok">${esc(t("orders.readyCurrent"))}</span>`
        : inInv ? `<span class="ok">${esc(t("orders.readyInv"))}</span>`
        : `<span class="meta">${esc(t("orders.notReady"))}</span>`;
      return `<div class="order${now || inInv ? " ready" : ""}"><div class="row"><span class="o-buyer">${esc(buyerName(o.buyer))}</span><span class="val push">${esc(app.money(o.reward))}</span></div>` +
        `<p class="o-text">${esc(t(`order.${o.tid}` as I18nKey))}</p>` +
        `<div class="row">${status}<button class="mbtn push" data-act="replaceOrder" data-order="${o.id}" type="button">${esc(t("orders.replace", { cost: app.money(ECONOMY.replaceOrderCost) }))}</button></div></div>`;
    }).join("") + `</div>`;
}

export const ordersPage: Page = {
  render,
  actions: {
    replaceOrder: (app, el) => {
      if (!G.replaceOrder(app.s, Number(el.dataset.order), app.rng)) return app.toast(t("toast.noMoney"));
      app.render();
    },
  },
};
