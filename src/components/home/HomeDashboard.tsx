"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, ReferenceDot, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Check, ChevronRight, Clock3, Settings, X } from "lucide-react";
import { StockListRow } from "@/components/discovery/StockListRow";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { MARKET_OPEN_MINUTE, MARKET_SESSION_MINUTES } from "@/lib/game-engine";
import type { Stock } from "@/lib/market";

type SpeedMode = "Live" | "Fast" | "Turbo" | "Paused";
type ChartPoint = { label: string; value: number };
export type HomePosition = { stock: Stock; quantity: number; marketValue: number; returnPct: number };

type Props = {
  marketMinute: number;
  totalValue: number;
  dailyChange: number;
  dailyChangePct: number;
  previousClose: number;
  chartData: ChartPoint[];
  currency: CurrencyCode;
  buyingPower: number;
  timeframe: string;
  positions: HomePosition[];
  onTimeframeChange: (value: string) => void;
  onStockSelect: (stock: Stock) => void;
  onHistory: () => void;
  onAddCash: () => void;
  onSettings: () => void;
  belowPositions?: ReactNode;
};

export function getMarketSession(marketMinute: number) {
  const closeMinute = MARKET_OPEN_MINUTE + MARKET_SESSION_MINUTES;
  const isOpen = marketMinute >= MARKET_OPEN_MINUTE && marketMinute < closeMinute;
  return isOpen
    ? { isOpen, minutesRemaining: closeMinute - marketMinute }
    : { isOpen, minutesUntilOpen: marketMinute < MARKET_OPEN_MINUTE
      ? MARKET_OPEN_MINUTE - marketMinute
      : 1440 - marketMinute + MARKET_OPEN_MINUTE };
}

function durationLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function PortfolioChart({ data, previousClose, isOpen }: { data: ChartPoint[]; previousClose: number; isOpen: boolean }) {
  const rising = data.length < 2 || data[data.length - 1].value >= previousClose;
  const color = rising ? "#00D09C" : "#FF5722";
  const bounds = useMemo(() => {
    const values = data.map(point => point.value);
    return [
      Math.min(previousClose, ...values),
      Math.max(previousClose, ...values)
    ] as [number, number];
  }, [data, previousClose]);
  const current = data[data.length - 1];

  return (
    <div
      className={`home-portfolio-chart${isOpen ? "" : " is-market-closed"}`}
      data-testid="home-portfolio-chart"
      role="img"
      aria-label="Portfolio value history"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 5, bottom: 0, left: 5 }}>
          <defs>
            <linearGradient id="homePortfolioFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <YAxis hide domain={bounds} />
          <ReferenceLine y={previousClose} stroke="#8E8E93" strokeDasharray="4 6" strokeOpacity={0.65} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.2}
            fill="url(#homePortfolioFill)"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          {current && <ReferenceDot x={current.label} y={current.value} r={4} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const speedOptions: { mode: SpeedMode; description: string; short: string }[] = [
  { mode: "Live", description: "Real time", short: "1×" },
  { mode: "Fast", description: "1 hour per real minute", short: "Fast" },
  { mode: "Turbo", description: "1 trading day per real minute", short: "Turbo" },
  { mode: "Paused", description: "Time stands still", short: "Paused" }
];

export function HomeDashboard({
  marketMinute, totalValue, dailyChange, dailyChangePct, previousClose, chartData,
  currency, buyingPower, timeframe, positions, onTimeframeChange, onStockSelect,
  onHistory, onAddCash, onSettings, belowPositions
}: Props) {
  const [speedMode, setSpeedMode] = useState<SpeedMode>("Live");
  const [speedSheetOpen, setSpeedSheetOpen] = useState(false);
  const session = getMarketSession(marketMinute);
  const money = (value: number) => formatMoney(value, currency);
  const changeText = `${dailyChange >= 0 ? "+" : "−"}${money(Math.abs(dailyChange))} (${dailyChangePct >= 0 ? "+" : "−"}${Math.abs(dailyChangePct).toFixed(2)}%) Today`;
  const selectedSpeed = speedOptions.find(option => option.mode === speedMode)!;

  return (
    <section className="home-dashboard" aria-label="Investing dashboard">
      <header className="home-dashboard-header">
        <div>
          <h1>Investing</h1>
          <p className={`home-market-status ${session.isOpen ? "market-open" : "market-closed"}`}>
            <span aria-hidden="true">●</span>
            {session.isOpen
              ? `Market open · closes in ${durationLabel(session.minutesRemaining)}`
              : `Market closed · opens in ${durationLabel(session.minutesUntilOpen)}`}
          </p>
        </div>
        <div className="home-header-actions">
          <button type="button" className="home-speed-button" aria-label="Market speed" onClick={() => setSpeedSheetOpen(true)}>
            {selectedSpeed.short}
          </button>
          <button type="button" className="home-settings-button" aria-label="Settings" onClick={onSettings}>
            <Settings size={20} />
          </button>
        </div>
      </header>

      <section className="home-net-worth-section" aria-label="Portfolio net worth">
        <p className="home-eyebrow">Net worth</p>
        <div className={`home-net-worth${session.isOpen ? "" : " is-market-closed"}`} data-testid="home-net-worth">
          {money(totalValue)}
        </div>
        <p className={`home-daily-change ${dailyChange >= 0 ? "positive" : "negative"}`}>
          {changeText}
        </p>
      </section>

      <PortfolioChart data={chartData} previousClose={previousClose} isOpen={session.isOpen} />

      <div className="home-timeframes" role="group" aria-label="Portfolio chart timeframe">
        {["1D", "1W", "1M", "3M", "1Y", "ALL"].map(value => (
          <button
            type="button"
            key={value}
            className={timeframe === value ? "selected" : ""}
            aria-pressed={timeframe === value}
            onClick={() => onTimeframeChange(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="home-buying-power">
        <span className="home-buying-label">Buying power</span>
        <button type="button" className="home-add-cash" onClick={onAddCash}>ADD CASH</button>
        <button type="button" className="home-buying-value" onClick={onAddCash}>
          <strong>{money(buyingPower)}</strong>
          <ChevronRight size={18} />
        </button>
      </div>

      <section className="home-gamification-placeholder" aria-label="Upcoming dashboard features">
        <div className="home-placeholder-static">
          <span className="home-placeholder-icon"><Clock3 size={17} /></span>
          <span><b>Weekly challenge</b><small>Challenge highlights are being refreshed</small></span>
          <span className="home-placeholder-soon">Coming soon</span>
        </div>
        <button type="button" onClick={onAddCash}>
          <span className="home-placeholder-icon"><span aria-hidden="true">＋</span></span>
          <span><b>Virtual cash</b><small>Add funds to your buying power</small></span>
          <ChevronRight size={17} />
        </button>
      </section>

      <div className="home-positions-heading">
        <h2>Positions</h2>
        <button type="button" onClick={onHistory}>History</button>
      </div>
      <div className="home-positions-list">
        {positions.length ? positions.map(position => (
          <StockListRow
            key={position.stock.ticker}
            stock={position.stock}
            currency={currency}
            quantity={position.quantity}
            value={position.marketValue}
            changePercent={position.returnPct}
            onClick={() => onStockSelect(position.stock)}
          />
        )) : <p className="home-empty-positions">Your positions will appear here after your first trade.</p>}
      </div>
      {belowPositions}

      {speedSheetOpen && (
        <div className="home-speed-backdrop" onClick={() => setSpeedSheetOpen(false)}>
          <section
            className="home-speed-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-speed-title"
            onClick={event => event.stopPropagation()}
          >
            <div className="home-speed-sheet-heading">
              <div><span>SIMULATION</span><h2 id="home-speed-title">Market speed</h2></div>
              <button type="button" aria-label="Close market speed" onClick={() => setSpeedSheetOpen(false)}><X size={20} /></button>
            </div>
            <div className="home-speed-options">
              {speedOptions.map(option => (
                <button
                  type="button"
                  key={option.mode}
                  className={speedMode === option.mode ? "active" : ""}
                  aria-pressed={speedMode === option.mode}
                  onClick={() => { setSpeedMode(option.mode); setSpeedSheetOpen(false); }}
                >
                  <span><b>{option.mode}</b><small>{option.description}</small></span>
                  {speedMode === option.mode && <span className="home-speed-check"><Check size={16} /></span>}
                </button>
              ))}
            </div>
            <p className="home-speed-note">Display selection only. Simulation timing is unchanged in this phase.</p>
          </section>
        </div>
      )}
    </section>
  );
}
