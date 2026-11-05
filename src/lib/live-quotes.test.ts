import { describe, expect, it } from "vitest";
import { applyLiveQuotes, exchangeSymbol, parseSpark } from "@/lib/live-quotes";
import { createMarket } from "@/lib/market";

describe("live quotes", () => {
  it("maps simulator tickers to exchange symbols", () => {
    expect(exchangeSymbol("MSFT")).toBe("MSFT");
    expect(exchangeSymbol("VISA")).toBe("V");
    expect(exchangeSymbol("BTCX")).toBeNull();
  });

  it("parses spark payloads and skips missing closes", () => {
    const quotes = parseSpark({ V: { close: [300, null, 306], timestamp: [1, 2, 3], previousClose: 300 } }, ["VISA", "MSFT"]);
    expect(quotes.VISA).toMatchObject({ price: 306, previousClose: 300, history: [300, 306], time: 3 });
    expect(quotes.VISA.changePct).toBeCloseTo(2);
    expect(quotes.MSFT).toBeUndefined();
  });

  it("overrides only quoted stocks and keeps identity when nothing changes", () => {
    const stocks = createMarket(1);
    expect(applyLiveQuotes(stocks, null)).toBe(stocks);
    const next = applyLiveQuotes(stocks, { MSFT: { price: 555.8, previousClose: 520.99, changePct: 6.68, history: [550, 555.8], time: 1 } });
    expect(next.find(stock => stock.ticker === "MSFT")).toMatchObject({ price: 555.8, change: 6.68 });
    expect(next.find(stock => stock.ticker === "AAPL")).toBe(stocks.find(stock => stock.ticker === "AAPL"));
  });
});
