"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ReferenceDot, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ChevronRight, Gift, Layers, Play, Plus, Target, Trophy } from "lucide-react";
import { StockListRow } from "@/components/discovery/StockListRow";
import { CompanyLogo } from "@/components/market/CompanyLogo";
import { MarketSpeedSheet } from "@/components/ui/Sheets";
import { speedLabel } from "@/components/settings/SettingsScreen";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { gameDateLabel } from "@/lib/game-calendar";
import { MARKET_OPEN_MINUTE, MARKET_SESSION_MINUTES } from "@/lib/game-engine";
import type { Stock } from "@/lib/market";

type ChartPoint = { label: string; value: number };
export type HomePosition = { stock: Stock; quantity: number; marketValue: number; returnPct: number };
export type HomeChallenge = { joined: boolean; rank: number; entrants: number; returnPct: number };

export type HomeDashboardProps = {
  marketMinute: number;
  day?: number;
  totalValue: number;
  dailyChange: number;
  dailyChangePct: number;
  previousClose: number;
  chartData: ChartPoint[];
  currency: CurrencyCode;
  buyingPower: number;
  timeframe: string;
  positions: HomePosition[];
  speed?: number;
  optionPositions?: number;
  watchlist?: Stock[];
  movers?: Stock[];
  challenge?: HomeChallenge;
  missionReady?: boolean;
  bonusReady?: boolean;
  videosLeft?: number;
  onTimeframeChange: (value: string) => void;
  onStockSelect: (stock: Stock) => void;
  onHistory: () => void;
  onAddCash: () => void;
  onSettings?: () => void;
  onSpeedChange?: (speed: number) => void;
  onDailyBonus?: () => void;
  onViewChallenge?: () => void;
  onMissions?: () => void;
  onVideoBonus?: () => void;
  onOptionPositions?: () => void;
  onEditList?: () => void;
  onAddToList?: () => void;
  onSeeAllMovers?: () => void;
  onNetWorth?: () => void;
};

export type MarketSession = { isOpen: true; minutesRemaining: number } | { isOpen: false; minutesUntilOpen: number };

export function getMarketSession(marketMinute: number): MarketSession {
  const closeMinute = MARKET_OPEN_MINUTE + MARKET_SESSION_MINUTES;
  const isOpen = marketMinute >= MARKET_OPEN_MINUTE && marketMinute < closeMinute;
  return isOpen
    ? { isOpen: true, minutesRemaining: closeMinute - marketMinute }
    : { isOpen: false, minutesUntilOpen: marketMinute < MARKET_OPEN_MINUTE ? MARKET_OPEN_MINUTE - marketMinute : 1440 - marketMinute + MARKET_OPEN_MINUTE };
}

export function useMarketSession(marketMinute: number) {
  return useMemo(() => getMarketSession(marketMinute), [marketMinute]);
}

