import { AVATAR_COLORS, RANKS } from "../../config/ranks";
import * as G from "../../core/game";
import { t } from "../../i18n";
import type { LeaderboardEntry } from "../../sdk";
import type { App, Page } from "../app";
import { esc } from "../dom";
import { num, rankName } from "../format";
import { ICON, shield } from "../icons";

const initials = (name: string) => name.replace(/[^A-Za-zА-Яа-яЁё]/g, "").slice(0, 1).toUpperCase() || "?";

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function row(e: LeaderboardEntry): string {
  const name = e.isMe ? e.name || t("rating.you") : e.name || t("rating.anon");
  const rank = RANKS[G.rankIndex(e.score)];
  const podium = e.rank <= 3;
  const color = e.isMe ? "#3170c9" : avatarColor(name);
  return `<div class="lrow${podium ? ` podium p${e.rank}` : ""}${e.isMe ? " me" : ""}"><span class="place">${e.rank}</span>` +
    `<span class="ava" style="background:${color}">${esc(initials(name))}</span>` +
    `<div class="who"><b>${esc(name)}</b><span>${shield(rank.color, 16)}${esc(rankName(G.rankIndex(e.score)))}</span></div>` +
    `<div class="pts">${esc(num(e.score))}<small>${esc(t("rating.points"))}</small></div></div>`;
}

function board(app: App): string {
  const lb = app.ui.leaderboard;
  if (!lb || lb.loading) return `<div class="lb"><p class="lb-msg">${esc(t("rating.loading"))}</p></div>`;
  if (lb.error || !lb.data) return `<div class="lb"><p class="lb-msg">${esc(t("rating.error"))}</p></div>`;
  if (!lb.data.entries.length) return `<div class="lb"><p class="lb-msg">${esc(t("rating.empty"))}</p></div>`;
  return `<div class="lb">${lb.data.entries.map(row).join("")}</div>`;
}

function render(app: App): string {
  const { s, ui } = app;
  const pts = s.season.points, ri = G.rankIndex(pts), r = RANKS[ri], next = RANKS[ri + 1];
  const prog = next ? Math.min(100, Math.round(((pts - r.min) / (next.min - r.min)) * 100)) : 100;
  const login = app.platform.isAuthorized() ? ""
    : `<div class="login"><p>${esc(t("rating.login"))}</p><button class="wide" data-act="login" type="button">${esc(t("rating.loginBtn"))}</button></div>`;
  return app.header("rating", t("rating.title"), `<span class="pill">${ICON.star}${esc(t("rating.pill"))}: ${esc(num(pts))}</span>`) +
    `<div class="tabs2"><button class="${ui.rateTab === "top" ? "on" : ""}" data-act="rtab" data-tab="top" type="button">${esc(t("rating.tabTop"))}</button>` +
    `<button class="${ui.rateTab === "around" ? "on" : ""}" data-act="rtab" data-tab="around" type="button">${esc(t("rating.tabAround"))}</button></div>` +
    `<div class="rank-card">${shield(r.color, 96)}<div><div class="lab">${esc(t("rating.yourRank"))}</div><h3>${esc(rankName(ri))}</h3>` +
    `<div class="prog"><i style="width:${Math.max(3, prog)}%"></i></div>` +
    `<div class="sub">${esc(next ? t("rating.toNext", { pts: num(pts), next: num(next.min), name: rankName(ri + 1) }) : t("rating.max", { pts: num(pts) }))}</div></div>` +
    `<div class="big-num"><b>${s.season.saves}</b><span>${esc(t("rating.saves"))}</span></div></div>` +
    login + board(app) +
    `<p class="meta" style="margin-top:12px">${esc(t("rating.note"))}</p>`;
}

/** Загружает таблицу из лидерборда «prestige». */
async function load(app: App): Promise<void> {
  const mode = app.ui.rateTab;
  app.ui.leaderboard = { mode, data: null, loading: true, error: false };
  // Сначала отправляем свежие очки, чтобы игрок увидел себя на актуальном месте.
  await app.platform.setScore(app.s.season.points);
  const data = await app.platform.getLeaderboard(mode);
  if (app.ui.rateTab !== mode) return;
  app.ui.leaderboard = { mode, data, loading: false, error: !data };
  if (app.ui.page === "rating") app.renderPage();
}

export const ratingPage: Page = {
  render,
  mounted(app) {
    const lb = app.ui.leaderboard;
    if (!lb || lb.mode !== app.ui.rateTab) void load(app);
  },
  actions: {
    rtab: (app, el) => {
      app.ui.rateTab = el.dataset.tab as "top" | "around";
      app.render();
    },
    login: async (app) => {
      if (!(await app.platform.openAuth())) return;
      await app.syncCloud();
      app.ui.leaderboard = null;
      app.render();
    },
  },
};
