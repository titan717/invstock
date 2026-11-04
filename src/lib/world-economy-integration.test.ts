import { describe, expect, it } from "vitest";
import { createGameState, advanceBusinessEconomy, calculateNetWorth } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";
import { purchaseBusiness } from "@/lib/business-engine";
import { purchaseProperty } from "@/lib/real-estate";
import { getWorldIndustryModifiers } from "@/lib/world-economy";

describe("world economy integration", () => {
  it("uses active industry stories to adjust business revenue and operating costs", () => {
    const state = createGameState();
    const acquired = purchaseBusiness(100000, "retail-shop", "Bengaluru", "retail-1");
    if (!acquired.ok) throw new Error("fixture business purchase failed");
    state.businesses = [acquired.business];
    state.news = [{
      id: 1, headline: "Retail demand surge", body: "Demand rises", tickers: [], sentiment: 1,
      magnitude: 0.02, type: "world", day: 1, source: "Consumer Pulse", category: "industry",
      affectedIndustries: ["retail"], affectedSectors: ["Consumer"], reliability: 1,
      status: "confirmed", severity: "moderate", expiresDay: 4, demandImpact: 1.2, costImpact: 1.1,
    }];
    const before = state.businesses[0].totalProfit;
    advanceBusinessEconomy(state, 390);
    expect(state.businesses[0].totalProfit).toBeGreaterThan(before);
    expect(getWorldIndustryModifiers(state.news, "retail", 1)).toEqual({ demand: 1.2, costs: 1.1 });
  });

  it("includes rental property value in net worth while active local events change rent", () => {
    const state = createGameState();
    const purchase = purchaseProperty(100000, "retail-unit", "Bengaluru", "retail-property");
    if (!purchase.ok) throw new Error("fixture property purchase failed");
    state.cash = purchase.cash ?? 0;
    state.realEstate = [purchase.property];
    state.news = [{
      id: 2, headline: "Retail demand shock", body: "Demand drops", tickers: [], sentiment: -1,
      type: "world", day: 1, source: "Consumer Pulse", category: "industry",
      affectedIndustries: ["retail"], affectedSectors: ["Consumer"], reliability: 1,
      status: "confirmed", severity: "high", expiresDay: 2, demandImpact: 0.8, costImpact: 1.2,
    }];
    expect(calculateNetWorth(state, createMarket())).toBeGreaterThan(0);
    const beforeCash = state.cash;
    advanceBusinessEconomy(state, 390);
    expect(state.cash).toBeLessThan(beforeCash);
  });

  it("removes expired world events from the active news timeline", () => {
    const state = createGameState();
    state.market.day = 5;
    state.news = [{
      id: 3, headline: "Expired", body: "Old story", tickers: [], sentiment: -1,
      type: "world", day: 1, expiresDay: 4, affectedIndustries: ["banking"],
      demandImpact: 0.5, costImpact: 1.5,
    }];
    advanceBusinessEconomy(state, 1);
    expect(state.news).toHaveLength(0);
  });
});
