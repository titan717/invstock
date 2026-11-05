import { describe, expect, it } from "vitest";
import { calculateNetWorth, createGameState, hydrateGameState } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";
import { buyOption, CONTRACT_SIZE, OPTION_FEE_PER_CONTRACT, sellOption, settleExpiredOptions } from "@/lib/options-trading";

const stocks = createMarket();
const stock = stocks[0];
const order = { ticker: stock.ticker, type: "call" as const, strike: Math.round(stock.price), daysToExpiry: 5, contracts: 2, price: 1.5, iv: 0.4 };

describe("options trading", () => {
  it("buys to open, debiting premium and commission", () => {
    const state = createGameState();
    const result = buyOption(state, order);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.cash).toBeCloseTo(state.cash - 2 * 1.5 * CONTRACT_SIZE - 2 * OPTION_FEE_PER_CONTRACT);
    expect(result.state.optionPositions[0]).toMatchObject({ contracts: 2, premium: 1.5, expiryDay: state.market.day + 5 });
    expect(state.optionPositions).toHaveLength(0);
    expect(calculateNetWorth(result.state, stocks)).toBeGreaterThan(result.state.cash);
  });

  it("rejects orders beyond buying power", () => {
    const result = buyOption(createGameState(), { ...order, contracts: 500 });
    expect(result.ok).toBe(false);
  });

  it("sells to close and records realized P/L", () => {
    const bought = buyOption(createGameState(), order);
    if (!bought.ok) throw new Error("buy failed");
    const id = bought.state.optionPositions[0].id;
    const sold = sellOption(bought.state, id, 1, 2);
    expect(sold.ok).toBe(true);
    if (!sold.ok) return;
    expect(sold.state.optionPositions[0].contracts).toBe(1);
    expect(sold.state.realizedPnl).toBeCloseTo(bought.state.realizedPnl + (2 - 1.5) * CONTRACT_SIZE - OPTION_FEE_PER_CONTRACT);
    expect(sellOption(sold.state, id, 5, 2).ok).toBe(false);
  });

  it("cash-settles in-the-money contracts at expiry and survives a save round trip", () => {
    const bought = buyOption(createGameState(), { ...order, strike: stock.price - 10, contracts: 1 });
    if (!bought.ok) throw new Error("buy failed");
    const restored = hydrateGameState(JSON.parse(JSON.stringify(bought.state)), stocks);
    expect(restored.optionPositions).toHaveLength(1);
    restored.market.day += 5;
    const before = restored.cash;
    const run = settleExpiredOptions(restored, stocks);
    expect(run.settled[0].payout).toBeCloseTo(10 * CONTRACT_SIZE);
    expect(run.state.cash).toBeCloseTo(before + 10 * CONTRACT_SIZE);
    expect(run.state.optionPositions).toHaveLength(0);
  });
});
