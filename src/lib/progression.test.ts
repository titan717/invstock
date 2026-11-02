import { describe, expect, it } from "vitest";
import { createGameState } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";
import { claimMission, claimWeeklyChallenge, joinWeeklyChallenge, updateProgression } from "@/lib/game-runtime";

describe("missions and weekly trading challenge", () => {
  it("tracks mission progress and grants each cash and XP reward only once", () => {
    const state=createGameState();const market=createMarket();
    state.trades=1;
    updateProgression(state,market,100);
    const mission=state.missions.find(item=>item.id==="first-trade")!;
    expect(mission.progress).toBe(1);
    expect(claimMission(state,"first-trade").ok).toBe(true);
    const cash=state.cash,xp=state.xp;
    expect(claimMission(state,"first-trade").ok).toBe(false);
    expect(state.cash).toBe(cash);
    expect(state.xp).toBe(xp);
  });

  it("requires joining a weekly challenge and only pays after the week ends", () => {
    const state=createGameState();const market=createMarket();
    expect(claimWeeklyChallenge(state,market).ok).toBe(false);
    expect(joinWeeklyChallenge(state,market).ok).toBe(true);
    expect(claimWeeklyChallenge(state,market).ok).toBe(false);
    state.market.day=8;
    const result=claimWeeklyChallenge(state,market);
    expect(result.ok).toBe(true);
    expect(state.weeklyChallenge.claimed).toBe(true);
    expect(state.cash).toBeGreaterThan(5000);
  });

  it("rotates the weekly challenge after seven simulated days", () => {
    const state=createGameState();const market=createMarket();
    const previous=state.weeklyChallenge.week;
    state.market.day=8;
    updateProgression(state,market,200);
    expect(state.weeklyChallenge.week).toBeGreaterThan(previous);
    expect(state.weeklyChallenge.joined).toBe(false);
  });
});
