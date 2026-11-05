import { describe, expect, it } from "vitest";
import { createGameState } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

const initialStocks = createMarket();
import { addPriceAlert, createSip, markRecentlyViewed, removePriceAlert, setSipStatus, triggerPriceAlerts } from "@/lib/stock-plans";

describe("stock plans", () => {
  it("creates and pauses a SIP without mutating the source state", () => {
    const state = createGameState();
    const next = createSip(state, "NVDA", 100, "monthly");
    expect(state.sips).toHaveLength(0);
    expect(next.sips[0]).toMatchObject({ ticker: "NVDA", amount: 100, frequency: "monthly", status: "active" });
    expect(setSipStatus(next, next.sips[0].id, "paused").sips[0].status).toBe("paused");
  });

  it("triggers price alerts once the target is crossed", () => {
    const stock = initialStocks[0];
    let state = addPriceAlert(createGameState(), stock.ticker, stock.price * 1.1, stock.price);
    expect(state.priceAlerts[0].direction).toBe("above");
    expect(triggerPriceAlerts(state, initialStocks).triggered).toHaveLength(0);
    const moved = initialStocks.map(item => (item.ticker === stock.ticker ? { ...item, price: stock.price * 1.2 } : item));
    const run = triggerPriceAlerts(state, moved);
    expect(run.triggered).toHaveLength(1);
    expect(run.state.priceAlerts).toHaveLength(0);
    state = removePriceAlert(state, state.priceAlerts[0].id);
    expect(state.priceAlerts).toHaveLength(0);
  });

  it("keeps a de-duplicated recently viewed list", () => {
    let state = markRecentlyViewed(createGameState(), "NVDA");
    state = markRecentlyViewed(state, "AAPL");
    state = markRecentlyViewed(state, "NVDA");
    expect(state.recentlyViewed).toEqual(["NVDA", "AAPL"]);
  });
});
