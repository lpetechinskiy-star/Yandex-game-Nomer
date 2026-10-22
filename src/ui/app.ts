// Оболочка игры: шапка, меню разделов, страницы, модальные окна, тосты.
// Страницы — строки HTML; клики обрабатываются делегированием по data-act.
import type { CountryId } from "../config/countries";
import * as G from "../core/game";
import { defaultRng, type Rng } from "../core/random";
import { newerCloudSave, type Saver } from "../core/save";
import type { GameState } from "../core/state";
import { t, type I18nKey } from "../i18n";
import type { Ads, LeaderboardData, Platform } from "../sdk";
import { $, esc } from "./dom";
import { fmtTime as fmt, money } from "./format";
import { ICON, type IconName } from "./icons";
import { cashSound, setMuted } from "./sound";
import { albumPage } from "./pages/album";
import { bonusPage } from "./pages/bonus";
import { createPage } from "./pages/create";
import { garagePage } from "./pages/garage";
import { inventoryPage } from "./pages/inventory";
import { renderModal, modalActions } from "./pages/modals";
import { ordersPage } from "./pages/orders";
import { ratingPage } from "./pages/rating";
import { shopPage } from "./pages/shop";
import { wheelPage } from "./pages/wheel";

export type PageId = "create" | "inv" | "orders" | "garage" | "rating" | "wheel" | "bonus" | "shop" | "album";
export type ModalId = "region" | "country" | null;

/** Обработчик клика: el — элемент с data-act. */
export type Action = (app: App, el: HTMLElement) => void;

export interface Page {
  render(app: App): string;
  /** Вызывается после вставки HTML страницы. */
  mounted?(app: App): void;
  actions?: Record<string, Action>;
}

export interface UiState {
  page: PageId;
  modal: ModalId;
  garageIdx: number;
  /** Ожидание подтверждения повторной прокрутки редкого номера. */
  armed: "d" | "l" | null;
  /** Какая часть номера сейчас крутится. */
  spinning: "d" | "l" | null;
  wheelSpinning: boolean;
  wheelRot: number;
  rateTab: "top" | "around";
  leaderboard: { mode: "top" | "around"; data: LeaderboardData | null; loading: boolean; error: boolean } | null;
}

export const PAGES: Record<PageId, Page> = {
  create: createPage,
  inv: inventoryPage,
  orders: ordersPage,
  garage: garagePage,
  rating: ratingPage,
  wheel: wheelPage,
  bonus: bonusPage,
  shop: shopPage,
  album: albumPage,
};

const NAV: PageId[] = ["create", "inv", "orders", "garage", "rating", "wheel", "bonus", "shop", "album"];

export class App {
  readonly ui: UiState = {
    page: "create", modal: null, garageIdx: 0, armed: null, spinning: null,
    wheelSpinning: false, wheelRot: 0, rateTab: "top", leaderboard: null,
  };
  readonly rng: Rng = defaultRng;
  private actions: Record<string, Action> = {};
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private scoreTimer: ReturnType<typeof setTimeout> | undefined;
  private sentScore = -1;

  constructor(readonly s: GameState, readonly platform: Platform, readonly ads: Ads, private saver: Saver) {
    for (const p of Object.values(PAGES)) Object.assign(this.actions, p.actions);
    Object.assign(this.actions, modalActions, this.commonActions());
  }

  // ---------- форматирование ----------

  /** Сумма в рублях в валюте текущей страны. */
  money(rub: number): string {
    return money(rub, this.s.country);
  }

  // ---------- отрисовка ----------

