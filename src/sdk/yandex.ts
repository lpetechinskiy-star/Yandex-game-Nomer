import { SEASON } from "../config/economy";
import type { LeaderboardData, Platform } from "./types";

const SAVE_KEY = "save";

/** Обёртка над Yandex Games SDK v2. Требует загруженного /sdk.js. */
export async function createYandexPlatform(): Promise<Platform> {
  const ysdk = await window.YaGames!.init();

  let player: YaPlayer | null = null;
  const loadPlayer = async () => {
    try {
      player = await ysdk.getPlayer({ scopes: false });
    } catch {
      player = null;
    }
  };
  await loadPlayer();

  const isAuthorized = () => {
    if (!player) return false;
    if (typeof player.isAuthorized === "function") return player.isAuthorized();
    return player.getMode?.() !== "lite";
  };

  // Новый API лидербордов (ysdk.leaderboards) с запасным вариантом через getLeaderboards().
  const lb = async () => {
    if (ysdk.leaderboards) return ysdk.leaderboards;
    const legacy = await ysdk.getLeaderboards!();
    return {
      setScore: (n: string, s: number) => legacy.setLeaderboardScore(n, s),
      getEntries: (n: string, o: Parameters<YaLeaderboards["getEntries"]>[1]) => legacy.getLeaderboardEntries(n, o),
    };
  };

  let gameplay = false;

  return {
    kind: "yandex",
    lang: ysdk.environment?.i18n?.lang ?? "ru",

    cloud: {
      available: isAuthorized,
      async load() {
        if (!player) return null;
        const data = await player.getData([SAVE_KEY]);
        return data?.[SAVE_KEY] ?? null;
      },
      async save(data, flush) {
        if (player) await player.setData({ [SAVE_KEY]: data }, flush);
      },
    },

    loadingReady() {
      ysdk.features.LoadingAPI?.ready();
    },
    gameplayStart() {
      if (gameplay) return;
      gameplay = true;
      ysdk.features.GameplayAPI?.start();
    },
    gameplayStop() {
      if (!gameplay) return;
      gameplay = false;
      ysdk.features.GameplayAPI?.stop();
    },

    showRewarded(onReward) {
      return new Promise((resolve) => {
        let rewarded = false, done = false;
        const finish = (r: "rewarded" | "closed" | "error") => {
          if (done) return;
          done = true;
          resolve(r);
        };
        try {
          ysdk.adv.showRewardedVideo({
            callbacks: {
              onRewarded: () => {
                if (rewarded) return;
                rewarded = true;
                onReward();
              },
              onClose: () => finish(rewarded ? "rewarded" : "closed"),
              onError: () => finish(rewarded ? "rewarded" : "error"),
            },
          });
        } catch {
          finish("error");
        }
      });
    },

    showFullscreen() {
      return new Promise((resolve) => {
        try {
          ysdk.adv.showFullscreenAdv({
            callbacks: { onClose: () => resolve(), onError: () => resolve(), onOffline: () => resolve() },
          });
        } catch {
          resolve();
        }
      });
    },

    isAuthorized,
    async openAuth() {
      try {
        await ysdk.auth.openAuthDialog();
        await loadPlayer();
      } catch {
        // Игрок закрыл окно входа.
      }
      return isAuthorized();
    },

    async setScore(score) {
      if (!isAuthorized()) return;
      try {
        await (await lb()).setScore(SEASON.leaderboardName, Math.floor(score));
      } catch {
        // Лидерборд ограничивает частоту запросов — следующая попытка будет при следующем изменении очков.
      }
    },

    async getLeaderboard(mode): Promise<LeaderboardData | null> {
      try {
        const auth = isAuthorized();
        const res = await (await lb()).getEntries(SEASON.leaderboardName,
          mode === "top"
            ? { quantityTop: SEASON.leaderboardTop, includeUser: auth, quantityAround: 1 }
            : { quantityTop: 1, includeUser: auth, quantityAround: SEASON.leaderboardAround });
        const me = auth && player ? player.getUniqueID() : null;
        const seen = new Set<number>();
        const entries = res.entries
          .filter((e) => (seen.has(e.rank) ? false : (seen.add(e.rank), true)))
          .sort((a, b) => a.rank - b.rank)
          .map((e) => ({ rank: e.rank, score: e.score, name: e.player.publicName ?? "", isMe: !!me && e.player.uniqueID === me }));
        return { entries, myRank: res.userRank ?? 0 };
      } catch {
        return null;
      }
    },

    async canReview() {
      try {
        return (await ysdk.feedback.canReview()).value;
      } catch {
        return false;
      }
    },
    async requestReview() {
      try {
        return (await ysdk.feedback.requestReview()).feedbackSent;
      } catch {
        return false;
      }
    },

    onPlatformPause(cb) {
      ysdk.on?.("game_api_pause", () => cb(true));
      ysdk.on?.("game_api_resume", () => cb(false));
    },
  };
}
