import { describe, expect, it } from "vitest";
import { createGameState } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";
import { applyMarketEvent, evaluateAchievements, resolvePendingRumours, updateProgression } from "@/lib/game-runtime";

describe("simulated market events and progression", () => {
  it("applies macro events across the market and sector events only within their sector", () => {
    const market=createMarket();
    const state=createGameState();
    const macro=applyMarketEvent(state,market,{id:1,headline:"Rate cut",body:"Rates ease",tickers:market.map(s=>s.ticker),sentiment:1,magnitude:.02,type:"macro",day:1});
    expect(macro.every((s,i)=>s.price>=market[i].price)).toBe(true);
    const technology=market.filter(s=>s.sector==="Technology");
    const sector=applyMarketEvent(state,market,{id:2,headline:"Tech rotation",body:"Rotation",tickers:technology.map(s=>s.ticker),sentiment:-1,magnitude:.02,type:"sector",day:1});
    expect(sector.find(s=>s.ticker===technology[0].ticker)!.price).toBeLessThan(technology[0].price);
    const nonTech=market.find(s=>s.sector!=="Technology")!;
    expect(sector.find(s=>s.ticker===nonTech.ticker)!.price).toBe(nonTech.price);
  });

  it("resolves a pending rumour once and records a confirmed or debunked follow-up", () => {
    const market=createMarket();
    const state=createGameState();
    state.market.day=2;
    state.market.minute=600;
    state.pendingNews=[{id:3,headline:"Rumour",body:"Unverified",tickers:["MSFT"],sentiment:1,magnitude:.03,type:"rumor",day:2,after:10,truth:false}];
    const before=market.find(s=>s.ticker==="MSFT")!.price;
    const events=resolvePendingRumours(state,market,11);
    expect(events).toHaveLength(1);
    expect(events[0].headline).toContain("debunked");
    expect(state.pendingNews).toHaveLength(0);
    expect(market.find(s=>s.ticker==="MSFT")!.price).toBeLessThan(before);
    expect(resolvePendingRumours(state,market,12)).toHaveLength(0);
  });

  it("unlocks progression only when the underlying achievement condition is met", () => {
    const state=createGameState();
    const market=createMarket();
    state.holdings.MSFT={quantity:1,averageCost:100};
    state.holdSince.MSFT=1;
    state.market.day=8;
    const unlocked=evaluateAchievements(state,market);
    expect(unlocked.map(item=>item.id)).toContain("Diamond Hands");
    expect(unlocked.map(item=>item.id)).not.toContain("First Profit");
    expect(state.achievements).toContain("Diamond Hands");
    expect(evaluateAchievements(state,market)).toHaveLength(0);
  });
  it("rolls an unclaimed weekly challenge forward after its grace week", () => {
    const market = createMarket();
    const state = createGameState();
    state.market.day = 15;
    state.weeklyChallenge = { ...state.weeklyChallenge, week: 1, joined: true, claimed: false, startValue: 10000 };
    const startingCash = state.cash;
    updateProgression(state, market, 123);
    expect(state.weeklyChallenge.week).toBe(3);
    expect(state.weeklyChallenge.joined).toBe(false);
    expect(state.cash).toBeGreaterThan(startingCash);
    expect(state.activity.some(item => item.type === "weekly-reward")).toBe(true);
  });

});