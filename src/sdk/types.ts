import type { CloudStore } from "../core/save";

export interface LeaderboardEntry {
  rank: number;
  score: number;
  name: string;
  isMe: boolean;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  /** Место игрока; 0 — игрока нет в таблице. */
  myRank: number;
}

/** То, что игре нужно от площадки. Реализации: Яндекс Игры (yandex.ts) и локальная заглушка (mock.ts). */
export interface Platform {
  readonly kind: "yandex" | "mock";
  /** Язык интерфейса площадки (ysdk.environment.i18n.lang). */
  readonly lang: string;
  readonly cloud: CloudStore;

  /** Игра загрузилась и готова (LoadingAPI.ready). */
  loadingReady(): void;
  gameplayStart(): void;
  gameplayStop(): void;

  /** Реклама за вознаграждение. onReward вызывается только из onRewarded. Промис завершается после закрытия рекламы. */
  showRewarded(onReward: () => void): Promise<"rewarded" | "closed" | "error">;
  /** Полноэкранная реклама. Промис завершается после закрытия. */
  showFullscreen(): Promise<void>;

  isAuthorized(): boolean;
  openAuth(): Promise<boolean>;

  setScore(score: number): Promise<void>;
  getLeaderboard(mode: "top" | "around"): Promise<LeaderboardData | null>;

  canReview(): Promise<boolean>;
  /** true — игрок отправил оценку. */
  requestReview(): Promise<boolean>;

  /** Площадка просит поставить игру на паузу (например, во время своей рекламы). */
  onPlatformPause(cb: (paused: boolean) => void): void;
}
