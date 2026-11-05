"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlarmClock, ArrowLeft, Bookmark, CalendarDays, ChevronDown, ChevronRight, ChevronUp, Info, Maximize2, Minimize2, Search, X } from "lucide-react";
import { Bar, BarChart, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { Stock } from "@/lib/market";
import type { GameNews, GameState } from "@/lib/game-engine";
import { formatCompactMoney, formatMoney, type CurrencyCode } from "@/lib/currency";
import { generateFinancials, type SipFrequency } from "@/lib/trading-automation";
import { computeTechnicals, type Signal } from "@/lib/technicals";
import { exchangeSymbol, type LiveDetail } from "@/lib/live-quotes";
import type { CompanyFundamentals, PeriodValue } from "@/lib/company-data";
import { useJson } from "@/lib/use-json";
import { CompanyLogo } from "@/components/market/CompanyLogo";

const StockLogo = ({ stock, size = 40 }: { stock: Stock; size?: number }) => <CompanyLogo ticker={stock.ticker} name={stock.name} size={size} />;

export type DetailTab = "Overview" | "Technicals" | "News" | "Events";
export const DETAIL_TABS: DetailTab[] = ["Overview", "Technicals", "News", "Events"];
export const TIMEFRAMES = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "All"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];
const SIM_POINTS: Record<Timeframe, number> = { "1D": 78, "1W": 390, "1M": 390, "3M": 390, "6M": 390, "1Y": 390, "5Y": 390, All: 390 };

const GAIN = "#00D09C";
const LOSS = "#FF5722";
const HOLDER_COLORS = ["#9A8CFF", "#C7E07A", "#F5C542"];

export type StockDetailProps = {
  stock: Stock;
  state: GameState;
  stocks: Stock[];
  currency: CurrencyCode;
  saved: boolean;
  liveData: boolean;
  backLabel: string;
  onBack: () => void;
  onToggleSaved: () => void;
  onTrade: (side: "buy" | "sell") => void;
  onCreateSip: (amount: number, frequency: SipFrequency) => void;
  onAddAlert: (target: number) => void;
  onRemoveAlert: (id: string) => void;
  onSearch: () => void;
  onOpenStock: (stock: Stock) => void;
  onOpenFinancials: () => void;
  onOpenOptions: () => void;
};

