import { describe, expect, it } from "vitest";
import { calculateNetWorth, createGameState } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";
import { netWorthBreakdown } from "@/lib/net-worth";

describe("net worth breakdown", () => {
  it("adds up to the engine's net worth and reports invested cost per class", () => {
    const stocks = createMarket(731991);
    const state = createGameState();
    const msft = stocks.find(stock => stock.ticker === "MSFT")!;
    state.holdings = { MSFT: { quantity: 2, averageCost: msft.price - 10 } } as typeof state.holdings;
    state.savings = 1200;
    state.loan = 500;
    const breakdown = netWorthBreakdown(state, stocks);
    expect(breakdown.netWorth).toBeCloseTo(calculateNetWorth(state, stocks), 6);
    const stocksClass = breakdown.classes.find(item => item.id === "stocks")!;
    expect(stocksClass.current).toBeCloseTo(msft.price * 2, 6);
    expect(stocksClass.current - stocksClass.invested).toBeCloseTo(20, 6);
    expect(stocksClass.split[0].label).toBe(msft.sector);
    const cash = breakdown.classes.find(item => item.id === "cash")!;
    expect(cash.parts.map(part => part.label)).toEqual(["Cash", "Savings"]);
    expect(cash.current).toBe(state.cash + 1200);
    expect(breakdown.loan).toBe(500);
  });
});
