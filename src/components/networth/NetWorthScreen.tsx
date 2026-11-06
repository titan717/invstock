"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowLeftRight, Banknote, Bitcoin, Building2, ChartCandlestick, Eye, EyeOff, Landmark, Layers } from "lucide-react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";
import type { GameState } from "@/lib/game-engine";
import type { Stock } from "@/lib/market";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { tradingDayDate } from "@/lib/game-calendar";
import { allocationPct, netWorthBreakdown, type AssetClass, type AssetClassId, type BreakdownPart } from "@/lib/net-worth";

const RANGES = [["1M", 21], ["3M", 63], ["6M", 126], ["1Y", 252], ["3Y", 756], ["All", Infinity]] as const;
type Range = typeof RANGES[number][0];
const PALETTE = ["#8F8FFF", "#00D09C", "#F5E15A", "#FF5722", "#5AC8FA", "#C7C7CC", "#BF5AF2"];
const ICONS: Record<AssetClassId, typeof Layers> = { stocks: ChartCandlestick, options: Layers, crypto: Bitcoin, cash: Banknote, property: Building2 };
const LINE = "#8F8FFF";

type Props = {
  state: GameState;
  stocks: Stock[];
  currency: CurrencyCode;
  totalValue: number;
  onBack: () => void;
  onExplore: (id: AssetClassId) => void;
  onLoans: () => void;
};

const asOf = (day: number) => {
  const date = tradingDayDate(day);
  return `${String(date.getUTCDate()).padStart(2, "0")} ${date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} '${String(date.getUTCFullYear()).slice(2)}`;
};
const tone = (value: number) => (value >= 0 ? "text-[#00D09C]" : "text-[#FF5722]");
const pctOf = (gain: number, base: number) => (base > 0 ? (gain / base) * 100 : 0);

function HalfDonut({ parts }: { parts: BreakdownPart[] }) {
  const total = parts.reduce((sum, part) => sum + Math.max(0, part.current), 0);
  const radius = 70, stroke = 34, cx = 100, cy = 92;
  let angle = Math.PI;
  const arcs = total > 0 ? parts.filter(part => part.current > 0).map((part, index) => {
    const sweep = (part.current / total) * Math.PI;
    const start = angle, end = angle + sweep;
    angle = end;
    const point = (theta: number) => [cx + radius * Math.cos(theta), cy + radius * Math.sin(theta)];
    const [x1, y1] = point(start), [x2, y2] = point(end - (sweep > 0.02 ? 0.006 : 0));
    return <path key={part.label} d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`} stroke={PALETTE[index % PALETTE.length]} strokeWidth={stroke} fill="none" />;
  }) : [<path key="empty" d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`} stroke="#2C2C2E" strokeWidth={stroke} fill="none" />];
  return <svg viewBox="0 0 200 104" className="mx-auto mt-2 block w-[210px]" role="img" aria-label="Allocation chart">{arcs}</svg>;
}

function SplitBar({ parts }: { parts: BreakdownPart[] }) {
  const total = parts.reduce((sum, part) => sum + Math.max(0, part.current), 0);
  return (
    <div className="mt-3 flex h-5 overflow-hidden rounded-[4px] bg-[#2C2C2E]" role="img" aria-label="Split chart">
      {total > 0 && parts.filter(part => part.current > 0).map((part, index) => (
        <span key={part.label} style={{ width: `${(part.current / total) * 100}%`, background: index === 0 ? "#F5E15A" : PALETTE[(index + 4) % PALETTE.length] }} className="h-full border-r border-[#1C1C1E] last:border-r-0" />
      ))}
    </div>
  );
}

function ValueToggle({ returns, onToggle }: { returns: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex items-center gap-1 text-[12px] font-semibold text-white underline decoration-dashed underline-offset-4">
      <ArrowLeftRight size={12} aria-hidden="true" />{returns ? "Returns (%)" : "Current (Invested)"}
    </button>
  );
}