  mount(root: HTMLElement): void {
    root.innerHTML =
      `<header class="topbar"><h1><span class="logo-plate" aria-hidden="true">777</span><span id="title"></span></h1><button class="mute" id="mute" type="button" data-act="mute"></button></header>` +
      `<div class="shell"><nav class="side" id="side"></nav><main class="content" id="content"></main></div>` +
      `<div id="modal"></div><div class="toast" id="toast" role="status" aria-live="polite"></div>`;
    document.addEventListener("click", (e) => this.onClick(e));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.ui.modal) this.closeModal();
    });
    setMuted(this.s.muted);
    this.sentScore = this.s.season.points;
    this.render();
    setInterval(() => this.tick(), 1000);
    setInterval(() => { if (!this.ui.spinning && !this.ui.wheelSpinning) this.renderSide(); }, 60_000);
  }

  /** Полная перерисовка и сохранение. */
  render(): void {
    document.title = t("app.title");
    $("title")!.textContent = t("app.title");
    $("side")!.setAttribute("aria-label", t("app.nav"));
    $("mute")!.textContent = this.s.muted ? t("app.sound.off") : t("app.sound.on");
    this.renderSide();
    this.renderPage();
    this.renderModal();
    this.commit();
  }

  /** Сохранение и отправка очков сезона в лидерборд. */
  commit(): void {
    this.saver.save(this.s);
    if (this.s.season.points !== this.sentScore) {
      clearTimeout(this.scoreTimer);
      // Лидерборд ограничивает частоту setScore: отправляем не чаще раза в пару секунд.
      this.scoreTimer = setTimeout(() => {
        this.sentScore = this.s.season.points;
        void this.platform.setScore(this.s.season.points);
      }, 2000);
    }
  }

  renderSide(): void {
    const now = Date.now(), s = this.s;
    // Пока номер крутится, не подсказываем результат счётчиком заказов.
    const ready = this.ui.spinning ? 0 : G.readyOrdersCount(s);
    const wheelLeft = G.wheelLeftMs(s, now);
    const wheelOk = G.wheelReady(s, now);
    const badge: Partial<Record<PageId, string>> = {
      inv: `<span class="cnt">${s.inv.length}</span>`,
      orders: ready ? `<span class="cnt hot">${ready}</span>` : "",
      wheel: `<span class="cnt${wheelOk ? " hot" : ""}">${wheelOk ? "!" : esc(t("app.hours", { n: Math.ceil(wheelLeft / 3_600_000) }))}</span>`,
      bonus: G.bonusReady(s, now) ? `<span class="cnt hot">!</span>` : "",
    };
    const side = $("side")!;
    side.innerHTML = NAV.map((k) => {
      const on = this.ui.page === k;
      return `<button class="nav${on ? " on" : ""}" data-act="go" data-page="${k}" type="button"${on ? ' aria-current="page"' : ""}>${ICON[k]}<span class="lbl">${esc(t(`nav.${k}` as I18nKey))}</span>${badge[k] ?? ""}</button>`;
    }).join("");
    // На телефоне меню — горизонтальная полоса: держим активный раздел в поле зрения.
    const active = side.querySelector<HTMLElement>(".nav.on");
    if (active && side.scrollWidth > side.clientWidth) {
      const left = active.offsetLeft - (side.clientWidth - active.offsetWidth) / 2;
      side.scrollTo({ left: Math.max(0, left), behavior: "auto" });
    }
  }

  renderPage(): void {
    if (this.ui.wheelSpinning && this.ui.page === "wheel") return;
    const page = PAGES[this.ui.page];
    $("content")!.innerHTML = page.render(this) + `<p class="foot">${esc(t("app.footer"))}</p>`;
    page.mounted?.(this);
  }

  renderModal(): void {
    renderModal(this, $("modal")!);
  }

  /** Заголовок страницы. */
  header(icon: IconName, title: string, right = ""): string {
    return `<div class="ph"><h2>${ICON[icon]}${esc(title)}</h2>${right}</div>`;
  }

  go(page: PageId): void {
    if (this.ui.wheelSpinning) return;
    this.ui.page = page;
    if (page === "rating") this.ui.leaderboard = null;
    this.render();
    window.scrollTo({ top: 0 });
  }

  openModal(m: ModalId): void {
    this.ui.modal = m;
    this.renderModal();
  }

  closeModal(): void {
    this.ui.modal = null;
    this.renderModal();
  }

  toast(msg: string): void {
    const el = $("toast")!;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /** После входа в аккаунт берём облачное сохранение, если оно новее. */
  async syncCloud(): Promise<void> {
    const remote = await newerCloudSave(this.platform.cloud, this.s, this.rng);
    if (!remote) return;
    Object.assign(this.s, remote);
    setMuted(this.s.muted);
    this.sentScore = this.s.season.points;
  }

  // ---------- реклама ----------

  /** Реклама за вознаграждение. Награда выдаётся только в onRewarded, затем экран перерисовывается. */
  async rewarded(onReward: () => void): Promise<void> {
    const res = await this.ads.rewarded(onReward);
    if (res === "error") this.toast(t("toast.adFailed"));
    this.render();
  }

  /** Полноэкранная реклама в естественной паузе (не чаще раза в 2 минуты). */
  interstitial(): void {
    void this.ads.fullscreenIfDue();
  }

  // ---------- события ----------

  private onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const el = target.closest<HTMLElement>("[data-act]");
    if (!el || (el as HTMLButtonElement).disabled) return;
    // Клик по подложке модального окна закрывает его, клик внутри окна — нет.
    if (el.dataset.act === "close" && el.classList.contains("modal") && target !== el) return;
    const fn = this.actions[el.dataset.act!];
    if (fn) fn(this, el);
  }

  private tick(): void {
    const now = Date.now();
    const wt = $("wTimer");
    if (wt) {
      const left = G.wheelLeftMs(this.s, now);
      if (left <= 0) this.render();
      else wt.textContent = fmt(left);
    }
    const bt = $("bTimer");
    if (bt) {
      const left = G.bonusLeftMs(this.s, now);
      if (left <= 0) this.render();
      else bt.textContent = fmt(left);
    }
  }

  private commonActions(): Record<string, Action> {
    return {
      go: (app, el) => app.go(el.dataset.page as PageId),
      modal: (app, el) => app.openModal(el.dataset.modal as ModalId),
      close: (app) => app.closeModal(),
      mute: (app) => {
        app.s.muted = !app.s.muted;
        setMuted(app.s.muted);
        app.render();
      },
      selectCountry: (app, el) => {
        const id = el.dataset.country as CountryId;
        const dropped = G.selectCountry(app.s, id, app.rng);
        app.ui.armed = null;
        app.ui.modal = null;
        const params = { name: t(`country.${id}` as I18nKey), currency: t(`currency.${id}` as I18nKey) };
        app.toast(t(dropped ? "toast.countryDropped" : "toast.country", params));
        app.render();
      },
      unlockCountry: (app, el) => {
        const id = el.dataset.country as CountryId;
        if (!G.unlockCountry(app.s, id)) return app.toast(t("toast.noMoney"));
        cashSound();
        app.toast(t("toast.unlocked", { name: t(`country.${id}` as I18nKey) }));
        app.render();
      },
    };
  }
}
