"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
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

type Ranked = "gainers" | "losers" | "active";
type View = { kind: "home" } | { kind: "all" } | { kind: "ranked"; key: Ranked };

const RANKED_TITLES: Record<Ranked, string> = { gainers: "Top gainers", losers: "Top losers", active: "Most active" };
const PREVIEW_ROWS = 4;

function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mt-5 mb-1 flex items-center justify-between px-4">
      <h2 className="text-[19px] font-bold text-white">{title}</h2>
      {action && <button type="button" onClick={onAction} className="text-[13px] font-semibold text-[#00D09C]">{action}</button>}
    </div>
  );
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="sticky top-0 z-10 grid h-14 grid-cols-[44px_1fr_44px] items-center bg-black px-2">
      <button type="button" aria-label="Back" onClick={onBack} className="grid h-11 w-11 place-items-center text-white"><ChevronLeft size={24} /></button>
      <h1 className="text-center text-[17px] font-bold text-white">{title}</h1>
      <span />
    </header>
  );
}

export function DiscoveryPage({
  stocks, state, currency, search, onSearchChange, sector, onSectorChange,
  asset, onAssetChange, onStockSelect, onCryptoTrade
}: Props) {
  const [view, setView] = useState<View>({ kind: "home" });
  const normalizedSearch = search.trim().toLowerCase();
  const searchActive = normalizedSearch.length > 0;
  const sectorStocks = useMemo(() => stocks.filter(stock => sector === "All" || stock.sector === sector), [stocks, sector]);
  const searchMatches = useMemo(
    () => stocks.filter(stock => `${stock.ticker} ${stock.name}`.toLowerCase().includes(normalizedSearch)),
    [stocks, normalizedSearch]
  );
  const ranked = useMemo<Record<Ranked, Stock[]>>(() => ({
    gainers: [...stocks].filter(stock => stock.change >= 0).sort((a, b) => b.change - a.change),
    losers: [...stocks].filter(stock => stock.change < 0).sort((a, b) => a.change - b.change),
    active: [...stocks].sort((a, b) => b.volume - a.volume)
  }), [stocks]);
  const alphabetical = useMemo(() => [...stocks].sort((a, b) => a.ticker.localeCompare(b.ticker)), [stocks]);

  const rows = (list: Stock[], mode: "price" | "volume" = "price") => (
    <div className="discovery-stock-list px-4">
      {list.map(stock => (
        <StockListRow
          key={stock.ticker}
          stock={stock}
          currency={currency}
          subtitle={mode === "volume" ? `Vol ${(stock.volume / 1e6).toFixed(1)}M` : undefined}
          onClick={() => onStockSelect(stock)}
        />
      ))}
    </div>
  );

  if (asset === "Crypto") {
    return (
      <section className="-mx-4 -mt-4 min-h-full bg-black pb-24" aria-label="Crypto">
        <SubHeader title="Crypto" onBack={() => onAssetChange("Stocks")} />
        <CryptoDiscovery state={state} onTrade={onCryptoTrade} />
      </section>
    );
  }
  if (sector !== "All") {
    return (
      <section className="-mx-4 -mt-4 min-h-full bg-black pb-24" aria-label={`${sector} stocks`}>
        <SubHeader title={sector} onBack={() => onSectorChange("All")} />
        {rows(sectorStocks)}
        {!sectorStocks.length && <p className="px-4 py-10 text-center text-[#8E8E93]">No symbols in this sector</p>}
      </section>
    );
  }
  if (view.kind === "all") {
    return (
      <section className="-mx-4 -mt-4 min-h-full bg-black pb-24" aria-label="All symbols">
        <SubHeader title="All symbols" onBack={() => setView({ kind: "home" })} />
        {rows(alphabetical)}
      </section>
    );
  }
  if (view.kind === "ranked") {
    return (
      <section className="-mx-4 -mt-4 min-h-full bg-black pb-24" aria-label={RANKED_TITLES[view.key]}>
        <SubHeader title={RANKED_TITLES[view.key]} onBack={() => setView({ kind: "home" })} />
        {rows(ranked[view.key], view.key === "active" ? "volume" : "price")}
      </section>
    );
  }

  return (
    <section className="discovery-view -mx-4 -mt-4 min-h-full bg-black pb-24" aria-label="Discover investments">
      <h1 className="px-4 pt-6 text-[26px] font-bold text-white">Discover</h1>
      <label className="mx-4 mt-3 flex h-11 items-center gap-2 rounded-xl bg-[#1C1C1E] px-3 text-[#8E8E93]">
        <Search size={17} aria-hidden="true" />
        <input
          aria-label="Search companies or tickers"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          placeholder="Search companies or tickers"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-[#8E8E93]"
        />
        {search && (
          <button type="button" aria-label="Clear search" onClick={() => onSearchChange("")}><X size={16} /></button>
        )}
      </label>

      {searchActive ? (
        <section aria-label="Search results">
          <SectionHeading title="Search results" />
          {rows(searchMatches)}
          {!searchMatches.length && <p className="px-4 py-10 text-center text-[#8E8E93]">No symbols found</p>}
        </section>
      ) : (
        <>
          <SectionHeading title="Sectors" action="All symbols" onAction={() => setView({ kind: "all" })} />
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 pt-1 [scrollbar-width:none]" aria-label="Browse sectors">
            {sectors.filter(value => value !== "All").map(value => (
              <button
                type="button"
                key={value}
                onClick={() => onSectorChange(value)}
                className="h-9 shrink-0 rounded-full bg-[#1C1C1E] px-4 text-[13px] font-semibold text-white"
              >
                {value}
              </button>
            ))}
            <button type="button" onClick={() => onAssetChange("Crypto")} className="h-9 shrink-0 rounded-full bg-[#1C1C1E] px-4 text-[13px] font-semibold text-white">Crypto</button>
          </div>

          {(Object.keys(RANKED_TITLES) as Ranked[]).map(key => ranked[key].length > 0 && (
            <section key={key} aria-label={RANKED_TITLES[key]}>
              <SectionHeading title={RANKED_TITLES[key]} action="See all" onAction={() => setView({ kind: "ranked", key })} />
              {rows(ranked[key].slice(0, PREVIEW_ROWS), key === "active" ? "volume" : "price")}
            </section>
          ))}
          <p className="px-6 pt-6 text-center text-[11px] leading-4 text-[#8E8E93]">STONKS is a game. All prices are simulated or delayed and money is virtual. Not investment advice.</p>
        </>
      )}
    </section>
  );
}
