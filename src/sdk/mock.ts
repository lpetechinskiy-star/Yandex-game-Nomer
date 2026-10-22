// Заглушка площадки для локальной разработки и проверки архива без Яндекса.
// Реклама — окно с обратным отсчётом, лидерборд — соперники из config/ranks.ts.
// Параметры адресной строки: ?lang=en — английский, ?guest — игрок не залогинен.
import { TIMERS } from "../config/economy";
import { MOCK_LEADERBOARD } from "../config/ranks";
import { SEASON } from "../config/economy";
import { t } from "../i18n";
import type { LeaderboardData, Platform } from "./types";

const CLOUD_KEY = "nomernoy-perekup-mock-cloud";
const SCORE_KEY = "nomernoy-perekup-mock-score";
const REVIEW_KEY = "nomernoy-perekup-mock-reviewed";

const params = new URLSearchParams(location.search);

function store(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Окно «рекламы» с обратным отсчётом. */
function fakeAd(title: string): Promise<void> {
  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.className = "admodal";
    el.innerHTML = `<div class="adcard" role="dialog" aria-modal="true"><h2></h2><div class="count"></div><p></p></div>`;
    el.querySelector("h2")!.textContent = title;
    el.querySelector("p")!.textContent = t("mockad.text");
    const count = el.querySelector(".count")!;
    let n: number = TIMERS.mockAdSeconds;
    count.textContent = String(n);
    document.body.appendChild(el);
    const iv = setInterval(() => {
      n--;
      count.textContent = String(n);
      if (n <= 0) {
        clearInterval(iv);
        el.remove();
        resolve();
      }
    }, 1000);
  });
}

export function createMockPlatform(): Platform {
  let authorized = !params.has("guest");

  return {
    kind: "mock",
    lang: params.get("lang") ?? navigator.language ?? "ru",

    cloud: {
      available: () => authorized,
      async load() {
        const raw = store(CLOUD_KEY);
        return raw ? JSON.parse(raw) : null;
      },
      async save(data) {
        store(CLOUD_KEY, JSON.stringify(data));
      },
    },

    loadingReady() {
      console.info("[mock sdk] LoadingAPI.ready()");
    },
    gameplayStart() {
      console.info("[mock sdk] GameplayAPI.start()");
    },
    gameplayStop() {
      console.info("[mock sdk] GameplayAPI.stop()");
    },

    async showRewarded(onReward) {
      await fakeAd(t("mockad.title"));
      onReward();
      return "rewarded";
    },
    async showFullscreen() {
      await fakeAd(t("mockad.fullscreen"));
    },

    isAuthorized: () => authorized,
    async openAuth() {
      authorized = true;
      return true;
    },

    async setScore(score) {
      if (authorized) store(SCORE_KEY, String(Math.floor(score)));
    },
    async getLeaderboard(mode): Promise<LeaderboardData> {
      const list = MOCK_LEADERBOARD.map((x) => ({ ...x, isMe: false }));
      if (authorized) list.push({ name: "", score: Number(store(SCORE_KEY) ?? 0), isMe: true });
      list.sort((a, b) => b.score - a.score);
      const ranked = list.map((x, i) => ({ rank: i + 1, score: x.score, name: x.name, isMe: x.isMe }));
      const myRank = ranked.find((x) => x.isMe)?.rank ?? 0;
      if (mode === "top") {
        const top = ranked.slice(0, SEASON.leaderboardTop);
        if (myRank > SEASON.leaderboardTop) top.push(ranked[myRank - 1]);
        return { entries: top, myRank };
      }
      const center = myRank || 1;
      return { entries: ranked.filter((x) => Math.abs(x.rank - center) <= SEASON.leaderboardAround), myRank };
    },

    async canReview() {
      return store(REVIEW_KEY) !== "1";
    },
    async requestReview() {
      store(REVIEW_KEY, "1");
      return true;
    },

    onPlatformPause() {},
  };
}
