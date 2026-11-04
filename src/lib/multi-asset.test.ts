import { describe, expect, it } from "vitest";
import {
  createMultiAssetMarket,
  advanceMultiAssetMarket,
  executeMultiAssetTrade,
  calculateMultiAssetValue,
  accrueBondIncome,
} from "@/lib/multi-asset";

describe("forex, commodities and bond markets", () => {
  it("provides separate simulated instruments for all three asset classes", () => {
    const market = createMultiAssetMarket(123);
    expect(market.some(item => item.assetClass === "forex")).toBe(true);
    expect(market.some(item => item.assetClass === "commodity")).toBe(true);
    expect(market.some(item => item.assetClass === "bond")).toBe(true);
  });

  it("generates repeatable prices and advances markets without invalid values", () => {
    const first = createMultiAssetMarket(42);
    const second = createMultiAssetMarket(42);
    expect(first).toEqual(second);
    const advanced = advanceMultiAssetMarket(first, 987, { interestRateDelta: 0.25, inflation: 0.6, riskOff: true });
    expect(advanced).not.toEqual(first);
    expect(advanced.every(item => Number.isFinite(item.price) && item.price > 0)).toBe(true);
  });

  it("executes cash-backed buys and sells with fees and rejects short positions", () => {
    const market = createMultiAssetMarket();
    const asset = market.find(item => item.assetClass === "commodity");
    if (!asset) throw new Error("commodity fixture missing");
    const bought = executeMultiAssetTrade(100000, {}, market, asset.symbol, "buy", 2);
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(bought.cash).toBeLessThan(100000);
    expect(bought.holdings[asset.symbol].quantity).toBe(2);
    const sold = executeMultiAssetTrade(bought.cash, bought.holdings, market, asset.symbol, "sell", 1);
    expect(sold.ok).toBe(true);
    if (sold.ok) expect(sold.holdings[asset.symbol].quantity).toBe(1);
    expect(executeMultiAssetTrade(100000, {}, market, asset.symbol, "sell", 1).ok).toBe(false);
  });

  it("values all holdings in the shared USD base economy", () => {
    const market = createMultiAssetMarket();
    const asset = market[0];
    const value = calculateMultiAssetValue({ [asset.symbol]: { quantity: 3, averageCost: asset.price } }, market);
    expect(value).toBeCloseTo(asset.price * 3);
  });

  it("accrues coupon income only for bond holdings", () => {
    const market = createMultiAssetMarket();
    const bond = market.find(item => item.assetClass === "bond");
    if (!bond) throw new Error("bond fixture missing");
    const income = accrueBondIncome({ [bond.symbol]: { quantity: 100, averageCost: bond.price } }, market, 390);
    expect(income).toBeGreaterThan(0);
    const noBond = accrueBondIncome({}, market, 390);
    expect(noBond).toBe(0);
  });
});
