import type { Stock } from "@/lib/market";

export type LiveQuote = { price: number; previousClose: number; changePct: number; history: number[]; time: number };
export type LiveQuoteMap = Record<string, LiveQuote>;
export type LiveDetail = { ticker: string; price: number; previousClose: number; dayHigh: number | null; dayLow: number | null; yearHigh: number | null; yearLow: number | null; volume: number | null; exchange: string | null; time: number; news: { title: string; publisher: string; link: string; time: number }[] };

/** Simulator tickers whose exchange symbol differs. Tickers mapped to null are fictional. */
export const EXCHANGE_SYMBOLS: Record<string, string | null> = { VISA: "V", BTCX: null };

export const exchangeSymbol = (ticker: string): string | null => (ticker in EXCHANGE_SYMBOLS ? EXCHANGE_SYMBOLS[ticker] : ticker);

export const isLiveQuoteFresh = (quote: LiveQuote | undefined, now = Date.now()) => !!quote && now / 1000 - quote.time < 15 * 60;

/** Overrides simulated prices with exchange quotes for every ticker that has one. */
export function applyLiveQuotes(stocks: Stock[], quotes: LiveQuoteMap | null): Stock[] {
  if (!quotes) return stocks;
  let changed = false;
  const next = stocks.map(stock => {
    const quote = quotes[stock.ticker];
    if (!quote || !(quote.price > 0)) return stock;
    const history = quote.history.length ? quote.history : stock.history;
    if (stock.price === quote.price && stock.history === history) return stock;
    changed = true;
    return { ...stock, price: quote.price, change: quote.changePct, history };
  });
  return changed ? next : stocks;
}

type SparkEntry = { close?: (number | null)[]; timestamp?: number[]; previousClose?: number; chartPreviousClose?: number; end?: number };

/** Parses a Yahoo Finance spark payload keyed by exchange symbol into simulator tickers. */
export function parseSpark(payload: Record<string, SparkEntry>, tickers: string[]): LiveQuoteMap {
  const result: LiveQuoteMap = {};
  for (const ticker of tickers) {
    const symbol = exchangeSymbol(ticker);
    const entry = symbol ? payload[symbol] : undefined;
    if (!entry?.close?.length) continue;
    const history = entry.close.filter((value): value is number => typeof value === "number" && Number.isFinite(value)).map(value => Number(value.toFixed(2)));
    const price = history.at(-1);
    if (!price) continue;
    const previousClose = entry.previousClose ?? entry.chartPreviousClose ?? history[0];
    result[ticker] = { price, previousClose, changePct: previousClose ? (price / previousClose - 1) * 100 : 0, history, time: entry.timestamp?.at(-1) ?? entry.end ?? 0 };
  }
  return result;
}
