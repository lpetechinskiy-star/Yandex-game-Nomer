import { TIMERS } from "../config/economy";
import { createMockPlatform } from "./mock";
import { setPaused } from "./pause";
import type { Platform } from "./types";
import { createYandexPlatform } from "./yandex";

export type { Platform, LeaderboardData, LeaderboardEntry } from "./types";

const INIT_TIMEOUT_MS = 10_000;

/** Яндекс Игры, если /sdk.js загрузился, иначе mock. */
export async function initPlatform(): Promise<Platform> {
  if (window.YaGames) {
    try {
      return await Promise.race([
        createYandexPlatform(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("YaGames.init timeout")), INIT_TIMEOUT_MS)),
      ]);
    } catch (e) {
      console.warn("Yandex Games SDK недоступен, включаю mock:", e);
    }
  }
  return createMockPlatform();
}

/** Реклама с паузой игры и ограничением частоты полноэкранной рекламы. */
export class Ads {
  private busy = false;
  /** Отсчёт от запуска: полноэкранная реклама не показывается на старте. */
  private lastFullscreen = Date.now();

  constructor(private platform: Platform) {}

  get isBusy(): boolean {
    return this.busy;
  }

  /** Реклама за вознаграждение. onReward вызывается только при onRewarded. */
  async rewarded(onReward: () => void): Promise<"rewarded" | "closed" | "error" | "busy"> {
    if (this.busy) return "busy";
    this.busy = true;
    setPaused("ad", true);
    try {
      return await this.platform.showRewarded(onReward);
    } finally {
      setPaused("ad", false);
      this.busy = false;
      // Rewarded-реклама тоже прерывает игру: не показываем сразу за ней полноэкранную.
      this.lastFullscreen = Date.now();
    }
  }

  /** Полноэкранная реклама в естественной паузе (после продажи номера), не чаще раза в 2 минуты. */
  async fullscreenIfDue(): Promise<void> {
    if (this.busy || Date.now() - this.lastFullscreen < TIMERS.fullscreenIntervalMs) return;
    this.busy = true;
    this.lastFullscreen = Date.now();
    setPaused("ad", true);
    try {
      await this.platform.showFullscreen();
    } finally {
      setPaused("ad", false);
      this.busy = false;
      this.lastFullscreen = Date.now();
    }
  }
}
