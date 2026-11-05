"use client";

import { useMemo, useState } from "react";
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

type ExpandedSection = "gainers" | "losers" | "active" | null;

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
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const searchActive = normalizedSearch.length > 0;

  const sectorStocks = useMemo(
    () => stocks.filter(stock => sector === "All" || stock.sector === sector),
    [stocks, sector]
  );
  const searchMatches = useMemo(
    () => sectorStocks.filter(stock => `${stock.ticker} ${stock.name}`.toLowerCase().includes(normalizedSearch)),
    [sectorStocks, normalizedSearch]
  );
  const gainers = useMemo(
    () => [...sectorStocks].sort((a, b) => b.change - a.change),
    [sectorStocks]
  );
  const losers = useMemo(
    () => [...sectorStocks].sort((a, b) => a.change - b.change),
    [sectorStocks]
  );
  const active = useMemo(
    () => [...sectorStocks].sort((a, b) => b.volume - a.volume),
    [sectorStocks]
  );

  const renderRankedSection = (
    key: Exclude<ExpandedSection, null>,
    title: string,
    rankedStocks: Stock[],
    mode: "price" | "volume" = "price"
  ) => {
    const expanded = expandedSection === key;
    const visibleStocks = expanded ? rankedStocks : rankedStocks.slice(0, 5);
    return (
      <>
        <SectionHeading
          title={title}
          action={expanded ? "Show less" : "See all"}
          onAction={() => setExpandedSection(current => current === key ? null : key)}
        />
        <div className="discovery-stock-list">
          {visibleStocks.map(stock => (
            <StockListRow
              key={stock.ticker}
              stock={stock}
              currency={currency}
              mode={mode}
              onClick={() => onStockSelect(stock)}
            />
          ))}
        </div>
      </>
    );
  };

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
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => onSearchChange("")}>
              <X size={16} />
            </button>
          )}
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
      ) : searchActive ? (
        <section className="discovery-search-results" aria-label="Search results">
          <SectionHeading title="Search results" />
          <div className="discovery-stock-list">
            {searchMatches.map(stock => (
              <StockListRow
                key={stock.ticker}
                stock={stock}
                currency={currency}
                onClick={() => onStockSelect(stock)}
              />
            ))}
            {!searchMatches.length && <p className="discovery-empty-state">No symbols found</p>}
          </div>
        </section>
      ) : (
        <>
          <div className="sector-strip" aria-label="Filter by sector">
            {sectors.map(value => (
              <button
                type="button"
                key={value}
                className={sector === value ? "selected" : ""}
                aria-pressed={sector === value}
                onClick={() => onSectorChange(value)}
              >
                {value}
              </button>
            ))}
          </div>

          {renderRankedSection("gainers", "Top gainers", gainers)}
          {renderRankedSection("losers", "Top losers", losers)}
          {renderRankedSection("active", "Most active", active, "volume")}

          <SectionHeading title={sector === "All" ? "Explore stocks" : sector} />
          <div className="discovery-stock-list">
            {sectorStocks.slice(0, 12).map(stock => (
              <StockListRow
                key={stock.ticker}
                stock={stock}
                currency={currency}
                onClick={() => onStockSelect(stock)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
