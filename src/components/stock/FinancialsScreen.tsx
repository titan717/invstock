"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronsUpDown, Minus, Plus } from "lucide-react";
import type { FinancialStatements, StatementRow } from "@/lib/company-data";
import { useJson } from "@/lib/use-json";

type Statement = "Income statement" | "Balance Sheet" | "Cash Flow";
const STATEMENTS: Statement[] = ["Income statement", "Balance Sheet", "Cash Flow"];

export type FinancialsScreenProps = { ticker: string; name: string; onBack: () => void };

const monthLabel = (date: string) => {
  const parsed = new Date(date + "T00:00:00Z");
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }) + " '" + String(parsed.getUTCFullYear()).slice(2);
};

const formatValue = (value: number | null, format: StatementRow["format"]) => {
  if (value === null) return "—";
  if (format === "percent") return value.toFixed(2) + "%";
  if (format === "ratio") return value.toFixed(2);
  return Math.round(value / 1_000_000).toLocaleString("en-US");
};

/** Five-bar mini trend: last bar highlighted in brand green, earlier ones white, heights scaled to the series. */
function Trend({ values }: { values: (number | null)[] }) {
  const series = values.slice(-5);
  const numbers = series.filter((value): value is number => value !== null);
  if (numbers.length < 2) return <span className="w-[52px]" />;
  const max = Math.max(...numbers.map(Math.abs)) || 1;
  return (
    <span className="flex h-[22px] w-[52px] items-end gap-[3px]" aria-hidden>
      {series.map((value, index) => (
        <span key={index} className={"w-[7px] rounded-[1px] " + (index === series.length - 1 ? "bg-[#00D09C]" : "bg-white")} style={{ height: `${value === null ? 0 : Math.max(18, (Math.abs(value) / max) * 100)}%` }} />
      ))}
    </span>
  );
}