const timeAgo = (seconds: number) => {
  const diff = Math.max(0, Date.now() / 1000 - seconds);
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hours ago`;
  const days = Math.round(diff / 86400);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const pct = (value: number | null | undefined, digits = 2) => (value === null || value === undefined ? "—" : `${(value * 100).toFixed(digits)}%`);
const fixed = (value: number | null | undefined, digits = 2) => (value === null || value === undefined || !Number.isFinite(value) ? "—" : value.toFixed(digits));

function Section({ title, info, defaultOpen = true, children }: { title: string; info?: boolean; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-[#1C1C1E] px-4 py-5">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-[20px] font-semibold text-white">{title}{info && <Info size={17} className="text-[#C7C7CC]" />}</span>
        {open ? <ChevronUp size={20} className="text-[#C7C7CC]" /> : <ChevronDown size={20} className="text-[#C7C7CC]" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

function Pill({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`rounded-full border px-4 py-[7px] text-[13px] font-medium ${active ? "border-[#C7C7CC] bg-[#1C1C1E] text-white" : "border-[#2C2C2E] text-[#C7C7CC]"}`}>{children}</button>;
}

function RangeBar({ lowLabel, highLabel, low, high, value }: { lowLabel: string; highLabel: string; low: number | null; high: number | null; value: number }) {
  const ratio = low !== null && high !== null && high > low ? Math.min(1, Math.max(0, (value - low) / (high - low))) : 0.5;
  return (
    <div className="mb-5">
      <div className="flex justify-between text-[12px] text-[#C7C7CC]"><span>{lowLabel}</span><span>{highLabel}</span></div>
      <div className="flex justify-between text-[15px] font-medium text-white tabular-nums"><span>{fixed(low)}</span><span>{fixed(high)}</span></div>
      <div className="relative mt-2 h-1 rounded-full bg-[#2C2C2E]">
        <span aria-hidden className="absolute top-2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-b-[10px] border-x-transparent border-b-white" style={{ left: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

function PriceChart({ points, up, previous, tall }: { points: number[]; up: boolean; previous: number | null; tall: boolean }) {
  const data = points.map((value, index) => ({ index, value }));
  const color = up ? GAIN : LOSS;
  if (!data.length) return <div className={`${tall ? "h-[420px]" : "h-[220px]"} flex items-center justify-center text-[13px] text-[#8E8E93]`}>Chart unavailable</div>;
  return (
    <div className={tall ? "h-[420px]" : "h-[220px]"} role="img" aria-label="Price chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 0, bottom: 8, left: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          {previous !== null && <ReferenceLine y={previous} stroke="#48484A" strokeDasharray="2 3" />}
          <Line type="linear" dataKey="value" stroke={color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function FinancialPerformance({ quarterly, yearly, currency, onAll }: { quarterly: PeriodValue[]; yearly: PeriodValue[]; currency: CurrencyCode; onAll: () => void }) {
  const [mode, setMode] = useState<"Quarterly" | "Yearly">("Quarterly");
  const [showRevenue, setShowRevenue] = useState(true);
  const [showProfit, setShowProfit] = useState(true);
  const rows = (mode === "Quarterly" ? quarterly : yearly).slice(-4);
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked !== null && picked < rows.length ? picked : rows.length - 1;
  if (!rows.length) return <EmptyState text="Data does not exist" />;
  const current = rows[selected], previous = rows[selected - 1];
  const growth = (a: number | null, b: number | null | undefined) => (a !== null && b ? (a / Math.abs(b) - 1) * 100 : null);
  const revenueChange = growth(current.revenue, previous?.revenue), profitChange = growth(current.profit, previous?.profit);
  const cagr = (key: "revenue" | "profit") => {
    const first = rows[0][key], last = rows[rows.length - 1][key];
    const years = mode === "Yearly" ? rows.length - 1 : (rows.length - 1) / 4;
    return first && last && first > 0 && last > 0 && years > 0 ? (Math.pow(last / first, 1 / years) - 1) * 100 : null;
  };
  const signed = (value: number | null) => (value === null ? "" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`);
  const tone = (value: number | null) => (value === null ? "" : value >= 0 ? "text-[#00D09C]" : "text-[#FF5722]");
  return (
    <div>
      <div className="flex gap-2"><Pill active={mode === "Quarterly"} onClick={() => { setMode("Quarterly"); setPicked(null); }}>Quarterly</Pill><Pill active={mode === "Yearly"} onClick={() => { setMode("Yearly"); setPicked(null); }}>Yearly</Pill></div>
      <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#C7C7CC]">{current.label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="cursor-pointer">
          <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-[#C7C7CC]"><input type="checkbox" checked={showRevenue} onChange={event => setShowRevenue(event.target.checked)} className="h-3.5 w-3.5 accent-[#A9B4C2]" />REVENUE</span>
          <span className="text-[17px] font-semibold text-white tabular-nums">{current.revenue === null ? "—" : formatCompactMoney(current.revenue, currency)} <small className={`text-[13px] ${tone(revenueChange)}`}>{signed(revenueChange)}</small></span>
        </label>
        <label className="cursor-pointer">
          <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-[#C7C7CC]"><input type="checkbox" checked={showProfit} onChange={event => setShowProfit(event.target.checked)} className="h-3.5 w-3.5 accent-[#00D09C]" />PROFIT</span>
          <span className="text-[17px] font-semibold text-white tabular-nums">{current.profit === null ? "—" : formatCompactMoney(current.profit, currency)} <small className={`text-[13px] ${tone(profitChange)}`}>{signed(profitChange)}</small></span>
        </label>
      </div>
      <div className="mt-3 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows.map((row, index) => ({ ...row, index }))} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barGap={6} onClick={event => { const index = Number((event as { activeTooltipIndex?: number })?.activeTooltipIndex); if (Number.isFinite(index)) setPicked(index); }}>
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#48484A", strokeDasharray: "2 3" }} tick={{ fill: "#C7C7CC", fontSize: 11 }} />
            <YAxis hide />
            {showRevenue && <Bar dataKey="revenue" barSize={16} radius={[2, 2, 0, 0]}>{rows.map((_, index) => <Cell key={index} fill={index === selected ? "#A9B4C2" : "#4A5563"} />)}</Bar>}
            {showProfit && <Bar dataKey="profit" barSize={16} radius={[2, 2, 0, 0]}>{rows.map((_, index) => <Cell key={index} fill={index === selected ? GAIN : "#0E6B50"} />)}</Bar>}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-x-8 border-b border-[#1C1C1E] pb-2 text-[11px] font-semibold tracking-[0.12em] text-[#C7C7CC]"><span>GROWTH</span><span className="text-right">REVENUE</span><span className="text-right">PROFIT</span></div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-8 py-3 text-[15px]"><span className="text-white">{mode === "Yearly" ? `${rows.length - 1}Y CAGR` : "1Y CAGR"}</span><span className={`text-right font-semibold tabular-nums ${tone(cagr("revenue"))}`}>{cagr("revenue") === null ? "—" : `${cagr("revenue")! >= 0 ? "+" : ""}${cagr("revenue")!.toFixed(0)}%`}</span><span className={`text-right font-semibold tabular-nums ${tone(cagr("profit"))}`}>{cagr("profit") === null ? "—" : `${cagr("profit")! >= 0 ? "+" : ""}${cagr("profit")!.toFixed(0)}%`}</span></div>
      <button type="button" onClick={onAll} className="mt-1 flex items-center gap-1 text-[15px] font-semibold text-white underline decoration-dotted underline-offset-4">All Financials <ChevronRight size={16} /></button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden><path d="M36 6 12 64h48L36 6Z" fill="#2E5A66" /><path d="M36 6 24 64h24L36 6Z" fill="#3C7280" /><path d="m36 28-9 16h18l-9-16Z" fill="#F07A6A" /><rect x="35" y="33" width="2" height="6" fill="#fff" /><rect x="35" y="40.5" width="2" height="2" fill="#fff" /><rect x="8" y="64" width="56" height="3" rx="1.5" fill="#1F3D45" /></svg>
      <p className="mt-3 text-[14px] text-[#C7C7CC]">{text}</p>
    </div>
  );
}

function BottomSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={label} onClick={event => event.stopPropagation()} className="w-full max-w-[480px] rounded-t-[24px] bg-[#1C1C1E] px-4 pb-8 pt-2">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#48484A]" />
        {children}
      </section>
    </div>
  );
}

function Gauge({ score }: { score: number }) {
  const bars = 30;
  const marker = Math.round(((score + 1) / 2) * (bars - 1));
  const colorAt = (index: number) => {
    const t = index / (bars - 1);
    if (t < 0.5) { const k = t / 0.5; return `rgba(255,87,34,${1 - k * 0.85})`; }
    const k = (t - 0.5) / 0.5; return `rgba(0,208,156,${0.15 + k * 0.85})`;
  };
  return (
    <div className="mt-5">
      <div className="flex justify-between">{Array.from({ length: bars }, (_, index) => <span key={index} className="h-8 w-[3px] rounded-full" style={{ background: colorAt(index) }} />)}</div>
      <div className="relative mt-2 h-3"><span aria-hidden className="absolute h-0 w-0 -translate-x-1/2 border-x-[8px] border-b-[12px] border-x-transparent border-b-white" style={{ left: `${(marker / (bars - 1)) * 100}%` }} /></div>
    </div>
  );
}

const signalTone: Record<Signal, string> = { Bullish: "text-[#00D09C]", Neutral: "text-[#C7C7CC]", Bearish: "text-[#FF5722]" };

export function StockDetail(props: StockDetailProps) {
  const { stock, state, stocks, currency, saved, liveData, backLabel, onBack, onToggleSaved, onTrade, onCreateSip, onAddAlert, onRemoveAlert, onSearch, onOpenStock, onOpenFinancials, onOpenOptions } = props;
  const [tab, setTab] = useState<DetailTab>("Overview");
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [tall, setTall] = useState(false);
  const [readMore, setReadMore] = useState(false);
  const [sheet, setSheet] = useState<"sip" | "alert" | "calendar" | null>(null);
  const [sipAmount, setSipAmount] = useState("100");
  const [sipFrequency, setSipFrequency] = useState<SipFrequency>("monthly");
  const [alertPrice, setAlertPrice] = useState(() => (stock.price * 1.05).toFixed(2));
  const listed = liveData && exchangeSymbol(stock.ticker) !== null;
  const money = (value: number) => formatMoney(value, currency);

  const fundamentals = useJson<CompanyFundamentals>(listed ? `/api/fundamentals/${stock.ticker}` : null, 15 * 60_000).data;
  const liveDetail = useJson<LiveDetail>(listed ? `/api/quote/${stock.ticker}` : null, 60_000).data;
  const remoteChart = useJson<{ points: { t: number; v: number }[] }>(listed && timeframe !== "1D" ? `/api/chart/${stock.ticker}?range=${timeframe}` : null, 10 * 60_000).data;

  const chartPoints = useMemo(() => {
    if (remoteChart?.points.length) return remoteChart.points.map(point => point.v);
    return stock.history.slice(-SIM_POINTS[timeframe]);
  }, [remoteChart, stock.history, timeframe]);
  const previousClose = fundamentals?.previousClose ?? liveDetail?.previousClose ?? (stock.change ? stock.price / (1 + stock.change / 100) : null);
  const dayChange = previousClose ? stock.price - previousClose : 0;
  const up = timeframe === "1D" ? dayChange >= 0 : (chartPoints.at(-1) ?? 0) >= (chartPoints[0] ?? 0);
  const technicals = useMemo(() => computeTechnicals(stock.history), [stock.history]);

  const simFinancials = useMemo(() => {
    const quarterly = generateFinancials(stock.ticker, stock.marketCap, "quarterly").map(item => ({ label: item.label, revenue: item.revenue, profit: item.netProfit }));
    const yearly = generateFinancials(stock.ticker, stock.marketCap, "yearly").map(item => ({ label: item.label, revenue: item.revenue, profit: item.netProfit }));
    return { quarterly, yearly };
  }, [stock.ticker, stock.marketCap]);
  const quarterly = fundamentals?.quarterly.length ? fundamentals.quarterly : listed ? [] : simFinancials.quarterly;
  const yearly = fundamentals?.yearly.length ? fundamentals.yearly : listed ? [] : simFinancials.yearly;

  const dayLow = fundamentals?.dayLow ?? liveDetail?.dayLow ?? (stock.history.length ? Math.min(...stock.history.slice(-78)) : null);
  const dayHigh = fundamentals?.dayHigh ?? liveDetail?.dayHigh ?? (stock.history.length ? Math.max(...stock.history.slice(-78)) : null);
  const yearLow = fundamentals?.yearLow ?? liveDetail?.yearLow ?? (stock.history.length ? Math.min(...stock.history) : null);
  const yearHigh = fundamentals?.yearHigh ?? liveDetail?.yearHigh ?? (stock.history.length ? Math.max(...stock.history) : null);
  const openPrice = fundamentals?.open ?? (stock.history.length >= 78 ? stock.history[stock.history.length - 78] : stock.history[0] ?? null);
  const eps = fundamentals?.eps ?? (stock.pe ? stock.price / stock.pe : null);

  const fundamentalsGrid: [string, string][] = [
    ["Mkt Cap", fundamentals?.marketCap ? formatCompactMoney(fundamentals.marketCap, currency) : formatCompactMoney(stock.marketCap, currency)],
    ["ROE", pct(fundamentals?.roe)],
    ["P/E Ratio(TTM)", fixed(fundamentals?.pe ?? (stock.pe || null))],
    ["EPS(TTM)", fixed(eps)],
    ["P/B Ratio", fixed(fundamentals?.priceToBook)],
    ["Div Yield", fundamentals ? pct(fundamentals.dividendYield ?? 0) : pct(stock.dividend)],
    ["Forward P/E", fixed(fundamentals?.forwardPe)],
    ["Book Value", fixed(fundamentals?.bookValue)],
    ["Debt to Equity", fundamentals?.debtToEquity !== null && fundamentals?.debtToEquity !== undefined ? (fundamentals.debtToEquity / 100).toFixed(2) : "—"],
    ["Beta", fixed(fundamentals?.beta ?? stock.beta)],
  ];

  const engineNews = state.news.filter((item: GameNews) => item.tickers.includes(stock.ticker)).slice(0, 20);
  const position = state.holdings[stock.ticker];
  const sharesHeld = position?.quantity ?? 0;
  const alerts = state.priceAlerts.filter(alert => alert.ticker === stock.ticker);
  const sips = state.sips.filter(sip => sip.ticker === stock.ticker && sip.status !== "cancelled");
  const recent = state.recentlyViewed.filter(ticker => ticker !== stock.ticker).map(ticker => stocks.find(item => item.ticker === ticker)).filter((item): item is Stock => !!item).slice(0, 6);

  const holders = fundamentals?.holders;
  const holderRows = holders ? ([["Insiders", holders.insiders ?? 0], ["Institutions", holders.institutions ?? 0], ["Public & others", Math.max(0, 1 - (holders.insiders ?? 0) - (holders.institutions ?? 0))]] as [string, number][]) : [];
  const analysts = fundamentals?.analysts;
  const analystTotal = analysts ? analysts.strongBuy + analysts.buy + analysts.hold + analysts.sell + analysts.strongSell : 0;

  const events = fundamentals?.events ?? [];

  return (
    <section className="stock-detail-screen min-h-screen bg-black pb-28">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-black px-4 pb-2 pt-3">
        <button type="button" aria-label={`Back to ${backLabel}`} onClick={onBack} className="text-white"><ArrowLeft size={24} /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-medium text-white">{stock.name}</h1>
          <p className="text-[13px] tabular-nums text-white">{money(stock.price)} <span className={dayChange >= 0 ? "text-[#00D09C]" : "text-[#FF5722]"}>{dayChange >= 0 ? "+" : ""}{dayChange.toFixed(2)} ({Math.abs(stock.change).toFixed(2)}%)</span></p>
        </div>
        <button type="button" aria-label="Price alerts" onClick={() => setSheet("alert")} className="relative text-white"><AlarmClock size={23} />{alerts.length > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#00D09C]" />}</button>
        <button type="button" aria-label={saved ? "Remove stock from watchlist" : "Save stock"} onClick={onToggleSaved} className="text-white"><Bookmark size={23} fill={saved ? "currentColor" : "none"} /></button>
        <button type="button" aria-label="Search stocks" onClick={onSearch} className="text-white"><Search size={23} /></button>
      </header>

      <div className="relative">
        <div className="flex items-center gap-3 px-4 pt-1"><StockLogo stock={stock} size={36} /><span className="text-[12px] text-[#8E8E93]">{stock.ticker} · {stock.sector}{liveDetail?.exchange ? ` · ${liveDetail.exchange}` : ""}{listed ? " · Live" : " · Simulated"}</span></div>
        <PriceChart points={chartPoints} up={up} previous={timeframe === "1D" ? previousClose : null} tall={tall} />
        <button type="button" aria-label={tall ? "Collapse chart" : "Expand chart"} onClick={() => setTall(!tall)} className="absolute bottom-2 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#2C2C2E] bg-black text-white">{tall ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
      </div>
      <div className="flex items-center justify-between px-4 py-2" role="tablist" aria-label="Chart range">
        {TIMEFRAMES.map(item => <button key={item} type="button" role="tab" aria-selected={timeframe === item} onClick={() => setTimeframe(item)} className={`rounded-full px-[10px] py-[5px] text-[12px] font-medium ${timeframe === item ? "border border-[#C7C7CC] text-white" : "border border-transparent text-[#C7C7CC]"}`}>{item}</button>)}
      </div>

      <nav className="sticky top-[60px] z-10 flex border-b border-[#1C1C1E] bg-black px-4" role="tablist" aria-label="Stock sections">
        {DETAIL_TABS.map(item => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`mr-6 border-b-[3px] pb-3 pt-2 text-[17px] ${tab === item ? "border-white font-medium text-white" : "border-transparent text-[#C7C7CC]"}`}>{item}</button>)}
      </nav>

      {tab === "Overview" && <>
        {sharesHeld > 0 && (
          <section className="mx-4 mt-4 rounded-[14px] border border-[#2C2C2E] p-4">
            <p className="text-[12px] text-[#C7C7CC]">Your position</p>
            <div className="mt-1 flex justify-between text-[15px] text-white tabular-nums"><span>{sharesHeld.toFixed(4)} shares · avg {money(position?.averageCost ?? 0)}</span><b>{money(sharesHeld * stock.price)}</b></div>
          </section>
        )}
        <Section title="Performance" info>
          <RangeBar lowLabel="Today's low" highLabel="Today's high" low={dayLow} high={dayHigh} value={stock.price} />
          <RangeBar lowLabel="52 week low" highLabel="52 week high" low={yearLow} high={yearHigh} value={stock.price} />
          <div className="grid grid-cols-3 gap-2">
            <div><p className="text-[12px] text-[#C7C7CC]">Open price</p><p className="text-[15px] font-medium text-white tabular-nums">{fixed(openPrice)}</p></div>
            <div><p className="text-[12px] text-[#C7C7CC]">Previous close</p><p className="text-[15px] font-medium text-white tabular-nums">{fixed(previousClose)}</p></div>
            <div><p className="text-[12px] text-[#C7C7CC]">Volume</p><p className="text-[15px] font-medium text-white tabular-nums">{(fundamentals?.volume ?? liveDetail?.volume ?? stock.volume).toLocaleString("en-US")}</p></div>
          </div>
        </Section>
        <Section title="Fundamentals" info>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {fundamentalsGrid.map(([label, value]) => <div key={label} className="flex items-center justify-between text-[15px]"><span className="text-[#C7C7CC]">{label}</span><b className="font-semibold text-white tabular-nums">{value}</b></div>)}
          </div>
        </Section>
        <Section title="Financial performance">
          <FinancialPerformance key={`${quarterly.length}-${yearly.length}`} quarterly={quarterly} yearly={yearly} currency={currency} onAll={onOpenFinancials} />
        </Section>
        {analysts && analystTotal > 0 && (
          <Section title="Analyst ratings">
            {([["Buy", analysts.strongBuy + analysts.buy, GAIN], ["Hold", analysts.hold, "#C7C7CC"], ["Sell", analysts.sell + analysts.strongSell, LOSS]] as [string, number, string][]).map(([label, count, color]) => (
              <div key={label} className="mb-3 flex items-center gap-3 text-[15px]"><span className="w-12 text-white">{label}</span><span className="h-1.5 flex-1 rounded-full bg-[#1C1C1E]"><span className="block h-full rounded-full" style={{ width: `${(count / analystTotal) * 100}%`, background: color }} /></span><span className="w-12 text-right font-semibold tabular-nums text-white">{Math.round((count / analystTotal) * 100)}%</span></div>
            ))}
            {analysts.targetMean !== null && <p className="text-[13px] text-[#C7C7CC]">Average target {money(analysts.targetMean)}{analysts.targetLow !== null && analysts.targetHigh !== null ? ` (range ${money(analysts.targetLow)} – ${money(analysts.targetHigh)})` : ""} from {analystTotal} analysts.</p>}
          </Section>
        )}
        <Section title="About">
          {([["MD/CEO", fundamentals?.ceo?.replace(/^(Mr|Ms|Mrs|Dr)\.\s+/, "").replace(/\s+/g, " ")], ["Headquarters", fundamentals?.headquarters], ["Employees", fundamentals?.employees?.toLocaleString("en-US")], ["Industry", fundamentals?.industry ?? stock.sector], ["Symbol", stock.ticker]] as [string, string | null | undefined][]).filter(([, value]) => value).map(([label, value]) => <div key={label} className="flex justify-between py-[6px] text-[15px]"><span className="text-[#C7C7CC]">{label}</span><b className="font-semibold text-white">{value}</b></div>)}
          <p className={`mt-3 text-[15px] leading-6 text-[#C7C7CC] ${readMore ? "" : "line-clamp-3"}`}>{fundamentals?.description ?? `${stock.name} is a ${stock.sector.toLowerCase()} company in the STONKS market. Its price follows the simulated market clock, sector moves and news events.`}</p>
          <button type="button" onClick={() => setReadMore(!readMore)} className="mt-2 text-[14px] font-semibold text-white underline decoration-dotted underline-offset-4">{readMore ? "Read less" : "Read more"}</button>
        </Section>
        {holderRows.length > 0 && (
          <Section title="Shareholding pattern">
            <div className="mb-4 flex gap-2"><Pill active onClick={() => undefined}>Latest</Pill></div>
            {holderRows.map(([label, value], index) => (
              <div key={label} className="mb-5 flex items-center gap-4 text-[15px]"><span className="w-[110px] text-white">{label}</span><span className="h-1.5 flex-1 rounded-full bg-[#1C1C1E]"><span className="block h-full rounded-full" style={{ width: `${value * 100}%`, background: HOLDER_COLORS[index] }} /></span><span className="w-16 text-right font-medium tabular-nums text-white">{(value * 100).toFixed(2)}%</span></div>
            ))}
            {holders?.institutionsCount ? <p className="text-[13px] text-[#C7C7CC]">{holders.institutionsCount.toLocaleString("en-US")} institutions hold this stock.</p> : null}
          </Section>
        )}
        <Section title="Options">
          <button type="button" onClick={onOpenOptions} className="flex w-full items-center justify-between text-left text-[15px] text-white"><span>View option chain for {stock.ticker}</span><ChevronRight size={18} className="text-[#C7C7CC]" /></button>
        </Section>
        {sips.length > 0 && (
          <Section title="Your SIPs">
            {sips.map(sip => <div key={sip.id} className="flex justify-between py-2 text-[15px] text-white"><span className="capitalize">{sip.frequency} · {money(sip.amount)}</span><span className={sip.status === "active" ? "text-[#00D09C]" : "text-[#8E8E93]"}>{sip.status}</span></div>)}
          </Section>
        )}
        {recent.length > 0 && (
          <section className="px-4 py-5">
            <h2 className="text-[20px] font-semibold text-white">Recently viewed</h2>
            <div className="mt-4 flex gap-5 overflow-x-auto">
              {recent.map(item => <button key={item.ticker} type="button" onClick={() => onOpenStock(item)} className="flex w-16 shrink-0 flex-col items-start gap-1 text-left"><StockLogo stock={item} size={40} /><span className="text-[11px] text-[#C7C7CC]">{item.ticker}</span><span className={`text-[12px] ${item.change >= 0 ? "text-[#00D09C]" : "text-[#FF5722]"}`}>{item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%</span></button>)}
            </div>
          </section>
        )}
      </>}

      {tab === "Technicals" && <>
        <Section title="Summary" info>
          <p className="-mt-3 mb-4 text-[13px] text-[#C7C7CC]">Based on {listed ? "1D" : "simulated session"} data</p>
          <div className="rounded-[16px] border border-[#2C2C2E] bg-[#0D0D0D] p-4">
            <p className="text-[13px] text-[#C7C7CC]">Based on technicals, this stock is</p>
            <p className="text-[18px] font-medium text-white">{technicals.verdict}</p>
            <Gauge score={technicals.score} />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {([["Bearish", technicals.bearish, LOSS], ["Neutral", technicals.neutral, "#C7C7CC"], ["Bullish", technicals.bullish, GAIN]] as [string, number, string][]).map(([label, count, color]) => <div key={label} className="border-l-[3px] pl-3" style={{ borderColor: color }}><p className="text-[14px] text-white">{label}</p><p className="text-[15px] font-medium text-white tabular-nums">{count}</p></div>)}
            </div>
          </div>
        </Section>
        <Section title="Indicators" info>
          {technicals.indicators.map(item => (
            <div key={item.name} className="flex items-center justify-between border-b border-[#1C1C1E] py-3 last:border-0">
              <span><b className="block text-[15px] font-medium text-white">{item.name}</b><small className="text-[12px] text-[#8E8E93]">{item.description}</small></span>
              <span className="text-right"><b className="block text-[15px] font-semibold text-white tabular-nums">{item.display}</b><small className={`text-[12px] font-semibold ${signalTone[item.signal]}`}>{item.signal}</small></span>
            </div>
          ))}
        </Section>
      </>}

      {tab === "News" && (
        <div>
          {liveDetail?.news.map(item => (
            <a key={item.link} href={item.link} target="_blank" rel="noreferrer" className="block border-b border-[#1C1C1E] px-4 py-4">
              <p className="text-[12px] text-[#C7C7CC]">{item.publisher} <span className="mx-1">•</span> {timeAgo(item.time)}</p>
              <p className="mt-1 text-[15px] leading-6 text-white">{item.title}</p>
            </a>
          ))}
          {engineNews.map(item => (
            <article key={item.id} className="border-b border-[#1C1C1E] px-4 py-4">
              <p className="text-[12px] text-[#C7C7CC]">{item.source ?? "Market wire"} <span className="mx-1">•</span> Day {item.day}{item.status ? ` · ${item.status}` : ""}</p>
              <p className="mt-1 text-[15px] leading-6 text-white">{item.headline}</p>
              {item.body && <p className="mt-1 text-[14px] leading-5 text-[#C7C7CC]">{item.body}</p>}
            </article>
          ))}
          {!liveDetail?.news.length && !engineNews.length && <EmptyState text="No news for this stock yet" />}
        </div>
      )}

      {tab === "Events" && (
        <div className="px-4 py-5">
          {events.length ? Object.entries(events.reduce<Record<string, typeof events>>((groups, event) => { const year = String(new Date(event.date * 1000).getUTCFullYear()); (groups[year] ??= []).push(event); return groups; }, {})).map(([year, items]) => (
            <div key={year} className="mb-4">
              <p className="mb-3 text-[17px] text-white">{year}</p>
              {items.map(event => { const date = new Date(event.date * 1000); return (
                <div key={`${event.title}-${event.date}`} className="mb-4 flex items-center gap-4">
                  <span className="flex h-[52px] w-[44px] flex-col items-center justify-center rounded-[8px] border border-[#2C2C2E]"><b className="text-[15px] text-white">{date.getUTCDate()}</b><small className="text-[11px] text-[#C7C7CC]">{date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}</small></span>
                  <span><b className="block text-[15px] font-medium text-white">{event.title}</b><small className="text-[14px] text-[#C7C7CC]">{event.detail}</small></span>
                </div>
              ); })}
            </div>
          )) : <EmptyState text={listed ? "No upcoming events" : "Corporate events are available for listed stocks with live market data on"} />}
          <button type="button" onClick={() => setSheet("calendar")} className="mt-2 flex w-full items-center gap-4 rounded-[14px] border border-[#2C2C2E] p-4 text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#0A3D33] text-[#00D09C]"><CalendarDays size={24} /></span>
            <span className="flex-1"><small className="block text-[12px] text-[#C7C7CC]">Events calendar</small><b className="text-[15px] font-medium text-white">View upcoming events in other stocks</b></span>
            <ChevronRight size={18} className="text-[#C7C7CC]" />
          </button>
        </div>
      )}

      <div className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[480px] -translate-x-1/2 gap-3 bg-black px-4 pb-5 pt-3">
        <button type="button" onClick={() => setSheet("sip")} className="h-12 w-[52px] rounded-[10px] border border-[#2C2C2E] text-[14px] font-medium text-white">SIP</button>
        <button type="button" onClick={() => onTrade("sell")} className="h-12 flex-1 rounded-[10px] bg-[#FF5722] text-[16px] font-semibold text-white">Sell</button>
        <button type="button" onClick={() => onTrade("buy")} className="h-12 flex-1 rounded-[10px] bg-[#00D09C] text-[16px] font-semibold text-white">Buy</button>
      </div>

      {sheet === "sip" && (
        <BottomSheet label="Start a SIP" onClose={() => setSheet(null)}>
          <h2 className="text-[22px] font-bold text-white">Start a SIP in {stock.ticker}</h2>
          <p className="mt-1 text-[13px] text-[#C7C7CC]">Invest a fixed amount automatically during market hours. Each instalment uses the same price, spread and fee as a manual buy.</p>
          <label className="mt-4 block text-[12px] text-[#C7C7CC]" htmlFor="sip-amount">Amount per instalment (USD)</label>
          <input id="sip-amount" inputMode="decimal" value={sipAmount} onChange={event => setSipAmount(event.target.value.replace(/[^0-9.]/g, ""))} className="mt-1 h-12 w-full rounded-[12px] bg-black px-3 text-[17px] text-white tabular-nums" />
          <div className="mt-4 flex gap-2">{(["daily", "weekly", "monthly"] as SipFrequency[]).map(item => <Pill key={item} active={sipFrequency === item} onClick={() => setSipFrequency(item)}>{item[0].toUpperCase() + item.slice(1)}</Pill>)}</div>
          <button type="button" disabled={!(Number(sipAmount) >= 1)} onClick={() => { onCreateSip(Number(sipAmount), sipFrequency); setSheet(null); }} className="mt-5 h-12 w-full rounded-full bg-[#00D09C] text-[16px] font-semibold text-white disabled:opacity-40">Start SIP</button>
        </BottomSheet>
      )}

      {sheet === "alert" && (
        <BottomSheet label="Price alerts" onClose={() => setSheet(null)}>
          <h2 className="text-[22px] font-bold text-white">Price alert</h2>
          <p className="mt-1 text-[13px] text-[#C7C7CC]">Get notified when {stock.ticker} reaches a price. Current price {money(stock.price)}.</p>
          <label className="mt-4 block text-[12px] text-[#C7C7CC]" htmlFor="alert-price">Target price (USD)</label>
          <input id="alert-price" inputMode="decimal" value={alertPrice} onChange={event => setAlertPrice(event.target.value.replace(/[^0-9.]/g, ""))} className="mt-1 h-12 w-full rounded-[12px] bg-black px-3 text-[17px] text-white tabular-nums" />
          <button type="button" disabled={!(Number(alertPrice) > 0)} onClick={() => onAddAlert(Number(alertPrice))} className="mt-4 h-12 w-full rounded-full bg-[#00D09C] text-[16px] font-semibold text-white disabled:opacity-40">Add alert</button>
          {alerts.map(alert => <div key={alert.id} className="mt-3 flex items-center justify-between rounded-[12px] bg-black px-3 py-3 text-[15px] text-white"><span>{alert.direction === "above" ? "Rises to" : "Falls to"} {money(alert.target)}</span><button type="button" aria-label={`Remove alert at ${alert.target}`} onClick={() => onRemoveAlert(alert.id)} className="text-[#8E8E93]"><X size={18} /></button></div>)}
        </BottomSheet>
      )}

      {sheet === "calendar" && <EventsCalendar watchlist={state.watchlist.filter(ticker => ticker !== stock.ticker && exchangeSymbol(ticker))} onClose={() => setSheet(null)} enabled={liveData} />}
    </section>
  );
}

function CalendarRow({ ticker }: { ticker: string }) {
  const data = useJson<CompanyFundamentals>(`/api/fundamentals/${ticker}`, 15 * 60_000).data;
  const next = data?.events.find(event => event.date * 1000 >= Date.now() - 86400_000);
  if (!next) return null;
  const date = new Date(next.date * 1000);
  return <div className="flex items-center justify-between border-b border-[#2C2C2E] py-3 text-[15px] text-white"><span><b className="font-semibold">{ticker}</b> <span className="text-[#C7C7CC]">{next.title}</span></span><span className="tabular-nums text-[#C7C7CC]">{date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span></div>;
}

function EventsCalendar({ watchlist, onClose, enabled }: { watchlist: string[]; onClose: () => void; enabled: boolean }) {
  return (
    <BottomSheet label="Events calendar" onClose={onClose}>
      <h2 className="text-[22px] font-bold text-white">Events calendar</h2>
      <p className="mb-2 mt-1 text-[13px] text-[#C7C7CC]">Next results and dividend dates for stocks on your watchlist.</p>
      {enabled && watchlist.length ? watchlist.slice(0, 10).map(ticker => <CalendarRow key={ticker} ticker={ticker} />) : <p className="py-4 text-[14px] text-[#C7C7CC]">Turn on live market data and add listed stocks to your watchlist to see their events.</p>}
    </BottomSheet>
  );
}