export function durationLabel(totalMinutes: number) {
  const minutesTotal = Math.max(0, Math.round(totalMinutes));
  const days = Math.floor(minutesTotal / 1440), hours = Math.floor((minutesTotal % 1440) / 60), minutes = minutesTotal % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

const TIMEFRAMES = ["1D", "1W", "1M", "3M", "1Y", "ALL"];
const PERIOD_LABEL: Record<string, string> = { "1D": "Today", "1W": "Past week", "1M": "Past month", "3M": "Past 3 months", "1Y": "Past year", ALL: "All time" };

function PortfolioChart({ data, baseline, rising, isOpen }: { data: ChartPoint[]; baseline: number; rising: boolean; isOpen: boolean }) {
  const color = isOpen ? (rising ? "#00D09C" : "#FF5722") : "#8E8E93";
  const bounds = useMemo(() => {
    const values = data.map(point => point.value);
    const minimum = Math.min(baseline, ...values), maximum = Math.max(baseline, ...values);
    const padding = Math.max((maximum - minimum) * 0.08, Math.abs(maximum) * 0.001, 0.01);
    return [minimum - padding, maximum + padding] as [number, number];
  }, [data, baseline]);
  const current = data[data.length - 1];
  return (
    <div className={`h-[210px] w-full ${isOpen ? "" : "is-market-closed opacity-80"}`} data-testid="home-portfolio-chart" role="img" aria-label="Portfolio value history">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 14, right: 8, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="homePortfolioFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <YAxis hide domain={bounds} />
          <ReferenceLine y={baseline} stroke="#8E8E93" strokeDasharray="3 5" strokeOpacity={0.7} />
          <Area type="linear" dataKey="value" stroke={color} strokeWidth={2} fill="url(#homePortfolioFill)" dot={false} activeDot={false} isAnimationActive={false} />
          {current && <ReferenceDot x={current.label} y={current.value} r={4.5} fill={color} stroke={color} strokeOpacity={0.35} strokeWidth={6} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Banner({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 flex w-full items-center gap-3 rounded-[12px] border border-[#0F4D3A] bg-[#0A2A20] px-4 py-3 text-left text-[14px] font-semibold leading-[18px] text-[#00D09C]">
      <span className="shrink-0">{icon}</span><span className="flex-1">{children}</span><ChevronRight size={18} className="shrink-0" />
    </button>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <h2 className="text-[19px] font-bold text-white">{title}</h2>
      {action && <button type="button" onClick={onAction} className="text-[14px] font-semibold text-[#00D09C]">{action}</button>}
    </div>
  );
}

export function HomeDashboard(props: HomeDashboardProps) {
  const {
    marketMinute, day = 1, totalValue, dailyChange, dailyChangePct, previousClose, chartData, currency, buyingPower, timeframe, positions,
    speed = 1, optionPositions = 0, watchlist = [], movers = [], challenge, missionReady = false, bonusReady = false, videosLeft = 0,
    onTimeframeChange, onStockSelect, onHistory, onAddCash, onSpeedChange, onDailyBonus, onViewChallenge, onMissions, onVideoBonus,
    onOptionPositions, onEditList, onAddToList, onSeeAllMovers, onNetWorth,
  } = props;
  const [speedSheetOpen, setSpeedSheetOpen] = useState(false);
  const session = useMarketSession(marketMinute);
  const money = (value: number) => formatMoney(value, currency);

  const oneDay = timeframe === "1D";
  const baseline = oneDay ? previousClose : chartData[0]?.value ?? totalValue;
  const change = oneDay ? dailyChange : totalValue - baseline;
  const changePct = oneDay ? dailyChangePct : (change / Math.max(1, baseline)) * 100;
  const rising = change >= 0;
  const changeText = `${rising ? "+" : "−"}${money(Math.abs(change))} (${rising ? "+" : "−"}${Math.abs(changePct).toFixed(2)}%) ${PERIOD_LABEL[timeframe] ?? "Today"}`;
  const dim = !session.isOpen;

  return (
    <section className="home-dashboard -mx-4 bg-black px-4 pb-10 text-white" aria-label="Investing dashboard">
      <header className="flex items-center justify-between pt-4">
        <h1 className="text-[26px] font-bold">Investing</h1>
        <div className="flex items-center gap-4">
          <button type="button" aria-label="Market speed" onClick={() => setSpeedSheetOpen(true)} className="h-9 min-w-[64px] rounded-full bg-[#1C1C1E] px-4 text-[14px] font-bold tabular-nums">{speedLabel(speed)}</button>
          <button type="button" aria-label={bonusReady ? "Daily login bonus available" : "Daily login bonus"} onClick={onDailyBonus} className="relative">
            <Gift size={23} />
            {bonusReady && <span className="absolute -right-1 -top-1 h-[9px] w-[9px] rounded-full bg-[#FF3B30]" />}
          </button>
        </div>
      </header>

      <p className={`mt-1 flex items-center gap-[6px] text-[13px] font-semibold tabular-nums ${session.isOpen ? "text-white" : "text-[#8E8E93]"}`}>
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${session.isOpen ? "bg-[#00D09C]" : "bg-[#8E8E93]"}`} />
        {session.isOpen ? `Market open · closes in ${durationLabel(session.minutesRemaining)}` : `Market closed · opens in ${durationLabel(session.minutesUntilOpen)}`}
      </p>
      <p className="mt-[2px] text-[12px] text-[#C7C7CC] tabular-nums">{gameDateLabel(day, marketMinute)}</p>

      <button type="button" onClick={onNetWorth} aria-label="Net worth details" className="mt-1 block text-left">
        <span className={`block text-[36px] font-bold leading-[44px] tracking-[-0.5px] tabular-nums ${dim ? "is-market-closed text-[#C7C7CC]" : "text-white"}`} data-testid="home-net-worth">{money(totalValue)}</span>
        <span className={`block text-[13px] font-semibold tabular-nums ${rising ? "text-[#00D09C]" : "text-[#FF5722]"}`}>{changeText}</span>
      </button>

      <div className="-mx-4 mt-2"><PortfolioChart data={chartData} baseline={baseline} rising={rising} isOpen={session.isOpen} /></div>

      <div className="mt-2 flex justify-between" role="group" aria-label="Portfolio chart timeframe">
        {TIMEFRAMES.map(value => (
          <button type="button" key={value} aria-pressed={timeframe === value} onClick={() => onTimeframeChange(value)}
            className={`h-8 min-w-[50px] rounded-[8px] px-3 text-[13px] font-semibold tabular-nums ${timeframe === value ? "bg-[#0B3D2E] text-[#00D09C]" : "text-[#C7C7CC]"}`}>{value}</button>
        ))}
      </div>

      <div className="mt-4 flex items-center border-y border-[#2C2C2E] py-4">
        <span className="text-[15px] font-semibold">Buying power</span>
        <button type="button" onClick={onAddCash} className="ml-8 text-[13px] font-bold tracking-[0.3px] text-[#00D09C]">ADD CASH</button>
        <button type="button" onClick={onAddCash} aria-label={`Buying power ${money(buyingPower)}`} className="ml-auto flex items-center gap-1 text-[15px] font-bold tabular-nums">{money(buyingPower)}<ChevronRight size={18} className="text-[#8E8E93]" /></button>
      </div>

      {challenge && (
        <div className="mt-4 rounded-[14px] bg-[#1C1C1E] p-4">
          <p className="flex items-center gap-2 text-[16px] font-bold"><Trophy size={19} className="text-[#F5C542]" fill="#F5C542" />Weekly challenge</p>
          <p className="mt-1 text-[13px] leading-[18px] text-[#C7C7CC]">
            {challenge.joined
              ? <>You&apos;re <b className="text-white">#{challenge.rank}</b> of {challenge.entrants} this week at <b className={challenge.returnPct >= 0 ? "text-[#00D09C]" : "text-[#FF5722]"}>{challenge.returnPct >= 0 ? "+" : "−"}{Math.abs(challenge.returnPct).toFixed(2)}%</b>.</>
              : "Join this week's challenge and race four trading bots in the same market."}
          </p>
          <button type="button" onClick={onViewChallenge} className="mt-3 h-11 w-full rounded-full bg-[#00D09C] text-[14px] font-bold text-black">View challenge</button>
        </div>
      )}

      {missionReady && <Banner icon={<Target size={19} />} onClick={onMissions}>A mission reward is ready to claim</Banner>}
      {videosLeft > 0 && <Banner icon={<Play size={17} fill="currentColor" />} onClick={onVideoBonus}>Get $5,000 more buying power. Watch a short video.</Banner>}

      <SectionHeader title="Positions" action="History" onAction={onHistory} />
      <div className="home-positions-list mt-1">
        {positions.length ? positions.map(position => (
          <StockListRow key={position.stock.ticker} stock={position.stock} currency={currency} quantity={position.quantity} subtitle={`${Number(position.quantity.toFixed(6))} shares`} value={position.marketValue} changePercent={position.stock.change} onClick={() => onStockSelect(position.stock)} />
        )) : <p className="py-4 text-[14px] text-[#8E8E93]">Your positions will appear here after your first trade.</p>}
        {optionPositions > 0 && (
          <button type="button" onClick={onOptionPositions} className="flex w-full items-center gap-3 py-3 text-left">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1C1C1E]"><Layers size={18} /></span>
            <span className="flex-1 text-[15px] font-semibold">Options positions</span>
            <span className="text-[15px] text-[#C7C7CC] tabular-nums">{optionPositions}</span><ChevronRight size={18} className="text-[#8E8E93]" />
          </button>
        )}
      </div>

      <SectionHeader title="Lists" action="Edit" onAction={onEditList} />
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-full bg-[#0B3D2E] px-3 py-[6px] text-[13px] font-bold text-[#00D09C]">My list</span>
        <button type="button" aria-label="Add stocks to my list" onClick={onAddToList} className="grid h-8 w-8 place-items-center rounded-full bg-[#1C1C1E]"><Plus size={16} /></button>
      </div>
      <div className="mt-1" data-home-list="My list">
        {watchlist.length ? watchlist.map(stock => <StockListRow key={stock.ticker} stock={stock} currency={currency} onClick={() => onStockSelect(stock)} />)
          : <p className="py-4 text-[14px] text-[#8E8E93]">Save stocks with the bookmark on any stock page.</p>}
      </div>

      {movers.length > 0 && (
        <>
          <SectionHeader title="Top movers" action="See all" onAction={onSeeAllMovers} />
          <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
            {movers.map(stock => (
              <button type="button" key={stock.ticker} onClick={() => onStockSelect(stock)} className="w-[112px] shrink-0 rounded-[14px] bg-[#1C1C1E] p-3 text-left">
                <CompanyLogo ticker={stock.ticker} name={stock.name} size={32} />
                <b className="mt-2 block text-[15px]">{stock.ticker}</b>
                <span className={`block text-[13px] tabular-nums ${stock.change >= 0 ? "text-[#00D09C]" : "text-[#FF5722]"}`}>{money(stock.price)}</span>
                <b className={`block text-[16px] tabular-nums ${stock.change >= 0 ? "text-[#00D09C]" : "text-[#FF5722]"}`}>{stock.change >= 0 ? "+" : "−"}{Math.abs(stock.change).toFixed(2)}%</b>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mt-6 text-center text-[11px] leading-4 text-[#8E8E93]">STONKS is a game. All prices are simulated or delayed and money is virtual. Not investment advice.</p>

      {speedSheetOpen && <MarketSpeedSheet speed={speed} onSelect={value => onSpeedChange?.(value)} onClose={() => setSpeedSheetOpen(false)} />}
    </section>
  );
}