function Row({ row, index, depth = 0, open, onToggle }: { row: StatementRow; index: number; depth?: number; open: boolean; onToggle?: () => void }) {
  const value = row.values[index] ?? null;
  const expandable = !!row.children?.length;
  return (
    <div className={"flex min-h-[56px] items-center gap-3 " + (depth ? "py-2" : "")}>
      <span className="w-5 shrink-0">
        {expandable && (
          <button aria-label={(open ? "Collapse " : "Expand ") + row.label} onClick={onToggle} className="text-[#00D09C]">
            {open ? <Minus size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
          </button>
        )}
      </span>
      <span className={"min-w-0 flex-1 text-[15px] leading-6 " + (depth ? "text-[#C7C7CC]" : "text-white")}>{row.label}</span>
      {!depth && <Trend values={row.values} />}
      <span className="w-[80px] shrink-0 text-right text-[15px] text-white tabular-nums">{formatValue(value, row.format)}</span>
    </div>
  );
}

export function FinancialsScreen({ ticker, name, onBack }: FinancialsScreenProps) {
  const [statement, setStatement] = useState<Statement>("Income statement");
  const [period, setPeriod] = useState<"quarterly" | "annual">("quarterly");
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState<Record<string, boolean>>({ TotalRevenue: true, TotalExpenses: true });
  const { data, loading, failed } = useJson<FinancialStatements>(`/api/financials/${ticker}?period=${period}`, 3_600_000);
  const dates = data?.dates ?? [];
  const index = Math.max(0, dates.length - 1 - offset);
  const rows = data ? (statement === "Income statement" ? data.income.filter(row => row.key !== "DilutedEPS") : statement === "Balance Sheet" ? data.balance : data.cashflow) : [];
  const hasData = rows.some(row => row.values.some(value => value !== null));

  const ratios = useMemo<StatementRow[]>(() => {
    if (!data || statement !== "Income statement") return [];
    const find = (key: string) => data.income.find(row => row.key === key)?.values ?? [];
    const revenue = find("TotalRevenue"), ebit = find("EBIT"), net = find("NetIncome"), eps = find("DilutedEPS");
    const margin = (top: (number | null)[]) => data.dates.map((_, i) => (top[i] != null && revenue[i] ? ((top[i] as number) / (revenue[i] as number)) * 100 : null));
    return [
      { key: "opm", label: "Operating Profit Margin", values: margin(ebit), format: "percent" },
      { key: "npm", label: "Net Profit Margin", values: margin(net), format: "percent" },
      { key: "eps", label: "Earning Per Share (Diluted)", values: eps, format: "ratio" },
    ];
  }, [data, statement]);

  return (
    <section className="min-h-screen bg-black pb-24 text-white" aria-label={`${name} financials`}>
      <header className="sticky top-0 z-20 bg-black">
        <div className="flex h-14 items-center gap-4 px-4">
          <button aria-label={`Back to ${ticker}`} onClick={onBack}><ArrowLeft size={24} /></button>
          <h1 className="text-[20px] font-semibold">Financials</h1>
        </div>
        <div className="flex overflow-x-auto border-b border-[#2C2C2E]" role="tablist">
          {STATEMENTS.map(item => (
            <button key={item} role="tab" aria-selected={statement === item} onClick={() => setStatement(item)} className={"shrink-0 px-5 pb-3 pt-2 text-[16px] font-semibold " + (statement === item ? "border-b-[3px] border-white text-white" : "text-[#8E8E93]")}>
              {item}
            </button>
          ))}
        </div>
      </header>

      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={() => { setPeriod(period === "quarterly" ? "annual" : "quarterly"); setOffset(0); }} className="flex h-9 items-center gap-2 rounded-full border border-[#8E8E93] bg-[#1C1C1E] px-4 text-[14px] font-semibold">
          {period === "quarterly" ? "Quarterly" : "Yearly"} <ChevronsUpDown size={15} />
        </button>
        <span className="flex h-9 items-center gap-2 rounded-full border border-[#8E8E93] bg-[#1C1C1E] px-4 text-[14px] font-semibold">Consolidated</span>
        <span className="ml-auto flex items-center gap-1 text-[15px] font-semibold tabular-nums">
          <button aria-label="Previous period" disabled={index <= 0} onClick={() => setOffset(offset + 1)} className="disabled:text-[#48484A]"><ChevronLeft size={20} /></button>
          {dates[index] ? monthLabel(dates[index]) : "—"}
          <button aria-label="Next period" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 1))} className="disabled:text-[#48484A]"><ChevronRight size={20} /></button>
        </span>
      </div>

      <div className="flex px-4 pb-2 pt-4 text-[13px] text-[#8E8E93]">
        <span className="flex-1 pl-8">Particulars</span><span className="w-[52px] text-center">Trend</span><span className="w-[80px] text-right">(In M)</span>
      </div>

      {loading && <p className="px-4 py-10 text-center text-[#8E8E93]">Loading financials…</p>}
      {!loading && (failed || !hasData) && (
        <div className="px-6 py-16 text-center"><p className="text-[17px] font-semibold">Data does not exist</p><p className="mt-2 text-[14px] text-[#8E8E93]">Reported financial statements are not available for {name}.</p></div>
      )}
      {!loading && hasData && (
        <div className="px-4">
          {rows.map(row => (
            <div key={row.key} className="border-b border-[#2C2C2E]">
              <Row row={row} index={index} open={!!open[row.key]} onToggle={() => setOpen({ ...open, [row.key]: !open[row.key] })} />
              {open[row.key] && row.children?.length ? (
                <div className="mb-2 ml-[10px] border-l border-[#3A3A3C] pl-3">
                  {row.children.map(child => <Row key={child.key} row={child} index={index} depth={1} open={false} />)}
                </div>
              ) : null}
            </div>
          ))}
          {ratios.length > 0 && (
            <>
              <h2 className="pb-1 pt-6 text-[17px] font-semibold">Financial Ratio</h2>
              {ratios.map(row => <div key={row.key} className="border-b border-[#2C2C2E]"><Row row={row} index={index} open={false} /></div>)}
            </>
          )}
        </div>
      )}
    </section>
  );
}
