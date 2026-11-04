"use client";

import { useMemo } from "react";
import { Coins, Search, TrendingUp, X } from "lucide-react";
import { CryptoDiscovery } from "@/components/market/CryptoDiscovery";
import { StockListRow } from "@/components/discovery/StockListRow";
import type { GameState } from "@/lib/game-engine";
import type { CurrencyCode } from "@/lib/currency";
import { sectors, type Stock } from "@/lib/market";

type Props = {
  stocks: Stock[];
  state: GameState;
  currency: CurrencyCode;
  search: string;
  onSearchChange: (value: string) => void;
  sector: string;
  onSectorChange: (value: string) => void;
  asset: "Stocks" | "Crypto";
  onAssetChange: (value: "Stocks" | "Crypto") => void;
  onStockSelect: (stock: Stock) => void;
  onCryptoTrade: (symbol: string, side: "buy" | "sell", quantity: number) => void;
};

function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="discovery-section-heading">
      <h2>{title}</h2>
      {action && <button type="button" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function DiscoveryPage({
  stocks, state, currency, search, onSearchChange, sector, onSectorChange,
  asset, onAssetChange, onStockSelect, onCryptoTrade
}: Props) {
  const filtered = useMemo(() => stocks.filter(stock =>
    (sector === "All" || stock.sector === sector) &&
    `${stock.ticker} ${stock.name}`.toLowerCase().includes(search.toLowerCase())
  ), [stocks, sector, search]);
  const gainers = useMemo(() => [...stocks].sort((a, b) => b.change - a.change).slice(0, 5), [stocks]);
  const losers = useMemo(() => [...stocks].sort((a, b) => a.change - b.change).slice(0, 5), [stocks]);
  const active = useMemo(() => [...stocks].sort((a, b) => b.volume - a.volume).slice(0, 5), [stocks]);

  return (
    <section className="discovery-view" aria-label="Discover investments">
      {asset === "Stocks" && (
        <label className="discovery-search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Search companies or tickers"
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Search companies or tickers"
          />
          {search && <button type="button" aria-label="Clear search" onClick={() => onSearchChange("")}><X size={16} /></button>}
        </label>
      )}

      <div className="discovery-market-tabs" role="tablist" aria-label="Explore markets">
        <button type="button" role="tab" aria-selected={asset === "Stocks"} className={asset === "Stocks" ? "selected" : ""} onClick={() => onAssetChange("Stocks")}>
          <TrendingUp size={16} /> Stocks
        </button>
        <button type="button" role="tab" aria-selected={asset === "Crypto"} className={asset === "Crypto" ? "selected" : ""} onClick={() => onAssetChange("Crypto")}>
          <Coins size={16} /> Crypto
        </button>
      </div>

      {asset === "Crypto" ? (
        <CryptoDiscovery state={state} onTrade={onCryptoTrade} />
      ) : (
        <>
          <div className="sector-strip" aria-label="Filter by sector">
            {sectors.map(value => (
              <button type="button" key={value} className={sector === value ? "selected" : ""} aria-pressed={sector === value} onClick={() => onSectorChange(value)}>
                {value}
              </button>
            ))}
          </div>

          <SectionHeading title="Top gainers" action="See all" onAction={() => onSectorChange("All")} />
          <div className="discovery-stock-list">{gainers.map(stock => <StockListRow key={stock.ticker} stock={stock} currency={currency} onClick={() => onStockSelect(stock)} />)}</div>

          <SectionHeading title="Top losers" action="See all" onAction={() => onSectorChange("All")} />
          <div className="discovery-stock-list">{losers.map(stock => <StockListRow key={stock.ticker} stock={stock} currency={currency} onClick={() => onStockSelect(stock)} />)}</div>

          <SectionHeading title="Most active" action="See all" onAction={() => onSearchChange("")} />
          <div className="discovery-stock-list">{active.map(stock => <StockListRow key={stock.ticker} stock={stock} currency={currency} mode="volume" onClick={() => onStockSelect(stock)} />)}</div>

          <SectionHeading title={sector === "All" ? "Explore stocks" : sector} />
          <div className="discovery-stock-list">
            {filtered.slice(0, 12).map(stock => <StockListRow key={stock.ticker} stock={stock} currency={currency} onClick={() => onStockSelect(stock)} />)}
            {!filtered.length && <p className="empty-state">No stocks match that search. Try another ticker or sector.</p>}
          </div>
        </>
      )}
    </section>
  );
}
