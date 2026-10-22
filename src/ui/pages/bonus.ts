import { DAILY_BONUS } from "../../config/bonus";
import { COUNTRIES } from "../../config/countries";
import { ECONOMY } from "../../config/economy";
import * as G from "../../core/game";
import { t } from "../../i18n";
import type { App, Page } from "../app";
import { esc } from "../dom";
import { fmtTime } from "../format";
import { ICON } from "../icons";
import { cashSound } from "../sound";

/** Можно ли сейчас предлагать оценку: проверяется через feedback.canReview при открытии страницы. */
let canReview: boolean | null = null;

function render(app: App): string {
  const { s } = app;
  const now = Date.now(), ready = G.bonusReady(s, now), idx = G.bonusDay(s, now);
  const last = DAILY_BONUS.length - 1;
  const days = DAILY_BONUS.map((v, i) => {
    const done = i < idx, next = i === idx;
    return `<div class="day${done ? " done" : ""}${next ? " next" : ""}${i === last && !next ? " last" : ""}">${esc(t("bonus.day", { n: i + 1 }))}` +
      `<span class="ic">${done ? "✓" : esc(COUNTRIES[s.country].currency)}</span><span class="sum">${esc(app.money(v))}</span></div>`;
  }).join("");
  const claim = ready
    ? `<button class="wide" data-act="claimBonus" type="button">${esc(t("bonus.claim", { amount: app.money(DAILY_BONUS[idx]) }))}</button>`
    : `<div class="grey-line">${t("bonus.next", { time: `<span class="timer" id="bTimer">${fmtTime(G.bonusLeftMs(s, now))}</span>` })}</div><button class="wide" type="button" disabled>${esc(t("bonus.claimed"))}</button>`;
  const reviewOff = s.reviewed || canReview === false;
  return app.header("bonus", t("bonus.title"), `<span class="pill">${ICON.clock}${esc(t("bonus.pill"))}</span>`) +
    `<div class="bonus"><p class="cap">${esc(t("bonus.caption"))}</p><div class="days">${days}</div>${claim}</div>` +
    `<div class="review"><div class="hd">${ICON.star}<div><div class="lab">${esc(t("review.label"))}</div><h3>${esc(t("review.title"))}</h3><p>${esc(t("review.text"))}</p></div></div>` +
    `<div class="ft"><span class="plus">+${esc(app.money(ECONOMY.reviewReward))}</span>` +
    `<button class="wide" data-act="review" type="button"${reviewOff ? " disabled" : ""}>${esc(t(s.reviewed ? "review.done" : "review.button"))}</button></div></div>`;
}

export const bonusPage: Page = {
  render,
  mounted(app) {
    if (canReview !== null || app.s.reviewed) return;
    void app.platform.canReview().then((ok) => {
      canReview = ok;
      if (!ok && app.ui.page === "bonus") app.renderPage();
    });
  },
  actions: {
    claimBonus: (app) => {
      const amount = G.claimBonus(app.s, Date.now());
      if (amount === null) return;
      cashSound();
      app.toast(t("toast.bonus", { amount: app.money(amount) }));
      app.render();
    },
    review: async (app) => {
      if (app.s.reviewed) return;
      if (!(await app.platform.canReview())) {
        canReview = false;
        app.toast(t("toast.reviewUnavailable"));
        return app.render();
      }
      const sent = await app.platform.requestReview();
      canReview = false;
      if (sent && G.rewardReview(app.s)) {
        cashSound();
        app.toast(t("toast.reviewThanks", { amount: app.money(ECONOMY.reviewReward) }));
      }
      app.render();
    },
  },
};
