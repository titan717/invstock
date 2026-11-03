import { describe, expect, it } from "vitest";
import {
  advanceBusinessEconomy,
  applyOfflineBusinessEarnings,
  calculateNetWorth,
  createGameState,
  hireBusinessEmployeeAction,
  purchaseBusinessAction,
} from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

describe("business empire integration", () => {
  it("moves purchase cost from cash into business equity without losing net worth", () => {
    const state = createGameState();
    state.cash = 25000;
    const before = calculateNetWorth(state, createMarket());
    const result = purchaseBusinessAction(state, "retail-shop", "Bengaluru");
    expect(result.ok).toBe(true);
    expect(state.cash).toBe(15000);
    expect(state.businesses).toHaveLength(1);
    expect(calculateNetWorth(state, createMarket())).toBeCloseTo(before);
  });

  it("hires staff and adds company profit to the shared cash balance as time advances", () => {
    const state = createGameState();
    state.cash = 25000;
    purchaseBusinessAction(state, "retail-shop", "Bengaluru");
    const business = state.businesses[0];
    expect(hireBusinessEmployeeAction(state, business.id, "manager", "Asha").ok).toBe(true);
    const cashBefore = state.cash;
    const profit = advanceBusinessEconomy(state, 390);
    expect(profit).toBeGreaterThan(0);
    expect(state.cash).toBeCloseTo(cashBefore + profit);
    expect(state.businesses[0].employees).toHaveLength(1);
  });

  it("does not accrue offline income while the simulation is paused", () => {
    const state = createGameState();
    state.cash = 25000;
    purchaseBusinessAction(state, "retail-shop", "Bengaluru");
    state.lastActiveAt = Date.now() - 60 * 60 * 1000;
    state.settings.speed = 0;
    const cashBefore = state.cash;
    const offline = applyOfflineBusinessEarnings(state, 60 * 60 * 1000);
    expect(offline.minutes).toBe(0);
    expect(state.cash).toBe(cashBefore);
  });

  it("caps offline business earnings to eight hours and ignores clock rollback", () => {
    const state = createGameState();
    state.cash = 25000;
    purchaseBusinessAction(state, "retail-shop", "Bengaluru");
    state.lastActiveAt = Date.now() - 1000;
    const offline = applyOfflineBusinessEarnings(state, 10 * 60 * 60 * 1000);
    expect(offline.minutes).toBe(480);
    expect(offline.earned).toBeGreaterThan(0);
    const before = state.cash;
    const rollback = applyOfflineBusinessEarnings(state, -60000);
    expect(rollback.minutes).toBe(0);
    expect(state.cash).toBe(before);
  });
});
