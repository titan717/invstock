"use client";

import { CompanyLogo } from "@/components/market/CompanyLogo";

export type NewsFilter = "All" | "My stocks" | "Market";
export type NewsRow = { id: string | number; source: string; time: string; ticker: string; name: string; tone: "up" | "down"; title: string };

const FILTERS: NewsFilter[] = ["All", "My stocks", "Market"];

export function NewsScreen({ items, filter, onFilterChange, onOpen }: { items: NewsRow[]; filter: string; onFilterChange: (filter: NewsFilter) => void; onOpen: (index: number) => void }) {
  return (
    <section className="news-screen -mx-4 -mt-4 min-h-full bg-black pb-24" aria-label="News">
      <h1 className="px-4 pt-6 text-[26px] font-bold text-white">News</h1>
      <div className="mx-4 mt-3 grid grid-cols-3 gap-1" role="tablist" aria-label="Filter news">
        {FILTERS.map(value => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => onFilterChange(value)}
            className={`h-9 rounded-full text-[14px] font-semibold ${filter === value ? "bg-[#3A1D16] text-[#FF5722]" : "text-[#8E8E93]"}`}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="mt-2 px-4">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            data-news-ticker={item.ticker}
            onClick={() => onOpen(index)}
            className="flex w-full items-center gap-3 border-b border-[#1C1C1E] py-3.5 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8E8E93]">
                <i className={`inline-block h-1.5 w-1.5 rounded-full ${item.tone === "up" ? "bg-[#00D09C]" : "bg-[#FF5722]"}`} aria-hidden="true" />
                <span className="text-white/80">{item.source}</span>
                <span>· {item.time}</span>
              </span>
              <b className="mt-1 block text-[15px] font-bold leading-5 text-white">{item.title}</b>
            </span>
            <span className="flex w-12 shrink-0 flex-col items-center gap-1">
              <CompanyLogo ticker={item.ticker} name={item.name} size={36} />
              <small className="text-[10px] font-bold text-[#8E8E93]">{item.ticker}</small>
            </span>
          </button>
        ))}
        {!items.length && <p className="py-16 text-center text-[14px] text-[#8E8E93]">No headlines yet. News appears here as the market moves.</p>}
      </div>
    </section>
  );
}
