import { ADS } from "../../config/economy";
import { WHEEL_PRIZES, WHEEL_SPIN, type WheelPrize } from "../../config/wheel";
import * as G from "../../core/game";
import { t } from "../../i18n";
import type { App, Page } from "../app";
import { $, esc, reducedMotion } from "../dom";
import { fmtTime } from "../format";
import { ICON } from "../icons";
import { beep, chime } from "../sound";

function prizeLabel(app: App, w: WheelPrize): string {
  if (w.kind === "spins") return t("wheel.spins", { n: w.value });
  if (w.kind === "jackpot") return t("wheel.jackpot");
  if (w.kind === "plate") return t("wheel.plate");
  return app.money(w.value);
}

function wheelSVG(app: App): string {
  const n = WHEEL_PRIZES.length, R = 140, cx = 150, cy = 150;
  let s = "";
  WHEEL_PRIZES.forEach((w, i) => {
    const a0 = (i * 360 / n) * Math.PI / 180, a1 = ((i + 1) * 360 / n) * Math.PI / 180, mid = (i + 0.5) * 360 / n;
    const x0 = cx + R * Math.sin(a0), y0 = cy - R * Math.cos(a0), x1 = cx + R * Math.sin(a1), y1 = cy - R * Math.cos(a1);
    const label = prizeLabel(app, w);
    s += `<path d="M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${w.color}" stroke="#fff" stroke-width="3"/>`;
    s += `<text transform="rotate(${mid - 90} ${cx} ${cy})" x="${cx + 84}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="${label.length > 9 ? 12 : 14}" fill="${w.kind === "jackpot" ? "#2d2300" : "#fff"}">${esc(label)}</text>`;
  });
  return `<svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="147" fill="#fff" stroke="#d8d8d8" stroke-width="2"/>${s}<circle cx="150" cy="150" r="24" fill="#fff" stroke="#d8d8d8" stroke-width="3"/><circle cx="150" cy="150" r="9" fill="#1f1f1f"/></svg>`;
}

function render(app: App): string {
  const { s, ui } = app;
  const now = Date.now(), need = ADS.wheelAdsNeeded;
  let ctl: string;
  if (G.wheelFree(s, now)) ctl = `<button class="wide green" id="wSpin" data-act="wheelSpin" type="button">${esc(t("wheel.spinFree"))}</button>`;
  else if (s.wheel.ads >= need) ctl = `<button class="wide green" id="wSpin" data-act="wheelSpin" type="button">${esc(t("wheel.spin"))}</button>`;
  else {
    const dots = Array.from({ length: need }, (_, i) => `<i class="${s.wheel.ads > i ? "on" : ""}"></i>`).join("");
    ctl = `<div class="grey-line">${t("wheel.freeIn", { time: `<span class="timer" id="wTimer">${fmtTime(G.wheelLeftMs(s, now))}</span>` })}</div>` +
      `<div class="row"><span class="meta">${esc(t("wheel.orAds", { n: need }))}</span><div class="dots">${dots}</div></div>` +
      `<button class="wide gold" data-act="wheelAd" type="button"><span class="ad">${esc(t("ad.label"))}</span>${esc(t("wheel.watch", { n: s.wheel.ads, total: need }))}</button>`;
  }
  const prizes = WHEEL_PRIZES.map((w) => `<li><i style="background:${w.color}"></i>${esc(prizeLabel(app, w))}${w.kind === "jackpot" ? ` · ${esc(app.money(w.value))}` : ""}</li>`).join("");
  return app.header("wheel", t("wheel.title"), `<span class="pill">${ICON.clock}${esc(t("wheel.pill"))}</span>`) +
    `<div class="box"><div class="wheel-wrap"><div class="wheel-box"><span class="pointer"></span><div class="wheel-rot" id="wheelRot" style="transform:rotate(${ui.wheelRot}deg)">${wheelSVG(app)}</div></div>` +
    `<div class="stack"><b style="font-size:18px">${esc(t("wheel.prizes"))}</b><ul class="prizes">${prizes}</ul>${ctl}</div></div></div>`;
}

function spin(app: App): void {
  const { s, ui } = app;
  if (ui.wheelSpinning) return;
  const idx = G.startWheel(s, Date.now(), app.rng);
  if (idx === null) return;
  // Приз выдаём сразу, чтобы перезагрузка страницы во время вращения не теряла его; показываем после остановки.
  const res = G.applyWheelPrize(s, idx, app.rng);
  const seg = 360 / WHEEL_PRIZES.length;
  const center = idx * seg + seg / 2 + (Math.random() - 0.5) * seg * WHEEL_SPIN.jitter;
  ui.wheelRot = ui.wheelRot - (ui.wheelRot % 360) + 360 * WHEEL_SPIN.turns + (360 - center);
  ui.wheelSpinning = true;
  app.commit();
  app.renderSide();
  const el = $("wheelRot"), btn = $<HTMLButtonElement>("wSpin");
  if (btn) btn.disabled = true;
  const dur = reducedMotion() ? 600 : WHEEL_SPIN.durationMs;
  if (el) {
    el.style.transition = `transform ${dur}ms cubic-bezier(.12,.7,.1,1)`;
    el.style.transform = `rotate(${ui.wheelRot}deg)`;
  }
  const ticker = setInterval(() => beep(900, 0.02, "square", 0.015), 120);
  setTimeout(() => {
    clearInterval(ticker);
    ui.wheelSpinning = false;
    if (res.kind === "spins") app.toast(t("toast.wheelSpins", { n: res.count }));
    else if (res.kind === "plate") app.toast(res.soldFor === null ? t("toast.wheelPlate", { n: res.score }) : t("toast.wheelPlateSold", { price: app.money(res.soldFor) }));
    else app.toast(t(res.kind === "jackpot" ? "toast.jackpot" : "toast.wheelMoney", { amount: app.money(res.amount) }));
    chime(res.kind === "jackpot" ? 4 : 2);
    app.render();
  }, dur + 100);
}

export const wheelPage: Page = {
  render,
  actions: {
    wheelSpin: (app) => spin(app),
    wheelAd: (app) => void app.rewarded(() => G.wheelAdWatched(app.s)),
  },
};
