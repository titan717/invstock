import { describe, expect, it } from "vitest";
import {
  createGameState,
  hydrateGameState,
  multiAssetTradeAction,
  advanceBusinessEconomy,
  calculateNetWorth,
} from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

describe("multi-asset game integration", () => {
  it("migrates version-four saves with a default multi-asset market", () => {
    const state = createGameState();
    const old = { ...state, version: 4, multiAssetMarket: undefined, multiAssetHoldings: undefined };
    const restored = hydrateGameState(old, createMarket());
    expect(restored.version).toBe(5);
    expect(restored.multiAssetMarket.length).toBeGreaterThan(0);
    expect(restored.multiAssetHoldings).toEqual({});
  });

  it("trades forex and commodities through the shared cash balance and net worth", () => {
    const state = createGameState();
    state.cash = 100000;
    const before = calculateNetWorth(state, createMarket());
    const trade = multiAssetTradeAction(state, "GOLD", "buy", 1);
    expect(trade.ok).toBe(true);
    expect(state.multiAssetHoldings.GOLD.quantity).toBe(1);
    expect(state.cash).toBeLessThan(100000);
    expect(calculateNetWorth(state, createMarket())).toBeLessThan(before);
  });

  it("adds simulated coupon income from government bond holdings", () => {
    const state = createGameState();
    state.multiAssetHoldings.UST10 = { quantity: 100, averageCost: 98 };
    const cash = state.cash;
    advanceBusinessEconomy(state, 390);
    expect(state.cash).toBeGreaterThan(cash);
  });
});
