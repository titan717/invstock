import { describe, expect, it } from "vitest";
import {
  calculateNetWorth,
  createGameState,
  purchasePropertyAction,
  sellRealEstateAction,
  upgradeRealEstateAction,
  advanceBusinessEconomy,
} from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

describe("real estate integration", () => {
  it("moves purchase cash into property equity without changing total net worth", () => {
    const state = createGameState();
    state.cash = 100000;
    const before = calculateNetWorth(state, createMarket());
    const result = purchasePropertyAction(state, "studio-apartment", "Bengaluru");
    expect(result.ok).toBe(true);
    expect(state.realEstate).toHaveLength(1);
    expect(calculateNetWorth(state, createMarket())).toBeCloseTo(before);
  });

  it("earns rental income and appreciation in the shared empire simulation", () => {
    const state = createGameState();
    state.cash = 100000;
    purchasePropertyAction(state, "studio-apartment", "Bengaluru");
    const cashBefore = state.cash;
    const valueBefore = state.realEstate[0].value;
    const income = advanceBusinessEconomy(state, 390);
    expect(income).toBeGreaterThan(0);
    expect(state.cash).toBeGreaterThan(cashBefore);
    expect(state.realEstate[0].value).toBeGreaterThan(valueBefore);
  });

  it("renovates and sells owned real estate through shared cash", () => {
    const state = createGameState();
    state.cash = 100000;
    purchasePropertyAction(state, "studio-apartment", "Bengaluru");
    const propertyId = state.realEstate[0].id;
    expect(upgradeRealEstateAction(state, propertyId).ok).toBe(true);
    expect(state.realEstate[0].level).toBe(2);
    expect(sellRealEstateAction(state, propertyId).ok).toBe(true);
    expect(state.realEstate).toHaveLength(0);
  });
});
