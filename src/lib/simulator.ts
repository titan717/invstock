import type { Stock } from "@/lib/market";

export type Holding = { quantity: number; averageCost: number };
export type Portfolio = { cash: number; holdings: Record<string,Holding>; realizedPnl: number; trades: number };
export type TradeResult = { ok: true; portfolio: Portfolio; quantity: number; executionPrice: number; fee: number } | { ok: false; reason: string };

export const INITIAL_DEPOSIT = 10100;\n\nexport const initialPortfolio: Portfolio = {
  cash: 265.5,
  holdings: {
    MSFT: {quantity: 8.061758, averageCost: 405},
    NVDA: {quantity: 22, averageCost: 182},
    AAPL: {quantity: 10, averageCost: 245}
  },
  realizedPnl: 0,
  trades: 0
};

export function portfolioValue(portfolio: Portfolio, stocks: Stock[]): number {
  return portfolio.cash + Object.entries(portfolio.holdings).reduce((total,[ticker,holding]) => {
    const stock = stocks.find(item => item.ticker === ticker);
    return total + (stock?.price ?? 0) * holding.quantity;
  }, 0);
}

export function executeTrade(portfolio: Portfolio, stock: Stock, side: "buy" | "sell", quantity: number): TradeResult {
  if (!Number.isFinite(quantity) || quantity <= 0) return {ok:false,reason:"Enter a valid quantity."};
  const fee = Math.max(.01, stock.price * quantity * .0005);
  const executionPrice = stock.price * (side === "buy" ? 1.0007 : .9993);
  const gross = executionPrice * quantity;
  const next: Portfolio = {...portfolio, holdings:{...portfolio.holdings}, trades:portfolio.trades + 1};
  if (side === "buy") {
    const total = gross + fee;
    if (total > portfolio.cash + 1e-8) return {ok:false,reason:"Not enough buying power for this order."};
    const previous = next.holdings[stock.ticker];
    const oldQuantity = previous?.quantity ?? 0;
    const newQuantity = oldQuantity + quantity;
    next.holdings[stock.ticker] = {quantity:newQuantity,averageCost:((previous?.averageCost ?? 0)*oldQuantity + total)/newQuantity};
    next.cash = portfolio.cash - total;
  } else {
    const previous = next.holdings[stock.ticker];
    if (!previous || quantity > previous.quantity + 1e-8) return {ok:false,reason:"You do not own enough shares to place this order."};
    next.cash = portfolio.cash + gross - fee;
    next.realizedPnl = portfolio.realizedPnl + (executionPrice - previous.averageCost) * quantity - fee;
    const remaining = previous.quantity - quantity;
    if (remaining < 1e-8) delete next.holdings[stock.ticker];
    else next.holdings[stock.ticker] = {...previous,quantity:remaining};
  }
  return {ok:true,portfolio:next,quantity,executionPrice,fee};
}
