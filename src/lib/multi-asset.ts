export type MultiAssetClass = "forex" | "commodity" | "bond";
export type MultiAssetInstrument = {
  symbol: string;
  name: string;
  assetClass: MultiAssetClass;
  price: number;
  changePct: number;
  volatility: number;
  annualYield: number;
  unit: string;
  description: string;
  history: number[];
};
export type MultiAssetHolding = { quantity: number; averageCost: number };
export type MultiAssetMacro = { interestRateDelta?: number; inflation?: number; riskOff?: boolean };
export type MultiAssetTradeResult =
  | { ok: true; cash: number; holdings: Record<string, MultiAssetHolding>; fee: number; realizedPnl: number }
  | { ok: false; reason: string; cash: number; holdings: Record<string, MultiAssetHolding> };

const catalog: Omit<MultiAssetInstrument, "history" | "changePct">[] = [
  { symbol: "EUR", name: "Euro", assetClass: "forex", price: 1.08, volatility: 0.004, annualYield: 0, unit: "1 EUR", description: "Euro exposure, valued in USD." },
  { symbol: "GBP", name: "British Pound", assetClass: "forex", price: 1.27, volatility: 0.005, annualYield: 0, unit: "1 GBP", description: "Sterling exposure, valued in USD." },
  { symbol: "JPY", name: "Japanese Yen", assetClass: "forex", price: 0.0067, volatility: 0.0045, annualYield: 0, unit: "100 JPY", description: "Yen exposure, quoted per 100 JPY." },
  { symbol: "INR", name: "Indian Rupee", assetClass: "forex", price: 0.012, volatility: 0.003, annualYield: 0, unit: "1 INR", description: "Rupee exposure, valued in USD." },
  { symbol: "AED", name: "UAE Dirham", assetClass: "forex", price: 0.272, volatility: 0.002, annualYield: 0, unit: "1 AED", description: "Dirham exposure, valued in USD." },
  { symbol: "CHF", name: "Swiss Franc", assetClass: "forex", price: 1.12, volatility: 0.004, annualYield: 0, unit: "1 CHF", description: "Swiss franc exposure, valued in USD." },
  { symbol: "GOLD", name: "Gold", assetClass: "commodity", price: 2300, volatility: 0.012, annualYield: 0, unit: "troy oz", description: "Precious metal, commonly used as a defensive asset." },
  { symbol: "SILVER", name: "Silver", assetClass: "commodity", price: 28, volatility: 0.018, annualYield: 0, unit: "troy oz", description: "Precious metal with industrial demand." },
  { symbol: "OIL", name: "Crude Oil", assetClass: "commodity", price: 78, volatility: 0.022, annualYield: 0, unit: "barrel", description: "Energy commodity affected by supply and demand." },
  { symbol: "NATGAS", name: "Natural Gas", assetClass: "commodity", price: 2.5, volatility: 0.035, annualYield: 0, unit: "MMBtu", description: "Energy commodity with seasonal volatility." },
  { symbol: "COPPER", name: "Copper", assetClass: "commodity", price: 4.1, volatility: 0.016, annualYield: 0, unit: "lb", description: "Industrial metal sensitive to construction and manufacturing." },
  { symbol: "UST10", name: "US Treasury 10Y", assetClass: "bond", price: 98.2, volatility: 0.003, annualYield: 4.2, unit: "per $100 face value", description: "Simulated US government bond with a 4.2% annual coupon." },
  { symbol: "UST2", name: "US Treasury 2Y", assetClass: "bond", price: 99.1, volatility: 0.0025, annualYield: 4.6, unit: "per $100 face value", description: "Short-duration US government bond." },
  { symbol: "UKGILT10", name: "UK Gilt 10Y", assetClass: "bond", price: 97.8, volatility: 0.0035, annualYield: 4.1, unit: "per $100 face value", description: "Simulated UK government bond." },
  { symbol: "INDGSEC10", name: "India G-Sec 10Y", assetClass: "bond", price: 96.5, volatility: 0.0035, annualYield: 7, unit: "per $100 face value", description: "Simulated Indian government bond." },
  { symbol: "BUND10", name: "German Bund 10Y", assetClass: "bond", price: 98.5, volatility: 0.003, annualYield: 2.5, unit: "per $100 face value", description: "Simulated German government bond." },
];

function makeRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createMultiAssetMarket(seed = 731991): MultiAssetInstrument[] {
  const random = makeRandom(seed);
  return catalog.map(item => {
    let price = item.price;
    const history = Array.from({ length: 40 }, () => {
      price = Math.max(item.price * 0.5, price * (1 + (random() - 0.5) * item.volatility * 1.4));
      return Number(price.toFixed(6));
    });
    return { ...item, price: Number(price.toFixed(6)), changePct: (price / item.price - 1) * 100, history };
  });
}

export function advanceMultiAssetMarket(market: MultiAssetInstrument[], seed: number, macro: MultiAssetMacro = {}): MultiAssetInstrument[] {
  const random = makeRandom(seed);
  const rateShock = Number.isFinite(macro.interestRateDelta) ? Number(macro.interestRateDelta) : 0;
  const inflation = Math.max(-2, Math.min(3, Number(macro.inflation ?? 0)));
  return market.map(asset => {
    const noise = (random() - 0.5) * 2 * asset.volatility;
    let macroMove = 0;
    if (asset.assetClass === "bond") macroMove -= rateShock * 0.0008;
    if (asset.assetClass === "commodity") macroMove += inflation * 0.0012;
    if (asset.assetClass === "forex" && macro.riskOff) macroMove += asset.symbol === "CHF" || asset.symbol === "JPY" ? 0.001 : -0.0006;
    const move = Math.max(-0.12, Math.min(0.12, noise + macroMove));
    const price = Math.max(0.000001, asset.price * (1 + move));
    return { ...asset, price: Number(price.toFixed(6)), changePct: move * 100, history: [...asset.history.slice(-199), Number(price.toFixed(6))] };
  });
}

export function executeMultiAssetTrade(cash: number, holdings: Record<string, MultiAssetHolding>, market: MultiAssetInstrument[], symbol: string, side: "buy" | "sell", quantity: number): MultiAssetTradeResult {
  const asset = market.find(item => item.symbol === symbol);
  if (!asset) return { ok: false, reason: "Multi-asset instrument not found.", cash, holdings };
  if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, reason: "Enter a quantity greater than zero.", cash, holdings };
  const current = holdings[symbol] ?? { quantity: 0, averageCost: 0 };
  const fillPrice = asset.price * (side === "buy" ? 1.0002 : 0.9998);
  const notional = fillPrice * quantity;
  const fee = notional * 0.0005;
  if (side === "buy") {
    const total = notional + fee;
    if (!Number.isFinite(cash) || cash < total) return { ok: false, reason: "Not enough cash for this order.", cash, holdings };
    const nextQuantity = current.quantity + quantity;
    const averageCost = (current.quantity * current.averageCost + total) / nextQuantity;
    return { ok: true, cash: cash - total, holdings: { ...holdings, [symbol]: { quantity: nextQuantity, averageCost } }, fee, realizedPnl: 0 };
  }
  if (quantity > current.quantity) return { ok: false, reason: "You cannot sell more than your available position.", cash, holdings };
  const nextQuantity = current.quantity - quantity;
  const nextHoldings = { ...holdings };
  if (nextQuantity <= 0.00000001) delete nextHoldings[symbol];
  else nextHoldings[symbol] = { ...current, quantity: nextQuantity };
  const proceeds = notional - fee;
  return { ok: true, cash: cash + proceeds, holdings: nextHoldings, fee, realizedPnl: (fillPrice - current.averageCost) * quantity - fee };
}

export function calculateMultiAssetValue(holdings: Record<string, MultiAssetHolding>, market: MultiAssetInstrument[]): number {
  return Object.entries(holdings).reduce((total, [symbol, holding]) => total + holding.quantity * (market.find(asset => asset.symbol === symbol)?.price ?? 0), 0);
}

export function accrueBondIncome(holdings: Record<string, MultiAssetHolding>, market: MultiAssetInstrument[], minutes: number): number {
  const elapsed = Number.isFinite(minutes) ? Math.max(0, Math.min(10080, minutes)) : 0;
  return Object.entries(holdings).reduce((total, [symbol, holding]) => {
    const asset = market.find(item => item.symbol === symbol && item.assetClass === "bond");
    return total + (asset ? holding.quantity * asset.price * (asset.annualYield / 100) * elapsed / (365 * 390) : 0);
  }, 0);
}
