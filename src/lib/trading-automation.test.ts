import { describe, expect, it } from "vitest";
import { createMarket } from "@/lib/market";
import { executeTrade } from "@/lib/simulator";
import { MARKET_OPEN_MINUTE, createGameState, hydrateGameState, sessionTick, type GameState } from "@/lib/game-engine";
import {
  MARKET_CLOSE_MINUTE, MINUTES_PER_DAY, absoluteMarketTick, applyStockTrade, clockStepMinutes, enqueueOrder,
  isMarketOpen, processQueuedOrders, processSips, updateWatchlist,
} from "@/lib/trading-automation";

const market = createMarket();
const msft = market.find((stock) => stock.ticker === "MSFT")!;
const at = (state: GameState, day: number, minute: number): GameState => ({ ...state, market: { ...state.market, day, minute } });

describe("trading automation wiring", () => {
  it("initialises clock, queued orders and SIPs on a new game", () => {
    const state = createGameState();
    expect(state.clock).toEqual({ currentTime: 0, marketSpeed: "live", lastProcessedTick: 0 });
    expect(state.queuedOrders).toEqual([]);
    expect(state.sips).toEqual([]);
  });

  it("hydrates older saves that have no automation fields", () => {
    const state = hydrateGameState({ version: 4, market: { day: 3, minute: MARKET_OPEN_MINUTE + 10 } }, market);
    expect(state.clock.currentTime).toBe(2 * MINUTES_PER_DAY + 10);
    expect(state.queuedOrders).toEqual([]);
  });

  it("round-trips queued orders through a save", () => {
    const queued = enqueueOrder(createGameState(), { ticker: "msft", action: "buy", shares: 1, targetPrice: 9999 });
    const restored = hydrateGameState(JSON.parse(JSON.stringify(queued)), market);
    expect(restored.queuedOrders).toHaveLength(1);
    expect(restored.queuedOrders[0]).toMatchObject({ ticker: "MSFT", status: "pending" });
  });

  it("toggles the watchlist", () => {
    expect(updateWatchlist(createGameState(), { type: "toggle", ticker: "MSFT" }).watchlist).not.toContain("MSFT");
  });
});

describe("overnight session", () => {
  it("is closed from 4:00 PM to 9:30 AM", () => {
    const state = createGameState();
    expect(isMarketOpen(at(state, 1, MARKET_OPEN_MINUTE))).toBe(true);
    expect(isMarketOpen(at(state, 1, MARKET_CLOSE_MINUTE - 1))).toBe(true);
    expect(isMarketOpen(at(state, 1, MARKET_CLOSE_MINUTE))).toBe(false);
    expect(isMarketOpen(at(state, 2, 0))).toBe(false);
    expect(isMarketOpen(at(state, 2, MARKET_OPEN_MINUTE - 1))).toBe(false);
  });

  it("steps one minute while open and fast-forwards overnight, landing exactly on midnight and the open", () => {
    expect(clockStepMinutes(600)).toBe(1);
    let day = 1, minute = MARKET_CLOSE_MINUTE - 1, steps = 0;
    const visited: number[] = [];
    while (!(day === 2 && minute === MARKET_OPEN_MINUTE)) {
      minute += clockStepMinutes(minute);
      if (minute >= MINUTES_PER_DAY) { minute = 0; day += 1; }
      visited.push(minute);
      if (++steps > 100) throw new Error("overnight never reached the open");
    }
    expect(visited).toContain(0);
    expect(visited.slice(0, -1).every((m) => m >= MARKET_CLOSE_MINUTE || m < MARKET_OPEN_MINUTE)).toBe(true);
    expect(steps).toBeLessThanOrEqual(20);
  });

  it("keeps market and rumour ticks monotonic across midnight", () => {
    expect(absoluteMarketTick(2, 0)).toBeGreaterThan(absoluteMarketTick(1, 1439));
    expect(absoluteMarketTick(2, MARKET_OPEN_MINUTE)).toBeGreaterThan(absoluteMarketTick(2, 0));
    expect(sessionTick(2, 0)).toBeGreaterThanOrEqual(sessionTick(1, 1439));
  });
});

describe("shared fill logic", () => {
  it("fills a queued order at the open with the same spread and fee as a manual trade", () => {
    let state = enqueueOrder(at(createGameState(), 1, 1000), { ticker: "MSFT", action: "buy", shares: 2, targetPrice: 1e6 });
    state = { ...at(state, 2, MARKET_OPEN_MINUTE), clock: { ...state.clock, lastProcessedTick: absoluteMarketTick(2, MARKET_OPEN_MINUTE - 30) } };
    const manual = executeTrade({ cash: state.cash, holdings: {}, realizedPnl: 0, trades: 0 }, msft, "buy", 2);
    if (!manual.ok) throw new Error(manual.reason);

    const result = processQueuedOrders(state, market);
    expect(result.filled).toHaveLength(1);
    expect(result.state.cash).toBeCloseTo(manual.portfolio.cash, 8);
    expect(result.state.holdings.MSFT).toEqual(manual.portfolio.holdings.MSFT);
    expect(result.state.trades).toBe(1);
    expect(result.state.holdSince.MSFT).toBe(2);
    expect(result.state.activity[0]).toMatchObject({ type: "queued-buy", fee: manual.fee, price: manual.executionPrice });
  });

  it("does not fill queued orders before the opening bell", () => {
    let state = enqueueOrder(at(createGameState(), 1, 1000), { ticker: "MSFT", action: "buy", shares: 1, targetPrice: 1e6 });
    state = at(state, 2, 300);
    expect(processQueuedOrders(state, market).filled).toHaveLength(0);
  });

  it("charges SIPs the manual-trade fee and waits for the session to open", () => {
    const base = createGameState();
    const sip = { id: "s1", ticker: "MSFT", amount: 500, frequency: "daily" as const, nextExecutionTick: 0, status: "active" as const };
    const closed = processSips({ ...at(base, 1, 1000), sips: [sip] }, market);
    expect(closed.executed).toHaveLength(0);

    const open = { ...at(base, 2, MARKET_OPEN_MINUTE), sips: [sip] };
    const manual = applyStockTrade(open, msft, "buy", 500 / msft.price);
    if (!manual.ok) throw new Error(manual.reason);
    const run = processSips(open, market);
    expect(run.executed).toHaveLength(1);
    expect(run.state.cash).toBeCloseTo(manual.state.cash, 8);
    expect(run.state.trades).toBe(1);
    expect(run.state.sips[0].nextExecutionTick).toBe(absoluteMarketTick(2, MARKET_OPEN_MINUTE) + MINUTES_PER_DAY);
  });

  it("pauses a SIP when cash cannot cover amount plus fees", () => {
    const sip = { id: "s1", ticker: "MSFT", amount: 1e9, frequency: "daily" as const, nextExecutionTick: 0, status: "active" as const };
    const run = processSips({ ...createGameState(), sips: [sip] }, market);
    expect(run.paused[0].status).toBe("paused");
    expect(run.state.trades).toBe(0);
  });
});
