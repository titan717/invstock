import { describe, expect, it } from "vitest";
import { createMarket } from "@/lib/market";
import { MARKET_OPEN_MINUTE, MARKET_SESSION_MINUTES, createGameState, hydrateGameState } from "@/lib/game-engine";
import { enqueueOrder, isMarketOpen, processQueuedOrders, updateWatchlist } from "@/lib/trading-automation";

const market = createMarket();

describe("trading automation wiring", () => {
  it("initialises clock, queued orders and SIPs on a new game", () => {
    const state = createGameState();
    expect(state.clock).toEqual({ currentTime: 0, marketSpeed: "live", lastProcessedTick: 0 });
    expect(state.queuedOrders).toEqual([]);
    expect(state.sips).toEqual([]);
  });

  it("hydrates older saves that have no automation fields", () => {
    const state = hydrateGameState({ version: 4, market: { day: 3, minute: MARKET_OPEN_MINUTE + 10 } }, market);
    expect(state.clock.currentTime).toBe(2 * MARKET_SESSION_MINUTES + 10);
    expect(state.queuedOrders).toEqual([]);
  });

  it("round-trips queued orders through a save", () => {
    const queued = enqueueOrder(createGameState(), { ticker: "msft", action: "buy", shares: 1, targetPrice: 9999 });
    const restored = hydrateGameState(JSON.parse(JSON.stringify(queued)), market);
    expect(restored.queuedOrders).toHaveLength(1);
    expect(restored.queuedOrders[0]).toMatchObject({ ticker: "MSFT", status: "pending" });
  });

  it("fills a pending order on the tick that lands on market open", () => {
    let state = enqueueOrder(createGameState(), { ticker: "MSFT", action: "buy", shares: 1, targetPrice: 1e6 });
    state = { ...state, clock: { ...state.clock, lastProcessedTick: MARKET_SESSION_MINUTES - 1 }, market: { ...state.market, day: 2, minute: MARKET_OPEN_MINUTE } };
    const result = processQueuedOrders(state, market);
    expect(result.filled).toHaveLength(1);
    expect(result.state.holdings.MSFT.quantity).toBe(1);
  });

  it("reports the session window and toggles the watchlist", () => {
    const state = createGameState();
    expect(isMarketOpen(state)).toBe(true);
    expect(isMarketOpen({ ...state, market: { ...state.market, minute: MARKET_OPEN_MINUTE + MARKET_SESSION_MINUTES } })).toBe(false);
    expect(updateWatchlist(state, { type: "toggle", ticker: "MSFT" }).watchlist).not.toContain("MSFT");
  });
});
