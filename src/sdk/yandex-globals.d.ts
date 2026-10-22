// Минимальные типы Yandex Games SDK v2 — только то, что использует игра.
// Документация: https://yandex.ru/dev/games/doc/ru/sdk/sdk-about

interface YaAdvCallbacks {
  onOpen?: () => void;
  onClose?: (wasShown?: boolean) => void;
  onError?: (e: unknown) => void;
  onOffline?: () => void;
  onRewarded?: () => void;
}

interface YaLeaderboardEntry {
  score: number;
  rank: number;
  formattedScore?: string;
  player: { publicName?: string; uniqueID: string };
}

interface YaLeaderboardEntries {
  entries: YaLeaderboardEntry[];
  userRank: number;
}

interface YaLeaderboards {
  setScore(name: string, score: number, extraData?: string): Promise<void>;
  getEntries(name: string, opts: { quantityTop?: number; includeUser?: boolean; quantityAround?: number }): Promise<YaLeaderboardEntries>;
}

interface YaLegacyLeaderboards {
  setLeaderboardScore(name: string, score: number, extraData?: string): Promise<void>;
  getLeaderboardEntries(name: string, opts: { quantityTop?: number; includeUser?: boolean; quantityAround?: number }): Promise<YaLeaderboardEntries>;
}

interface YaPlayer {
  isAuthorized?(): boolean;
  getMode?(): string;
  getUniqueID(): string;
  getData(keys?: string[]): Promise<Record<string, unknown>>;
  setData(data: Record<string, unknown>, flush?: boolean): Promise<void>;
}

interface YaSDK {
  environment: { i18n: { lang: string } };
  features: {
    LoadingAPI?: { ready(): void };
    GameplayAPI?: { start(): void; stop(): void };
  };
  adv: {
    showFullscreenAdv(opts: { callbacks: YaAdvCallbacks }): void;
    showRewardedVideo(opts: { callbacks: YaAdvCallbacks }): void;
  };
  leaderboards?: YaLeaderboards;
  getLeaderboards?(): Promise<YaLegacyLeaderboards>;
  getPlayer(opts?: { scopes?: boolean }): Promise<YaPlayer>;
  auth: { openAuthDialog(): Promise<void> };
  feedback: {
    canReview(): Promise<{ value: boolean; reason?: string }>;
    requestReview(): Promise<{ feedbackSent: boolean }>;
  };
  on?(event: "game_api_pause" | "game_api_resume", cb: () => void): void;
}

interface Window {
  YaGames?: { init(): Promise<YaSDK> };
}