export function NetWorthScreen({ state, stocks, currency, totalValue, onBack, onExplore, onLoans }: Props) {
  const [hidden, setHidden] = useState(false);
  const [range, setRange] = useState<Range>("All");
  const [productReturns, setProductReturns] = useState(false);
  const [partReturns, setPartReturns] = useState(false);
  const breakdown = useMemo(() => netWorthBreakdown(state, stocks), [state, stocks]);
  const owned = breakdown.classes.filter(item => item.current > 0);
  const [selectedId, setSelectedId] = useState<AssetClassId>(owned[0]?.id ?? "cash");
  const selected: AssetClass = breakdown.classes.find(item => item.id === selectedId) ?? breakdown.classes[0];
  const money = (value: number) => (hidden ? "••••" : formatMoney(value, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
  const invested = state.start;
  const gain = totalValue - invested;

  const chart = useMemo(() => {
    const days = RANGES.find(([label]) => label === range)![1];
    const points = state.dailyHistory.filter(point => state.market.day - point.t <= days).map(point => ({ t: point.t, v: point.v }));
    return [...points, { t: state.market.day + 0.5, v: totalValue }];
  }, [range, state.dailyHistory, state.market.day, totalValue]);

  return (
    <section className="min-h-full bg-black pb-10 text-white" aria-label="Net worth">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-3 bg-black px-3">
        <button type="button" aria-label="Back" onClick={onBack} className="grid h-10 w-10 place-items-center"><ArrowLeft size={22} /></button>
        <div className="flex-1">
          <h1 className="text-[17px] font-bold leading-5">Net Worth</h1>
          <small className="text-[12px] text-[#8E8E93]">Data as of {asOf(state.market.day)}</small>
        </div>
        <button type="button" aria-label={hidden ? "Show values" : "Hide values"} onClick={() => setHidden(value => !value)} className="grid h-10 w-10 place-items-center">
          {hidden ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </header>

      <div className="flex items-start justify-between px-4 pt-2">
        <div>
          <small className="flex items-center gap-1.5 text-[12px] text-[#8E8E93]">Current <i className="inline-block h-2 w-2 rounded-[2px]" style={{ background: LINE }} /></small>
          <b className="block text-[22px] font-bold tabular-nums" data-testid="net-worth-current">{money(totalValue)}</b>
          <small className={`text-[12px] font-semibold tabular-nums ${tone(gain)}`}>{hidden ? "••••" : `${gain >= 0 ? "+" : "−"}${formatMoney(Math.abs(gain), currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (${Math.abs(pctOf(gain, invested)).toFixed(2)}%)`}</small>
        </div>
        <div className="text-right">
          <small className="flex items-center justify-end gap-1.5 text-[12px] text-[#8E8E93]"><i className="inline-block h-2 w-2 rounded-[2px] bg-[#8E8E93]" /> Invested</small>
          <b className="block text-[22px] font-bold tabular-nums">{money(invested)}</b>
        </div>
      </div>

      <div className="mt-4 h-[240px]" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart} margin={{ top: 10, right: 16, bottom: 4, left: 16 }}>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <ReferenceLine y={invested} stroke="#8E8E93" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="v" stroke={LINE} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-between px-4" role="tablist" aria-label="Chart range">
        {RANGES.map(([label]) => (
          <button key={label} type="button" role="tab" aria-selected={range === label} onClick={() => setRange(label)}
            className={`h-8 min-w-[44px] rounded-full px-3 text-[13px] font-semibold ${range === label ? "border border-[#8E8E93] bg-[#1C1C1E] text-white" : "text-[#C7C7CC]"}`}>{label}</button>
        ))}
      </div>

      <h2 className="mt-8 px-4 text-[19px] font-bold">Product allocation</h2>
      <div className="mt-3 flex items-center justify-between px-4 text-[12px] font-semibold">
        <span>Products</span>
        <ValueToggle returns={productReturns} onToggle={() => setProductReturns(value => !value)} />
      </div>
      <ul className="mt-1 px-4">
        {breakdown.classes.map(item => {
          const Icon = ICONS[item.id];
          const returns = item.current - item.invested;
          const empty = item.current <= 0;
          return (
            <li key={item.id} className="flex items-center gap-3 border-b border-[#1C1C1E] py-3.5" data-asset-class={item.id}>
              <Icon size={18} className="shrink-0 text-[#C7C7CC]" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <b className="block text-[15px] font-semibold">{item.label}</b>
                {!empty && <small className="text-[12px] text-[#8E8E93] tabular-nums">{item.countLabel} · {allocationPct(item.current, breakdown.assets).toFixed(2)}%</small>}
              </span>
              {empty ? (
                <button type="button" onClick={() => onExplore(item.id)} className="text-[13px] font-semibold text-white">Explore</button>
              ) : productReturns ? (
                <span className="text-right tabular-nums"><b className={`block text-[15px] ${tone(returns)}`}>{money(returns)}</b><small className={`text-[12px] ${tone(returns)}`}>({pctOf(returns, item.invested).toFixed(2)}%)</small></span>
              ) : (
                <span className="text-right tabular-nums"><b className={`block text-[15px] ${item.id === "cash" ? "text-white" : tone(returns)}`}>{money(item.current)}</b><small className="text-[12px] text-[#8E8E93]">({money(item.invested)})</small></span>
              )}
            </li>
          );
        })}
        <li className="flex items-center gap-3 border-b border-[#1C1C1E] py-3.5" data-asset-class="loans">
          <Landmark size={18} className="shrink-0 text-[#C7C7CC]" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <b className="block text-[15px] font-semibold">Loans</b>
            {breakdown.loan > 0 && <small className="text-[12px] text-[#8E8E93] tabular-nums">{state.loanTermDays > 0 ? `${state.loanTermDays} payments left` : "Minimum payments"}</small>}
          </span>
          {breakdown.loan > 0
            ? <button type="button" onClick={onLoans} className="text-right text-[15px] font-bold text-[#FF5722] tabular-nums">−{money(breakdown.loan)}</button>
            : <button type="button" onClick={onLoans} className="text-[13px] font-semibold text-white">Explore</button>}
        </li>
      </ul>

      <h2 className="mt-8 px-4 text-[19px] font-bold">Asset allocation</h2>
      <div className="mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="tablist" aria-label="Asset classes">
        {breakdown.classes.map(item => (
          <button key={item.id} type="button" role="tab" aria-selected={selected.id === item.id} onClick={() => setSelectedId(item.id)}
            className={`h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold tabular-nums ${selected.id === item.id ? "border border-[#8E8E93] bg-[#2C2C2E] text-white" : "bg-[#1C1C1E] text-[#C7C7CC]"}`}>
            {item.label} ({Math.round(allocationPct(item.current, breakdown.assets))}%)
          </button>
        ))}
      </div>

      <div className="mx-4 mt-4 rounded-2xl border border-[#2C2C2E] bg-[#0E0E0F] p-4 tabular-nums">
        <div className="flex justify-between text-[12px] text-[#8E8E93]"><span>Current</span><span>Invested</span></div>
        <div className="flex justify-between text-[15px] font-bold"><span>{money(selected.current)}</span><span>{money(selected.invested)}</span></div>
        <div className="mt-3 flex justify-between text-[12px] text-[#8E8E93]"><span>Total returns</span><span>Allocation</span></div>
        <div className="flex justify-between text-[15px] font-bold">
          <span className={tone(selected.current - selected.invested)}>{money(selected.current - selected.invested)} ({Math.abs(pctOf(selected.current - selected.invested, selected.invested)).toFixed(2)}%)</span>
          <span>{Math.round(allocationPct(selected.current, breakdown.assets))}%</span>
        </div>
      </div>

      <div className="mx-4 mt-4 rounded-2xl border border-[#2C2C2E] bg-[#0E0E0F] p-4">
        <h3 className="text-[17px] font-bold">{selected.label} allocation</h3>
        <HalfDonut parts={selected.parts} />
        <div className="mt-2 flex items-center justify-between text-[12px] font-semibold"><span>{selected.label}</span><ValueToggle returns={partReturns} onToggle={() => setPartReturns(value => !value)} /></div>
        <ul className="mt-1">
          {selected.parts.map((part, index) => {
            const returns = part.current - part.invested;
            return (
              <li key={part.label} className="flex items-start gap-3 py-2.5">
                <i className="mt-1 h-8 w-[3px] shrink-0 rounded" style={{ background: PALETTE[index % PALETTE.length] }} />
                <span className="min-w-0 flex-1"><b className="block truncate text-[14px] font-semibold">{part.label}</b><small className="text-[12px] text-[#8E8E93] tabular-nums">{part.detail} · {allocationPct(part.current, selected.current).toFixed(2)}%</small></span>
                <span className="text-right tabular-nums">
                  {partReturns
                    ? <><b className={`block text-[14px] ${tone(returns)}`}>{money(returns)}</b><small className={`text-[12px] ${tone(returns)}`}>({pctOf(returns, part.invested).toFixed(2)}%)</small></>
                    : <><b className={`block text-[14px] ${selected.id === "cash" ? "text-white" : tone(returns)}`}>{money(part.current)}</b><small className="text-[12px] text-[#8E8E93]">({money(part.invested)})</small></>}
                </span>
              </li>
            );
          })}
          {!selected.parts.length && <li className="py-4 text-center text-[13px] text-[#8E8E93]">You don&apos;t own any {selected.label.toLowerCase()} yet.</li>}
        </ul>
      </div>

      {selected.split.length > 1 && (
        <div className="mx-4 mt-4 rounded-2xl border border-[#2C2C2E] bg-[#0E0E0F] p-4">
          <h3 className="text-[17px] font-bold">{selected.label} split</h3>
          <SplitBar parts={selected.split} />
          <ul className="mt-3">
            {selected.split.map((part, index) => (
              <li key={part.label} className="flex items-center gap-3 py-2">
                <i className="h-8 w-[3px] shrink-0 rounded" style={{ background: index === 0 ? "#F5E15A" : PALETTE[(index + 4) % PALETTE.length] }} />
                <span className="flex-1"><b className="block text-[14px] font-semibold">{part.label}</b><small className="text-[12px] text-[#8E8E93] tabular-nums">{allocationPct(part.current, selected.current).toFixed(2)}%</small></span>
                <span className="text-right tabular-nums"><b className={`block text-[14px] ${tone(part.current - part.invested)}`}>{money(part.current)}</b><small className="text-[12px] text-[#8E8E93]">({money(part.invested)})</small></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
