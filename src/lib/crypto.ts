export type CryptoAsset = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volatility: number;
  drift: number;
  color: string;
  history: number[];
};
export type CryptoHolding = { quantity: number; staked: number; averageCost: number };
export type CryptoPortfolio = { cash: number; holdings: Record<string, CryptoHolding> };
export type CryptoTradeResult =
  | { ok: true; portfolio: CryptoPortfolio; quantity: number; executionPrice: number; fee: number }
  | { ok: false; reason: string };

type CryptoDefinition = [string, string, number, number, number, string];
const DEFINITIONS: CryptoDefinition[] = [
  ["BTC", "Bitcoin", 68000, 0.055, 0.000015, "#F7931A"],
  ["ETH", "Ethereum", 3500, 0.07, 0.00002, "#627EEA"],
  ["SOL", "Solana", 165, 0.095, 0.000025, "#8B5CF6"],
  ["XRP", "XRP", 0.62, 0.085, 0.000012, "#64748B"],
  ["ADA", "Cardano", 0.48, 0.09, 0.00001, "#2563EB"],
  ["DOGE", "Dogecoin", 0.16, 0.12, 0.000018, "#C2A633"],
];

function randomFor(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createCryptoMarket(seed = 99173): CryptoAsset[] {
  const random = randomFor(seed);
  return DEFINITIONS.map(([symbol, name, basePrice, volatility, drift, color]) => {
    let price = basePrice;
    const history = Array.from({ length: 90 }, () => {
      price = Math.max(basePrice * 0.05, price * Math.exp(drift + (random() - 0.5) * volatility * 0.045));
      return Number(price.toFixed(price < 1 ? 5 : 2));
    });
    return { symbol, name, price: history.at(-1) ?? basePrice, change: ((price / basePrice) - 1) * 100, volatility, drift, color, history };
  });
}

export function advanceCryptoMarket(market: CryptoAsset[], seed: number): CryptoAsset[] {
  const random = randomFor(seed);
  return market.map(asset => {
    const shock = (random() - 0.5) * asset.volatility * 0.045;
    const rawMove = asset.drift + shock;
    const boundedMove = Math.max(-0.12, Math.min(0.12, rawMove));
    const price = Math.max(0.000001, asset.price * (1 + boundedMove));
    return {
      ...asset,
      price: Number(price.toFixed(price < 1 ? 6 : 2)),
      change: asset.change + boundedMove * 100,
      history: [...asset.history.slice(-389), Number(price.toFixed(price < 1 ? 6 : 2))],
    };
  });
}

export function executeCryptoTrade(
  portfolio: CryptoPortfolio,
  asset: CryptoAsset,
  side: "buy" | "sell",
  quantity: number,
): CryptoTradeResult {
  if (!Number.isFinite(quantity) || quantity <= 0) return { ok: false, reason: "Enter a valid crypto quantity." };
  const fee = Math.max(0.01, asset.price * quantity * 0.001);
  const executionPrice = asset.price * (side === "buy" ? 1.0005 : 0.9995);
  const gross = executionPrice * quantity;
  const next: CryptoPortfolio = { cash: portfolio.cash, holdings: { ...portfolio.holdings } };
  const holding = next.holdings[asset.symbol] ?? { quantity: 0, staked: 0, averageCost: 0 };
  if (side === "buy") {
    const total = gross + fee;
    if (total > portfolio.cash + 1e-8) return { ok: false, reason: "Not enough cash for this crypto order." };
    const newQuantity = holding.quantity + quantity;
    next.cash -= total;
    next.holdings[asset.symbol] = {
      quantity: newQuantity,
      staked: holding.staked,
      averageCost: (holding.averageCost * holding.quantity + total) / newQuantity,
    };
  } else {
    const available = holding.quantity - holding.staked;
    if (quantity > available + 1e-8) return { ok: false, reason: "Not enough unstaked crypto to sell." };
    next.cash += gross - fee;
    const remaining = holding.quantity - quantity;
    if (remaining <= 1e-8) delete next.holdings[asset.symbol];
    else next.holdings[asset.symbol] = { ...holding, quantity: remaining };
  }
  return { ok: true, portfolio: next, quantity, executionPrice, fee };
}

export function stakeCrypto(portfolio: CryptoPortfolio, symbol: string, quantity: number): CryptoTradeResult {
  const holding = portfolio.holdings[symbol];
  if (!Number.isFinite(quantity) || quantity <= 0 || !holding || quantity > holding.quantity - holding.staked + 1e-8) {
    return { ok: false, reason: "Not enough available crypto to stake." };
  }
  const next = { cash: portfolio.cash, holdings: { ...portfolio.holdings, [symbol]: { ...holding, staked: holding.staked + quantity } } };
  return { ok: true, portfolio: next, quantity, executionPrice: 0, fee: 0 };
}

export function unstakeCrypto(portfolio: CryptoPortfolio, symbol: string, quantity: number): CryptoTradeResult {
  const holding = portfolio.holdings[symbol];
  if (!Number.isFinite(quantity) || quantity <= 0 || !holding || quantity > holding.staked + 1e-8) {
    return { ok: false, reason: "Not enough staked crypto to unstake." };
  }
  const next = { cash: portfolio.cash, holdings: { ...portfolio.holdings, [symbol]: { ...holding, staked: holding.staked - quantity } } };
  return { ok: true, portfolio: next, quantity, executionPrice: 0, fee: 0 };
}
