import { describe, expect, it } from "vitest";
import { calculateNetWorth, createGameState, cryptoTradeAction, hydrateGameState, buildingAction, advanceGameDay } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

describe("financial empire game state", () => {
  it("migrates version-two saves to version three without losing the stock portfolio", () => {
    const state = hydrateGameState({
      version: 2,
      cash: 2500,
      holdings: { MSFT: { quantity: 2, averageCost: 300 } },
      settings: { speed: 2 },
    }, createMarket());
    expect(state.version).toBe(4);
    expect(state.cash).toBe(2500);
    expect(state.holdings.MSFT.quantity).toBe(2);
    expect(state.settings.currency).toBe("USD");
    expect(state.settings.difficulty).toBe("normal");
    expect(state.cryptoMarket.length).toBe(6);
  });

  it("trades crypto from shared cash and includes crypto holdings in total net worth", () => {
    const state = createGameState(42);
    const initialCash = state.cash;
    const trade = cryptoTradeAction(state, "BTC", "buy", 0.001);
    expect(trade.ok).toBe(true);
    expect(state.cash).toBeLessThan(initialCash);
    expect(state.cryptoHoldings.BTC.quantity).toBeCloseTo(0.001);
    const btcPrice = state.cryptoMarket.find(asset => asset.symbol === "BTC")!.price;
    expect(calculateNetWorth(state, createMarket())).toBeCloseTo(state.cash + btcPrice * 0.001);
  });

  it("applies selected difficulty to property costs and daily loan interest", () => {
    const state = createGameState();
    state.settings.difficulty = "hard";
    state.cash = 5000;
    state.loan = 1000000;
    expect(buildingAction(state, createMarket(), "buy", "Coffee Cafe").ok).toBe(true);
    expect(state.buildings[0].cost).toBeCloseTo(1800 * 1.15);
    const previousLoan = state.loan;
    advanceGameDay(state, createMarket());
    expect(state.loan).toBeGreaterThan(previousLoan);
  });

  it("rejects an invalid crypto symbol without changing cash", () => {
    const state = createGameState();
    const cash = state.cash;
    expect(cryptoTradeAction(state, "NOPE", "buy", 1).ok).toBe(false);
    expect(state.cash).toBe(cash);
  });
});
