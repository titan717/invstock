"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Coins, Wallet } from "lucide-react";
import { formatCompactMoney, formatMoney } from "@/lib/currency";
import type { GameState } from "@/lib/game-engine";

type Props = {
  state: GameState;
  onTrade: (symbol: string, side: "buy" | "sell", quantity: number) => void;
};

export function CryptoDiscovery({ state, onTrade }: Props) {
  const [quantity, setQuantity] = useState("0.01");
  const [filter, setFilter] = useState<"all" | "owned">("all");
  const currency = state.settings.currency;
  const holdingsValue = useMemo(
    () => Object.entries(state.cryptoHoldings).reduce((total, [symbol, holding]) =>
      total + (state.cryptoMarket.find(asset => asset.symbol === symbol)?.price ?? 0) * holding.quantity, 0),
    [state.cryptoHoldings, state.cryptoMarket],
  );
  const assets = state.cryptoMarket.filter(asset =>
    filter === "all" || Boolean(state.cryptoHoldings[asset.symbol]?.quantity),
  );
  const orderQuantity = Number(quantity);

  return (
    <section className="crypto-discovery" aria-label="Crypto market">
      <div className="crypto-overview">
        <div className="crypto-overview-card">
          <span><Wallet size={15}/> Crypto portfolio</span>
          <strong>{formatCompactMoney(holdingsValue, currency)}</strong>
          <small>{Object.keys(state.cryptoHoldings).length} assets held</small>
        </div>
        <div className="crypto-overview-card">
          <span><Coins size={15}/> Available cash</span>
          <strong>{formatCompactMoney(state.cash, currency)}</strong>
          <small>Shared simulator balance</small>
        </div>
      </div>

      <div className="crypto-toolbar">
        <div>
          <h2>Explore crypto</h2>
          <p>Buy and sell digital assets with your virtual cash.</p>
        </div>
        <div className="crypto-filter" aria-label="Crypto asset filter">
          <button type="button" className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>All</button>
          <button type="button" className={filter === "owned" ? "selected" : ""} onClick={() => setFilter("owned")}>My assets</button>
        </div>
      </div>

      <label className="crypto-quantity">
        <span>Order quantity</span>
        <input aria-label="Crypto order quantity" type="number" min="0.000001" step="any" value={quantity} onChange={event => setQuantity(event.target.value)} />
      </label>

      <div className="crypto-market-list">
        {assets.map(asset => {
          const holding = state.cryptoHoldings[asset.symbol];
          const ownedValue = (holding?.quantity ?? 0) * asset.price;
          const canBuy = Number.isFinite(orderQuantity) && orderQuantity > 0 && asset.price * orderQuantity * 1.002 <= state.cash;
          const canSell = Number.isFinite(orderQuantity) && orderQuantity > 0 && orderQuantity <= (holding?.quantity ?? 0) - (holding?.staked ?? 0);
          const positive = asset.change >= 0;
          return (
            <article className="crypto-market-row" key={asset.symbol}>
              <div className="crypto-asset-identity">
                <span className="crypto-asset-mark" style={{ backgroundColor: asset.color + "22", color: asset.color }}>{asset.symbol.slice(0, 1)}</span>
                <span><b>{asset.name}</b><small>{asset.symbol}</small></span>
              </div>
              <div className="crypto-asset-quote">
                <b>{formatMoney(asset.price, currency)}</b>
                <small className={positive ? "gain" : "loss"}>{positive ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>} {positive ? "+" : ""}{asset.change.toFixed(2)}%</small>
                {holding && <small className="crypto-owned">{holding.quantity.toFixed(6)} owned · {formatCompactMoney(ownedValue, currency)}</small>}
              </div>
              <div className="crypto-trade-actions">
                <button type="button" disabled={!canBuy} onClick={() => onTrade(asset.symbol, "buy", orderQuantity)}>Buy</button>
                <button type="button" className="crypto-sell" disabled={!canSell} onClick={() => onTrade(asset.symbol, "sell", orderQuantity)}>Sell</button>
              </div>
            </article>
          );
        })}
        {!assets.length && <p className="empty-state">You do not own any crypto yet. Switch to All to explore the market.</p>}
      </div>
      <p className="crypto-disclaimer">Simulated market only. Prices are generated in-game and are not live exchange quotes.</p>
    </section>
  );
}
