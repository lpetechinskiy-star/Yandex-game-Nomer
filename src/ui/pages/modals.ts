import { COUNTRIES } from "../../config/countries";
import * as G from "../../core/game";
import { t } from "../../i18n";
import type { Action, App } from "../app";
import { esc } from "../dom";
import { cityName } from "../format";
import { countryCards } from "./shop";

function regionBody(app: App): string {
  const c = COUNTRIES[app.s.country];
  const pts = (r: string) => c.prestige[r]?.pts ?? 0;
  const list = [...c.regions].sort((a, b) => pts(b) - pts(a));
  return `<p class="meta">${esc(t("modal.regionHint"))}</p><div class="regions">` + list.map((r) => {
    const pr = c.prestige[r];
    const sub = pr ? `${esc(t("modal.regionPrem", { city: cityName(pr.city), n: pr.pts }))}<br>${esc(app.money(G.regionCost(c.id, r)))}` : esc(t("modal.regionFree"));
    return `<button class="reg${pr ? " prem" : ""}${app.s.cur.r === r ? " cur" : ""}" data-act="region" data-reg="${esc(r)}" type="button">${esc(r)}<small>${sub}</small></button>`;
  }).join("") + `</div>`;
}

export function renderModal(app: App, root: HTMLElement): void {
  const m = app.ui.modal;
  if (!m) {
    root.innerHTML = "";
    return;
  }
  const title = t(m === "region" ? "modal.region" : "modal.country");
  const body = m === "region" ? regionBody(app)
    : `<p class="meta">${esc(t("modal.countryHint"))}</p><div class="shop-grid">${countryCards(app)}</div>`;
  const prevScroll = root.querySelector(".win-body")?.scrollTop ?? 0;
  root.innerHTML = `<div class="modal" data-act="close"><div class="win" role="dialog" aria-modal="true" aria-label="${esc(title)}">` +
    `<div class="win-head"><h2>${esc(title)}</h2><button class="x" data-act="close" type="button" aria-label="${esc(t("app.close"))}">×</button></div>` +
    `<div class="win-body">${body}</div></div></div>`;
  const wb = root.querySelector(".win-body");
  if (wb) wb.scrollTop = prevScroll;
}

export const modalActions: Record<string, Action> = {
  region: (app, el) => {
    const res = G.selectRegion(app.s, el.dataset.reg!);
    if (res === "broke") return app.toast(t("toast.regionBroke"));
    app.ui.modal = null;
    app.ui.armed = null;
    app.render();
  },
};
