import type { GameState, OptionPosition } from "@/lib/game-engine";
import type { Stock } from "@/lib/market";
import { optionValue, type OptionType } from "@/lib/options-engine";

export const CONTRACT_SIZE = 100;
/** Flat per-contract commission, matching common US broker pricing. */
export const OPTION_FEE_PER_CONTRACT = 0.65;

export type OptionOrder = { ticker: string; type: OptionType; strike: number; daysToExpiry: number; contracts: number; price: number; iv: number };
export type OptionResult = { ok: true; state: GameState; amount: number; fee: number } | { ok: false; reason: string };

const positionKey = (ticker: string, type: OptionType, strike: number, expiryDay: number) => `${ticker}-${type}-${strike}-${expiryDay}`;

export const optionCost = (contracts: number, price: number) => contracts * price * CONTRACT_SIZE + contracts * OPTION_FEE_PER_CONTRACT;

/** Buy to open. Debits premium plus commission and merges into an existing identical position. */
export function buyOption(state: GameState, order: OptionOrder): OptionResult {
  const contracts = Math.floor(order.contracts);
  if (!(contracts > 0)) return { ok: false, reason: "Enter at least 1 contract." };
  if (!(order.price > 0)) return { ok: false, reason: "This contract has no ask price." };
  if (order.daysToExpiry < 1) return { ok: false, reason: "This contract expires today." };
  const fee = contracts * OPTION_FEE_PER_CONTRACT, total = optionCost(contracts, order.price);
  if (total > state.cash + 1e-9) return { ok: false, reason: "Not enough buying power for this order." };
  const next = structuredClone(state);
  const expiryDay = next.market.day + Math.ceil(order.daysToExpiry);
  const id = positionKey(order.ticker, order.type, order.strike, expiryDay);
  const existing = next.optionPositions.find(position => position.id === id);
  if (existing) {
    existing.premium = (existing.premium * existing.contracts + order.price * contracts) / (existing.contracts + contracts);
    existing.contracts += contracts;
    existing.iv = order.iv;
  } else {
    next.optionPositions.push({ id, ticker: order.ticker, type: order.type, strike: order.strike, expiryDay, contracts, premium: order.price, iv: order.iv, openedDay: next.market.day });
  }
  next.cash -= total;
  next.trades += 1;
  next.activity.unshift({ type: `option-buy-${order.type}`, ticker: order.ticker, qty: contracts, price: order.price, fee, amount: total, day: next.market.day });
  return { ok: true, state: next, amount: total, fee };
}

/** Sell to close part or all of a long position at the given bid. */
export function sellOption(state: GameState, id: string, contracts: number, price: number): OptionResult {
  const position = state.optionPositions.find(item => item.id === id);
  const quantity = Math.floor(contracts);
  if (!position) return { ok: false, reason: "You don't hold this contract." };
  if (!(quantity > 0) || quantity > position.contracts) return { ok: false, reason: `You can sell up to ${position.contracts} contract${position.contracts > 1 ? "s" : ""}.` };
  const fee = quantity * OPTION_FEE_PER_CONTRACT, proceeds = Math.max(0, quantity * price * CONTRACT_SIZE - fee);
  const next = structuredClone(state);
  const held = next.optionPositions.find(item => item.id === id)!;
  held.contracts -= quantity;
  next.optionPositions = next.optionPositions.filter(item => item.contracts > 0);
  next.cash += proceeds;
  next.realizedPnl += proceeds - quantity * position.premium * CONTRACT_SIZE;
  next.trades += 1;
  next.activity.unshift({ type: `option-sell-${position.type}`, ticker: position.ticker, qty: quantity, price, fee, amount: proceeds, day: next.market.day });
  return { ok: true, state: next, amount: proceeds, fee };
}

/** Cash-settles every position whose expiry day has arrived at intrinsic value; out-of-the-money contracts expire worthless. */
export function settleExpiredOptions(state: GameState, stocks: Stock[]): { state: GameState; settled: (OptionPosition & { payout: number })[] } {
  const due = state.optionPositions.filter(position => position.expiryDay <= state.market.day);
  if (!due.length) return { state, settled: [] };
  const prices = new Map(stocks.map(stock => [stock.ticker, stock.price]));
  const next = structuredClone(state);
  const settled = due.map(position => {
    const spot = prices.get(position.ticker) ?? 0;
    const payout = optionValue(spot, position.strike, 0, position.iv, position.type) * CONTRACT_SIZE * position.contracts;
    next.cash += payout;
    next.realizedPnl += payout - position.premium * CONTRACT_SIZE * position.contracts;
    next.activity.unshift({ type: payout > 0 ? "option-exercised" : "option-expired", ticker: position.ticker, qty: position.contracts, price: position.strike, amount: payout, day: next.market.day });
    return { ...position, payout };
  });
  next.optionPositions = next.optionPositions.filter(position => position.expiryDay > state.market.day);
  return { state: next, settled };
}

/** Current mark per share of a held position, using the engine price. */
export const positionMark = (position: OptionPosition, spot: number, day: number) => optionValue(spot, position.strike, Math.max(0, position.expiryDay - day), position.iv, position.type);
