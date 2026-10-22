import { US_PLATE_WIDTH_FACTOR, type CarDef } from "../../config/cars";
import { TIERS } from "../../config/rarity";
import { evaluate } from "../../core/evaluate";
import * as G from "../../core/game";
import type { OwnedPlate } from "../../core/types";
import { t, type I18nKey } from "../../i18n";
import type { App, Page } from "../app";
import { $, esc } from "../dom";
import { carName, tierName } from "../format";
import { ICON } from "../icons";
import { plateBox, plateSVG } from "../plates";
import { beep } from "../sound";

/** Ширина номера на машине в процентах: номер США уже европейского. */
const mountWidth = (car: CarDef, plate: OwnedPlate | null) => car.plateW * (plate?.c === "us" ? US_PLATE_WIDTH_FACTOR : 1);

/** Машина с номером на бампере. Координаты номера — из config/cars.ts. */
export function carScene(car: CarDef, plate: OwnedPlate | null): string {
  const src = import.meta.env.BASE_URL + car.img;
  const mount = plate
    ? `<div class="mount" id="mount" style="left:${car.plateX}%;top:${car.plateY}%;width:${mountWidth(car, plate)}%">${plateSVG(plate)}</div>`
    : "";
  return `<div class="scene"><div class="shot"><img src="${esc(src)}" alt="${esc(t("garage.alt", { car: carName(car.id) }))}" draggable="false">${mount}</div></div>`;
}

/** Подбор координат номера для новой картинки: npm run dev, затем ?plates в адресе. */
const tunerOn = () => import.meta.env.DEV && new URLSearchParams(location.search).has("plates");

const TUNER_PLATE: OwnedPlate = { c: "ru", d: "777", l: "ЕКХ", r: "77", x2: false };

function tuner(car: CarDef): string {
  const row = (k: "plateX" | "plateY" | "plateW", max: number) =>
    `<label>${k}<input type="range" min="0" max="${max}" step="0.1" value="${car[k]}" data-tune="${k}"><span id="tv-${k}">${car[k]}</span></label>`;
  return `<div class="plate-tuner">${row("plateX", 100)}${row("plateY", 100)}${row("plateW", 60)}<code id="tune-out"></code></div>`;
}

function mountTuner(car: CarDef): void {
  const box = document.querySelector(".plate-tuner");
  if (!box) return;
  const v = { plateX: car.plateX, plateY: car.plateY, plateW: car.plateW };
  const out = () => {
    $("tune-out")!.textContent = `{ id: "${car.id}", img: "${car.img}", cls: ${car.cls}, plateX: ${v.plateX}, plateY: ${v.plateY}, plateW: ${v.plateW} },`;
  };
  box.addEventListener("input", (e) => {
    const inp = e.target as HTMLInputElement;
    const k = inp.dataset.tune as keyof typeof v;
    v[k] = Number(inp.value);
    $(`tv-${k}`)!.textContent = inp.value;
    const m = $("mount");
    if (m) {
      m.style.left = `${v.plateX}%`;
      m.style.top = `${v.plateY}%`;
      m.style.width = `${v.plateW}%`;
    }
    out();
  });
  out();
}

function render(app: App): string {
  const { s, ui } = app;
  const owned = G.ownedCars(s);
  const head = app.header("garage", t("garage.title"), `<button class="wbtn" data-act="go" data-page="shop" type="button">${ICON.shop}${esc(t("nav.shop"))}</button>`);
  if (!owned.length) {
    return head + `<div class="empty"><h3>${esc(t("garage.empty"))}</h3><p>${esc(t("garage.emptyHint"))}</p>` +
      `<p style="margin-top:18px"><button class="wbtn" data-act="go" data-page="shop" type="button" style="display:inline-flex">${ICON.shop}${esc(t("garage.openShop"))}</button></p></div>`;
  }
  if (ui.garageIdx >= owned.length) ui.garageIdx = 0;
  const car = owned[ui.garageIdx], plate = s.cars[car.id].plate, active = s.activeCar === car.id;
  const pe = plate ? evaluate(plate) : null;
  const one = owned.length < 2 ? " disabled" : "";
  const meta = t("garage.meta", { type: t(`car.type.${car.id}` as I18nKey), cls: car.cls, status: t(active ? "garage.main" : "garage.parked") });

  let h = head +
    `<div class="carbar"><button class="arrow" data-act="gnav" data-dir="-1" type="button" aria-label="${esc(t("garage.prev"))}"${one}>‹</button><h3>${esc(carName(car.id))}</h3><button class="arrow" data-act="gnav" data-dir="1" type="button" aria-label="${esc(t("garage.next"))}"${one}>›</button></div>` +
    carScene(car, plate ?? (tunerOn() ? TUNER_PLATE : null)) + (tunerOn() ? tuner(car) : "") +
    `<div class="carinfo"><div><h4>${esc(carName(car.id))}</h4><div class="meta">${esc(meta)}</div></div><div class="push row">` +
    (pe ? `<span class="meta">${esc(t("garage.plateScore", { n: pe.score }))}</span><button class="mbtn" data-act="unmount" data-car="${car.id}" type="button">${esc(t("garage.unmount"))}</button>`
        : `<span class="noplate"><i></i>${esc(t("garage.noPlate"))}</span>`) +
    (active ? "" : `<button class="mbtn go" data-act="setActive" data-car="${car.id}" type="button">${esc(t("garage.makeMain"))}</button>`) +
    `</div></div>`;

  h += `<div class="box"><div class="row"><b>${esc(t("garage.fromInv"))}</b><span class="meta push">${esc(t(s.inv.length ? "garage.pickHint" : "garage.saveHint"))}</span></div>`;
  if (s.inv.length) {
    h += `<div class="pick-list">` + s.inv.map((it) => {
      const e = evaluate(it)!;
      return `<div class="pick">${plateBox(it)}<div class="row"><span class="rchip tiny" style="--c:${TIERS[e.tier].color}">${esc(tierName(e.tier))}</span>` +
        `<button class="mbtn push" data-act="put" data-id="${it.id}" data-car="${car.id}" type="button">${esc(t("garage.put"))}</button></div></div>`;
    }).join("") + `</div>`;
  }
  return h + `</div>`;
}

export const garagePage: Page = {
  render,
  mounted(app) {
    if (!tunerOn()) return;
    const owned = G.ownedCars(app.s);
    if (owned.length) mountTuner(owned[app.ui.garageIdx]);
  },
  actions: {
    gnav: (app, el) => {
      const n = G.ownedCars(app.s).length;
      app.ui.garageIdx = (app.ui.garageIdx + Number(el.dataset.dir) + n) % n;
      app.render();
    },
    setActive: (app, el) => {
      G.setActiveCar(app.s, el.dataset.car!);
      app.toast(t("toast.activeCar"));
      app.render();
    },
    unmount: (app, el) => {
      if (!G.unmount(app.s, el.dataset.car!)) return app.toast(t("toast.noInvSpace"));
      app.render();
    },
    put: (app, el) => {
      const res = G.installFromInventory(app.s, Number(el.dataset.id), el.dataset.car);
      if (!res) return;
      beep(660, 0.1, "triangle", 0.05);
      let msg = t("toast.installed", { car: carName(res.car.id) });
      if (res.soldOld !== null) msg += ` · ${t("toast.oldSold", { price: app.money(res.soldOld) })}`;
      app.toast(msg);
      app.render();
    },
  },
};
