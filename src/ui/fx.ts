// Праздничные эффекты при редком номере: вспышка рамки, лучи, конфетти, плашка.
import { TIERS } from "../config/rarity";
import { t, type I18nKey } from "../i18n";
import { $, reducedMotion } from "./dom";
import { chime } from "./sound";

export function celebrate(tier: number): void {
  const fr = $("frame"), zone = $("pzone");
  if (!fr) return;
  const col = TIERS[tier].color;
  fr.classList.remove("fx1", "fx2", "fx3", "fx4");
  void fr.offsetWidth;
  fr.classList.add("fx" + tier);
  chime(tier);
  if (reducedMotion()) {
    if (tier >= 2) banner(tier, col);
    return;
  }
  if (tier >= 3 && zone) {
    const r = document.createElement("div");
    r.className = "rays";
    r.style.setProperty("--c", col);
    zone.prepend(r);
    setTimeout(() => r.remove(), 2200);
  }
  if (tier >= 2) {
    burst(fr, tier, col);
    banner(tier, col);
  }
  if (tier >= 4) {
    const f = document.createElement("div");
    f.className = "flashscreen";
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }
}

function burst(el: HTMLElement, tier: number, col: string): void {
  const r = el.getBoundingClientRect(), n = tier >= 4 ? 70 : tier >= 3 ? 44 : 26;
  const cols = [col, "#ffc928", "#ffffff", "#2457c5", col];
  const box = document.createElement("div");
  box.className = "burst";
  box.style.left = `${r.left + r.width / 2}px`;
  box.style.top = `${r.top + r.height / 2}px`;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("i"), a = Math.random() * Math.PI * 2, d = 120 + Math.random() * (tier >= 4 ? 380 : 240);
    s.style.setProperty("--dx", `${(Math.cos(a) * d).toFixed(0)}px`);
    s.style.setProperty("--dy", `${(Math.sin(a) * d * 0.7 - 60).toFixed(0)}px`);
    s.style.setProperty("--rot", `${(Math.random() * 720 - 360).toFixed(0)}deg`);
    s.style.background = cols[i % cols.length];
    s.style.animationDuration = `${(0.9 + Math.random() * 0.8).toFixed(2)}s`;
    if (i % 3 === 0) s.style.borderRadius = "50%";
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1900);
}

function banner(tier: number, col: string): void {
  const b = document.createElement("div");
  b.className = "banner";
  b.style.setProperty("--c", col);
  const span = document.createElement("span");
  span.textContent = t(`tier.banner.${tier}` as I18nKey);
  b.appendChild(span);
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1700);
}
