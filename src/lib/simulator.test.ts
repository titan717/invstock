import { describe, expect, it } from "vitest";
import { createMarket } from "@/lib/market";
import { executeTrade, initialPortfolio, portfolioValue } from "@/lib/simulator";

describe("simulator trading", () => {
  const market = createMarket();
  const msft = market.find(stock => stock.ticker === "MSFT")!;

  it("rejects a buy that exceeds available cash without mutating the portfolio", () => {
    const before = structuredClone(initialPortfolio);
    const result = executeTrade(before, msft, "buy", 1000);
    expect(result).toEqual({ok:false,reason:"Not enough buying power for this order."});
    expect(before).toEqual(initialPortfolio);
  });

  it("executes a valid buy and updates cash and weighted average cost", () => {
    const result = executeTrade(initialPortfolio, msft, "buy", .1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.portfolio.cash).toBeLessThan(initialPortfolio.cash);
    expect(result.portfolio.holdings.MSFT.quantity).toBeCloseTo(5.1);
    expect(result.portfolio.trades).toBe(initialPortfolio.trades + 1);
  });

  it("rejects selling more shares than the portfolio owns", () => {
    const result = executeTrade(initialPortfolio, msft, "sell", 999);
    expect(result).toEqual({ok:false,reason:"You do not own enough shares to place this order."});
  });

  it("values cash and holdings using the latest market prices", () => {
    expect(portfolioValue(initialPortfolio, market)).toBeCloseTo(
      initialPortfolio.cash + Object.entries(initialPortfolio.holdings).reduce((sum,[ticker,h]) => sum + market.find(s=>s.ticker===ticker)!.price*h.quantity,0)
    );
  });
});
