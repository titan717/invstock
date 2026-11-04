import { describe, expect, it } from "vitest";
import { createMarket } from "@/lib/market";
import { createGameState } from "@/lib/game-engine";
import {
  createWorldNewsEvent,
  applyWorldNewsToMarket,
  getWorldIndustryModifiers,
  pruneExpiredWorldNews,
} from "@/lib/world-economy";

describe("dynamic world economy news", () => {
  it("generates deterministic stories with a source, reliability and finite duration", () => {
    const market = createMarket();
    const a = createWorldNewsEvent(market, 12, 123456);
    const b = createWorldNewsEvent(market, 12, 123456);
    expect(a).toEqual(b);
    expect(a.headline.length).toBeGreaterThan(8);
    expect(a.source).toBeTruthy();
    expect(a.reliability).toBeGreaterThanOrEqual(0);
    expect(a.reliability).toBeLessThanOrEqual(1);
    expect(a.expiresDay).toBeGreaterThan(a.day);
  });

  it("moves only the affected stock sectors when a sector story breaks", () => {
    const market = createMarket();
    const event = createWorldNewsEvent(market, 5, 1);
    const affected = new Set(event.tickers);
    const next = applyWorldNewsToMarket(market, event);
    expect(next.some((stock, index) => affected.has(stock.ticker) && stock.price !== market[index].price)).toBe(true);
    expect(next.every((stock, index) => affected.has(stock.ticker) || stock.price === market[index].price)).toBe(true);
  });

  it("changes business demand and operating costs while the story is active", () => {
    const market = createMarket();
    const event = createWorldNewsEvent(market, 5, 4);
    const active = getWorldIndustryModifiers([event], event.affectedIndustries[0], 5);
    const expired = getWorldIndustryModifiers([event], event.affectedIndustries[0], event.expiresDay + 1);
    expect(active.demand).not.toBe(1);
    expect(active.costs).not.toBe(1);
    expect(expired).toEqual({ demand: 1, costs: 1 });
  });

  it("prunes expired stories without deleting ongoing or unrelated news", () => {
    const market = createMarket();
    const active = createWorldNewsEvent(market, 3, 7);
    const old = { ...active, id: active.id + 1, expiresDay: 2 };
    const state = createGameState();
    state.news = [active, old, { id: 99, headline: "Old market item", body: "Historic", tickers: [], sentiment: 0, type: "macro", day: 1 }];
    pruneExpiredWorldNews(state, 3);
    expect(state.news.map(item => item.id)).toEqual([active.id, 99]);
  });
});
