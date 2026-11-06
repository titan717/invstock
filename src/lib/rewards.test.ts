import { describe, expect, it } from "vitest";
import { createGameState } from "@/lib/game-engine";
import { addVirtualCash, claimDailyBonus, claimVideoBonus, dailyBonusStatus, VIDEO_BONUSES_PER_DAY, videosLeft } from "@/lib/rewards";
import { gameDateLabel, tradingDayDate } from "@/lib/game-calendar";

describe("daily login bonus", () => {
  it("climbs the ladder on consecutive days and resets after a missed day", () => {
    let state = createGameState();
    const first = claimDailyBonus(state, false, "2026-11-01");
    if (!first.ok) throw new Error(first.reason);
    expect(first.amount).toBe(100);
    state = first.state;
    expect(claimDailyBonus(state, false, "2026-11-01").ok).toBe(false);
    const second = claimDailyBonus(state, true, "2026-11-02");
    if (!second.ok) throw new Error(second.reason);
    expect(second.amount).toBe(400);
    expect(dailyBonusStatus(second.state.rewards, "2026-11-04")).toMatchObject({ claimable: true, dayIndex: 0, amount: 100 });
  });

  it("counts bonus cash as a deposit so returns are unchanged", () => {
    const state = createGameState();
    const result = addVirtualCash(state, 25_000);
    if (!result.ok) throw new Error(result.reason);
    expect(result.state.cash - state.cash).toBe(25_000);
    expect(result.state.start - state.start).toBe(25_000);
    expect(addVirtualCash(state, 1_000_000).ok).toBe(false);
  });

  it("limits video bonuses per day", () => {
    let state = createGameState();
    for (let index = 0; index < VIDEO_BONUSES_PER_DAY; index++) {
      const result = claimVideoBonus(state, "2026-11-01");
      if (!result.ok) throw new Error(result.reason);
      state = result.state;
    }
    expect(videosLeft(state.rewards, "2026-11-01")).toBe(0);
    expect(claimVideoBonus(state, "2026-11-01").ok).toBe(false);
    expect(videosLeft(state.rewards, "2026-11-02")).toBe(VIDEO_BONUSES_PER_DAY);
  });
});

describe("game calendar", () => {
  it("skips weekends", () => {
    expect(gameDateLabel(1)).toBe("Mon, Jan 5");
    expect(gameDateLabel(6, 627)).toBe("Mon, Jan 12 · 10:27 AM");
    expect(tradingDayDate(5).getUTCDay()).toBe(5);
  });
});
