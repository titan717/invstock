import { describe, expect, it } from "vitest";
import { createCryptoMarket, executeCryptoTrade, stakeCrypto, unstakeCrypto, advanceCryptoMarket, type CryptoPortfolio } from "@/lib/crypto";

describe("simulated crypto exchange", () => {
  it("creates a distinct crypto market with the expected major assets", () => {
    const market = createCryptoMarket(42);
    expect(market.map(asset => asset.symbol)).toEqual(["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE"]);
    expect(market.every(asset => asset.price > 0 && asset.history.length > 0)).toBe(true);
  });

  it("buys and sells fractional crypto while applying fees", () => {
    const market = createCryptoMarket(42);
    const btc = market.find(asset => asset.symbol === "BTC")!;
    const portfolio: CryptoPortfolio = { cash: 100000, holdings: {} };
    const bought = executeCryptoTrade(portfolio, btc, "buy", 0.25);
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(bought.portfolio.holdings.BTC.quantity).toBeCloseTo(0.25);
    expect(bought.portfolio.cash).toBeLessThan(100000);
    const sold = executeCryptoTrade(bought.portfolio, btc, "sell", 0.1);
    expect(sold.ok).toBe(true);
    if (!sold.ok) return;
    expect(sold.portfolio.holdings.BTC.quantity).toBeCloseTo(0.15);
  });

  it("rejects unaffordable buys and overselling without mutating the original portfolio", () => {
    const market = createCryptoMarket(42);
    const btc = market.find(asset => asset.symbol === "BTC")!;
    const portfolio: CryptoPortfolio = { cash: 1, holdings: {} };
    expect(executeCryptoTrade(portfolio, btc, "buy", 1).ok).toBe(false);
    expect(executeCryptoTrade(portfolio, btc, "sell", 0.1).ok).toBe(false);
    expect(portfolio).toEqual({ cash: 1, holdings: {} });
  });

  it("stakes and unstakes available crypto without losing quantity", () => {
    const portfolio: CryptoPortfolio = { cash: 0, holdings: { ETH: { quantity: 2, staked: 0 } } };
    const staked = stakeCrypto(portfolio, "ETH", 1.5);
    expect(staked.ok).toBe(true);
    if (!staked.ok) return;
    expect(staked.portfolio.holdings.ETH.staked).toBe(1.5);
    const unstaked = unstakeCrypto(staked.portfolio, "ETH", 0.5);
    expect(unstaked.ok).toBe(true);
    if (!unstaked.ok) return;
    expect(unstaked.portfolio.holdings.ETH.staked).toBe(1);
  });

  it("advances prices deterministically and bounds extreme moves", () => {
    const market = createCryptoMarket(42);
    const nextA = advanceCryptoMarket(market, 99);
    const nextB = advanceCryptoMarket(market, 99);
    expect(nextA.map(asset => asset.price)).toEqual(nextB.map(asset => asset.price));
    expect(nextA.every(asset => asset.price > 0 && asset.history.length <= 390)).toBe(true);
  });
});
