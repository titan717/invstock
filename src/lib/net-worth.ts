import type { GameState } from "@/lib/game-engine";
import type { Stock } from "@/lib/market";
import { optionValue } from "@/lib/options-engine";

export type AssetClassId = "stocks" | "options" | "crypto" | "cash" | "property";
export type BreakdownPart = { label: string; detail: string; current: number; invested: number };
export type AssetClass = {
  id: AssetClassId;
  label: string;
  /** Count line used under the product row, e.g. "3 stocks". */
  countLabel: string;
  current: number;
  invested: number;
  /** Individual holdings inside the class (half-donut "allocation" card). */
  parts: BreakdownPart[];
  /** Grouping of the class by category (bar "split" card). */
  split: BreakdownPart[];
};
export type NetWorthBreakdown = { classes: AssetClass[]; assets: number; loan: number; netWorth: number };

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function group(parts: (BreakdownPart & { key: string })[]): BreakdownPart[] {
  const map = new Map<string, BreakdownPart>();
  for (const part of parts) {
    const existing = map.get(part.key);
    if (existing) { existing.current += part.current; existing.invested += part.invested; }
    else map.set(part.key, { label: part.key, detail: "", current: part.current, invested: part.invested });
  }
  return [...map.values()].sort((a, b) => b.current - a.current);
}

/** Splits net worth into the asset classes shown on the Net worth and Asset allocation screens. */
export function netWorthBreakdown(state: GameState, stocks: Stock[]): NetWorthBreakdown {
  const byTicker = new Map(stocks.map(stock => [stock.ticker, stock]));

  const stockParts = Object.entries(state.holdings).flatMap(([ticker, holding]) => {
    const stock = byTicker.get(ticker);
    if (!stock || holding.quantity <= 0) return [];
    return [{ key: stock.sector, label: ticker, detail: stock.name, current: stock.price * holding.quantity, invested: holding.averageCost * holding.quantity }];
  });

  const optionParts = (state.optionPositions ?? []).flatMap(position => {
    const spot = byTicker.get(position.ticker)?.price;
    if (spot === undefined) return [];
    const days = Math.max(0, position.expiryDay - state.market.day);
    const current = optionValue(spot, position.strike, days, position.iv, position.type) * 100 * position.contracts;
    const kind = position.type === "call" ? "Calls" : "Puts";
    return [{ key: kind, label: `${position.ticker} ${position.strike} ${position.type === "call" ? "Call" : "Put"}`, detail: plural(position.contracts, "contract"), current, invested: position.premium * 100 * position.contracts }];
  });

  const cryptoParts = Object.entries(state.cryptoHoldings).flatMap(([symbol, holding]) => {
    const asset = state.cryptoMarket.find(item => item.symbol === symbol);
    if (!asset || holding.quantity <= 0) return [];
    return [{ key: holding.staked > 0 ? "Staked" : "Wallet", label: symbol, detail: asset.name ?? symbol, current: asset.price * holding.quantity, invested: holding.averageCost * holding.quantity }];
  });

  const cashParts = [
    { key: "Cash", label: "Cash", detail: "Buying power", current: state.cash, invested: state.cash },
    { key: "Savings", label: "Savings", detail: "High-yield savings", current: state.savings, invested: state.savings }
  ].filter(part => part.current > 0);

  const propertyParts = [
    ...state.realEstate.map(property => ({ key: "Real estate", label: property.name, detail: property.city, current: property.value, invested: property.value })),
    ...state.buildings.map(building => ({ key: "Real estate", label: building.name, detail: `Level ${building.level}`, current: building.value, invested: building.cost })),
    ...state.businesses.map(business => ({ key: "Business", label: business.name, detail: business.city, current: business.value, invested: business.baseCost }))
  ];

  const build = (id: AssetClassId, label: string, countLabel: string, parts: (BreakdownPart & { key: string })[]): AssetClass => ({
    id, label, countLabel,
    current: parts.reduce((sum, part) => sum + part.current, 0),
    invested: parts.reduce((sum, part) => sum + part.invested, 0),
    parts: parts.map(({ label, detail, current, invested }) => ({ label, detail, current, invested })).sort((a, b) => b.current - a.current),
    split: group(parts)
  });

  const classes = [
    build("stocks", "Stocks", plural(stockParts.length, "stock"), stockParts),
    build("options", "Options", plural(optionParts.length, "position"), optionParts),
    build("crypto", "Crypto", plural(cryptoParts.length, "coin"), cryptoParts),
    build("cash", "Cash & savings", cashParts.length === 2 ? "Cash and savings" : cashParts[0]?.label ?? "Cash", cashParts),
    build("property", "Real estate & business", plural(propertyParts.length, "asset"), propertyParts)
  ];
  const assets = classes.reduce((sum, item) => sum + item.current, 0);
  return { classes, assets, loan: state.loan, netWorth: assets - state.loan };
}

export const allocationPct = (value: number, total: number) => (total > 0 ? (value / total) * 100 : 0);
