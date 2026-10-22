import { TAGS } from "../../config/rarity";
import { t, type I18nKey } from "../../i18n";
import type { App, Page } from "../app";
import { esc } from "../dom";
import { num, odds } from "../format";
import { plateBox } from "../plates";

const ptsLabel = (pts: readonly number[], bonus?: boolean) => (bonus ? "+" : "") + pts.join("–");

function render(app: App): string {
  const { s } = app;
  const got = new Set(s.found), n = TAGS.filter((x) => got.has(x.key)).length;
  const best = s.best
    ? `<div class="row" style="margin-top:14px"><span class="meta">${esc(t("album.best", { n: s.best.score }))}</span></div><div style="max-width:340px;margin-top:8px">${plateBox(s.best.p)}</div>`
    : "";
  return app.header("album", t("album.title"), `<span class="pill">${esc(t("album.progress", { n, total: TAGS.length }))}</span>`) +
    `<div class="box"><div class="prog"><i style="width:${Math.max(3, Math.round((n / TAGS.length) * 100))}%"></i></div>${best}</div>` +
    `<ul class="album">${TAGS.map((tag) =>
      `<li class="${got.has(tag.key) ? "got" : ""}"><span class="tick">✓</span><div><div class="a-name">${esc(t(`tag.${tag.key}` as I18nKey))}</div>` +
      `<div class="a-desc">${esc(t(`tag.desc.${tag.key}` as I18nKey))}</div></div>` +
      `<div class="a-meta"><b>${esc(ptsLabel(tag.pts, tag.bonus))}</b> ${esc(t("pts.short"))}<br>${esc(tag.odds === null ? odds(null) : t("odds", { n: num(tag.odds) }))}</div></li>`).join("")}</ul>`;
}

export const albumPage: Page = { render };
