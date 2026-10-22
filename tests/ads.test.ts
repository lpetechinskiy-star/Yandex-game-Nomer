import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TIMERS } from "../src/config/economy";
import { Ads } from "../src/sdk";
import { isPaused, onPauseChange } from "../src/sdk/pause";
import type { Platform } from "../src/sdk/types";

function fakePlatform() {
  const calls: string[] = [];
  const p = {
    showFullscreen: async () => { calls.push("fullscreen"); },
    showRewarded: async (onReward: () => void) => {
      calls.push(`rewarded paused=${isPaused()}`);
      onReward();
      return "rewarded" as const;
    },
  } as unknown as Platform;
  return { p, calls };
}

describe("реклама", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => vi.useRealTimers());

  it("полноэкранная реклама не показывается на старте и не чаще раза в 2 минуты", async () => {
    const { p, calls } = fakePlatform();
    const ads = new Ads(p);
    await ads.fullscreenIfDue();
    expect(calls).toEqual([]);
    vi.setSystemTime(1_000_000 + TIMERS.fullscreenIntervalMs);
    await ads.fullscreenIfDue();
    expect(calls).toEqual(["fullscreen"]);
    vi.setSystemTime(1_000_000 + TIMERS.fullscreenIntervalMs * 1.5);
    await ads.fullscreenIfDue();
    expect(calls).toEqual(["fullscreen"]);
  });

  it("реклама за вознаграждение ставит игру на паузу и выдаёт награду", async () => {
    const { p, calls } = fakePlatform();
    const pauses: boolean[] = [];
    onPauseChange((v) => pauses.push(v));
    let rewarded = 0;
    const res = await new Ads(p).rewarded(() => rewarded++);
    expect(res).toBe("rewarded");
    expect(rewarded).toBe(1);
    expect(calls).toEqual(["rewarded paused=true"]);
    expect(pauses).toEqual([true, false]);
    expect(isPaused()).toBe(false);
  });
});
