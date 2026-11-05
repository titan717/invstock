import type { GameState, PriceAlert } from "@/lib/game-engine";
import { absoluteMarketTick, type SipFrequency } from "@/lib/trading-automation";
import type { Stock } from "@/lib/market";

/** Starts a recurring investment that processSips executes during the next trading session. */
export function createSip(state: GameState, ticker: string, amount: number, frequency: SipFrequency): GameState {
  const next = structuredClone(state);
  const tick = absoluteMarketTick(next.market.day, next.market.minute);
  next.sips = [...next.sips, { id: `sip-${ticker}-${Date.now().toString(36)}`, ticker, amount, frequency, nextExecutionTick: Math.max(0, tick), status: "active" }];
  next.activity.unshift({ type: "sip-created", ticker, amount, day: next.market.day });
  return next;
}

export function setSipStatus(state: GameState, id: string, status: "active" | "paused" | "cancelled"): GameState {
  const next = structuredClone(state);
  next.sips = next.sips.map(sip => (sip.id === id ? { ...sip, status, failureReason: status === "active" ? undefined : sip.failureReason } : sip));
  return next;
}

export function addPriceAlert(state: GameState, ticker: string, target: number, currentPrice: number): GameState {
  const next = structuredClone(state);
  const alert: PriceAlert = { id: `alert-${ticker}-${Date.now().toString(36)}`, ticker, target, direction: target >= currentPrice ? "above" : "below", createdDay: next.market.day };
  next.priceAlerts = [...next.priceAlerts.filter(item => !(item.ticker === ticker && item.target === target)), alert];
  return next;
}

export function removePriceAlert(state: GameState, id: string): GameState {
  return { ...state, priceAlerts: state.priceAlerts.filter(item => item.id !== id) };
}

/** Returns alerts whose target has been crossed and the state without them. Mutates nothing. */
export function triggerPriceAlerts(state: GameState, stocks: Stock[]): { state: GameState; triggered: PriceAlert[] } {
  if (!state.priceAlerts.length) return { state, triggered: [] };
  const prices = new Map(stocks.map(stock => [stock.ticker, stock.price]));
  const triggered = state.priceAlerts.filter(alert => {
    const price = prices.get(alert.ticker);
    return price !== undefined && (alert.direction === "above" ? price >= alert.target : price <= alert.target);
  });
  if (!triggered.length) return { state, triggered };
  return { state: { ...state, priceAlerts: state.priceAlerts.filter(alert => !triggered.includes(alert)) }, triggered };
}

export function markRecentlyViewed(state: GameState, ticker: string): GameState {
  if (state.recentlyViewed[0] === ticker) return state;
  return { ...state, recentlyViewed: [ticker, ...state.recentlyViewed.filter(item => item !== ticker)].slice(0, 12) };
}
