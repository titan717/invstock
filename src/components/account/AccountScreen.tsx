"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, BookOpen, ChevronLeft, ChevronRight, Clock3, Crown, DollarSign, Droplet, FileText, HandCoins, Landmark, List, PieChart, Plus, Settings, Star, Target, Trophy, User, Bot } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { Stock } from "@/lib/market";
import { ACHIEVEMENTS, type GameActivity, type GameState } from "@/lib/game-engine";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { clockLabel, shortGameDate, tradingDayDate } from "@/lib/game-calendar";

/** Mirrors the thresholds in game-runtime.updateProgression. */
export const RANK_THRESHOLDS: { name: string; xp: number }[] = [
  { name: "Apprentice", xp: 0 },
  { name: "Trader", xp: 150 },
  { name: "Analyst", xp: 450 },
  { name: "Portfolio Pro", xp: 1000 },
  { name: "Market Legend", xp: 2000 },
];

export function rankProgress(xp: number): { rank: string; next: string | null; nextXp: number | null; ratio: number } {
  const index = RANK_THRESHOLDS.reduce((found, tier, i) => (xp >= tier.xp ? i : found), 0);
  const next = RANK_THRESHOLDS[index + 1] ?? null;
  return { rank: RANK_THRESHOLDS[index].name, next: next?.name ?? null, nextXp: next?.xp ?? null, ratio: next ? Math.min(1, xp / next.xp) : 1 };
}

export const SIM_MONTH_DAYS = 30;
export type MonthlyStatement = { month: number; label: string; startDay: number; endDay: number; inProgress: boolean; startingValue: number; endingValue: number; returnPct: number; deposits: number; dividends: number; trades: number };

const TRADE_TYPES = new Set(["buy", "sell", "queued-buy", "queued-sell", "sip-buy"]);

const BOT_DETAILS: Record<string, string> = {
  "Index Bot": "Buys the broad market ETF and holds",
  "Momentum Bot": "Buys last month's strongest stocks",
  "Value Bot": "Buys the cheapest stocks by P/E",
  "Options Bot": "Puts a slice of cash into index calls",
};
const BOT_FALLBACK = Object.values(BOT_DETAILS);
/** ISO week label such as 2026-W02 for a trading day. */
export function isoWeekLabel(day: number): string {
  const date = tradingDayDate(day);
  const thursday = new Date(date.getTime() + (3 - ((date.getUTCDay() + 6) % 7)) * 86_400_000);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
const CREDIT_TYPES = new Set(["login-bonus", "video-bonus", "virtual-cash"]);
const monthKey = (day: number) => { const date = tradingDayDate(day); return date.getUTCFullYear() * 12 + date.getUTCMonth(); };

/** Calendar-month statements on the game calendar. Bonus and virtual cash count as deposits, not returns. */
export function buildMonthlyStatements(state: GameState, totalValue: number): MonthlyStatement[] {
  const currentDay = Math.max(1, state.market.day);
  const valueAtOrBefore = (day: number, fallback: number) => {
    let value = fallback;
    for (const point of state.dailyHistory) if (point.t <= day) value = point.v;
    return value;
  };
  const credits = state.activity.filter(item => CREDIT_TYPES.has(item.type));
  const initialCapital = state.start - credits.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const ranges: { key: number; startDay: number; endDay: number }[] = [];
  for (let day = 1; day <= currentDay; day++) {
    const key = monthKey(day);
    if (ranges.at(-1)?.key === key) ranges.at(-1)!.endDay = day; else ranges.push({ key, startDay: day, endDay: day });
  }
  const last = ranges.at(-1)!;
  while (monthKey(last.endDay + 1) === last.key) last.endDay++;
  const statements = ranges.map(({ startDay, endDay }, index): MonthlyStatement => {
    const inProgress = currentDay <= endDay;
    const startingValue = index === 0 ? initialCapital : valueAtOrBefore(startDay - 1, initialCapital);
    const endingValue = inProgress ? totalValue : valueAtOrBefore(endDay, startingValue);
    const inMonth = (item: GameActivity) => item.day >= startDay && item.day <= endDay;
    const deposits = credits.filter(inMonth).reduce((sum, item) => sum + (item.amount ?? 0), 0);
    const base = startingValue + deposits;
    return {
      month: index + 1,
      label: tradingDayDate(startDay).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      startDay, endDay, inProgress, startingValue, endingValue, deposits,
      returnPct: base > 0 ? ((endingValue - base) / base) * 100 : 0,
      dividends: state.activity.filter(item => item.type === "dividend" && inMonth(item)).reduce((sum, item) => sum + (item.amount ?? 0), 0),
      trades: state.activity.filter(item => (TRADE_TYPES.has(item.type) || item.type.startsWith("option-buy") || item.type.startsWith("option-sell")) && inMonth(item)).length,
    };
  });
  return statements.reverse();
}

export type AccountView = "root" | "missions" | "achievements" | "challenge" | "history" | "orders" | "statements" | "dividends" | "watchlists" | "empire";

export type AccountScreenProps = {
  state: GameState;
  stocks: Stock[];
  totalValue: number;
  currency: CurrencyCode;
  initialView?: AccountView;
  benchmarkTicker?: string;
  onOpenStock: (stock: Stock) => void;
  onClaimMission: (id: string) => void;
  onJoinChallenge: () => void;
  onClaimChallenge: () => void;
  onOpenSettings: () => void;
  onAddCash: () => void;
  onUnavailable: (feature: string) => void;
  onOpenNetWorth?: () => void;
  onOpenLoans?: () => void;
  /** Bank, crypto, businesses, real estate, compliance and rebirth panels. */
  empirePanels: ReactNode;
};

const signedMoney = (value: number, currency: CurrencyCode) => `${value >= 0 ? "+" : "−"}${formatMoney(Math.abs(value), currency)}`;
const signedPct = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;
const tone = (value: number) => (value >= 0 ? "text-[#00D09C]" : "text-[#FF5722]");

function Row({ icon, label, value, dot, onClick, disabled }: { icon: ReactNode; label: string; value?: ReactNode; dot?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex w-full items-center gap-3 py-[7px] text-left disabled:opacity-50">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#1C1C1E] text-white">
        {icon}
        {dot && <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#FF5722]" />}
      </span>
      <span className="flex-1 text-[15px] font-semibold text-white">{label}</span>
      {value !== undefined && <span className="text-[14px] font-medium text-[#8E8E93] tabular-nums">{value}</span>}
      <ChevronRight size={18} className="text-[#8E8E93]" />
    </button>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-1 mt-5 text-[17px] font-bold text-white">{children}</h2>;
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="relative mb-3 flex h-11 items-center justify-center">
      <button type="button" aria-label="Back to account" onClick={onBack} className="absolute left-0 flex h-10 w-10 items-center justify-start text-white"><ChevronLeft size={24} /></button>
      <h1 className="text-[17px] font-bold text-white">{title}</h1>
    </header>
  );
}

function Segmented<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="flex rounded-full bg-[#1C1C1E] p-1">
      {options.map(option => (
        <button key={option} type="button" onClick={() => onChange(option)} className={`flex-1 rounded-full py-2 text-[13px] font-semibold ${value === option ? "bg-[#2C2C2E] text-white" : "text-[#8E8E93]"}`}>{option}</button>
      ))}
    </div>
  );
}

const describeActivity = (item: GameActivity, currency: CurrencyCode): { title: string; detail: string; amount: number | null } => {
  const shares = item.qty !== undefined ? `${item.qty.toFixed(4)} shares at ${formatMoney(item.price ?? 0, currency)}` : "";
  const gross = (item.qty ?? 0) * (item.price ?? 0);
  switch (item.type) {
    case "buy": case "queued-buy": case "sip-buy":
      return { title: item.ticker ?? "Stock", detail: `${item.type === "sip-buy" ? "SIP buy" : item.type === "queued-buy" ? "Queued buy" : "Buy"} • ${shares}`, amount: -(item.amount ?? gross + (item.fee ?? 0)) };
    case "sell": case "queued-sell":
      return { title: item.ticker ?? "Stock", detail: `${item.type === "queued-sell" ? "Queued sell" : "Sell"} • ${shares}`, amount: item.amount ?? gross - (item.fee ?? 0) };
    case "dividend":
      return { title: item.ticker ?? "Dividend", detail: "Dividend", amount: item.amount ?? 0 };
    case "login-bonus": return { title: "Daily login bonus", detail: "Deposit", amount: item.amount ?? 0 };
    case "video-bonus": return { title: "Video bonus", detail: "Deposit", amount: item.amount ?? 0 };
    case "virtual-cash": return { title: "Virtual cash", detail: "Deposit", amount: item.amount ?? 0 };
    case "loan": return { title: "Personal loan", detail: "Loan disbursed", amount: item.amount ?? 0 };
    case "repayment": return { title: "Loan repayment", detail: "Loan", amount: -(item.amount ?? 0) };
    default:
      if (item.type.startsWith("option-buy-") || item.type.startsWith("option-sell-")) {
        const buying = item.type.startsWith("option-buy-");
        const kind = item.type.endsWith("call") ? "call" : "put";
        return { title: item.ticker ?? "Option", detail: `${buying ? "Bought" : "Sold"} ${kind} • ${item.qty ?? 0} contract${item.qty === 1 ? "" : "s"} at ${formatMoney(item.price ?? 0, currency)}`, amount: buying ? -(item.amount ?? 0) : item.amount ?? 0 };
      }
      if (item.type === "option-exercised" || item.type === "option-expired") return { title: item.ticker ?? "Option", detail: item.type === "option-exercised" ? "Exercised at expiry" : "Expired worthless", amount: item.amount ?? 0 };
      return { title: item.type.replace(/-/g, " ").replace(/^./, c => c.toUpperCase()), detail: item.ticker ?? "Account", amount: item.amount ?? null };
  }
};

function ActivityList({ items, currency }: { items: GameActivity[]; currency: CurrencyCode }) {
  if (!items.length) return <p className="py-6 text-center text-[14px] text-[#8E8E93]">No transactions yet.</p>;
  return (
    <ul>
      {items.map((item, index) => {
        const view = describeActivity(item, currency);
        const outgoing = (view.amount ?? 0) < 0;
        return (
          <li key={index} className="flex items-center gap-3 border-b border-[#2C2C2E] py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1C1C1E] text-white">{outgoing ? <ArrowDown size={17} /> : item.type === "dividend" ? <DollarSign size={17} /> : <ArrowUp size={17} />}</span>
            <span className="min-w-0 flex-1">
              <b className="block text-[15px] text-white">{view.title}</b>
              <small className="block truncate text-[13px] text-[#8E8E93] tabular-nums">{view.detail}</small>
              <small className="block text-[12px] text-[#8E8E93]">{shortGameDate(item.day)}</small>
            </span>
            {view.amount !== null && <span className={`text-[15px] font-semibold tabular-nums ${outgoing ? "text-white" : "text-[#00D09C]"}`}>{signedMoney(view.amount, currency)}</span>}
          </li>
        );
      })}
    </ul>
  );
}

export function AccountScreen({ state, stocks, totalValue, currency, initialView = "root", benchmarkTicker = "SPY", onOpenStock, onClaimMission, onJoinChallenge, onClaimChallenge, onOpenSettings, onAddCash, onUnavailable, onOpenNetWorth, onOpenLoans, empirePanels }: AccountScreenProps) {
  const [view, setView] = useState<AccountView>(initialView);
  const [range, setRange] = useState<"1M" | "3M" | "1Y" | "ALL">("ALL");
  const [historyFilter, setHistoryFilter] = useState<"All" | "Stocks" | "Options" | "Dividends">("All");
  const money = (value: number) => formatMoney(value, currency);
  const back = () => setView("root");

  const prices = useMemo(() => new Map(stocks.map(stock => [stock.ticker, stock])), [stocks]);
  const positions = Object.entries(state.holdings).map(([ticker, holding]) => ({ stock: prices.get(ticker), holding })).filter(item => item.stock) as { stock: Stock; holding: GameState["holdings"][string] }[];
  const stockValue = positions.reduce((sum, item) => sum + item.stock.price * item.holding.quantity, 0);
  const unrealized = positions.reduce((sum, item) => sum + (item.stock.price - item.holding.averageCost) * item.holding.quantity, 0);
  const dividends = state.activity.filter(item => item.type === "dividend").reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const allTime = totalValue - state.start;
  const claimable = state.missions.filter(mission => !mission.claimed && mission.progress >= mission.target).length;
  const progress = rankProgress(state.xp);

  const performance = useMemo(() => {
    const days = { "1M": 30, "3M": 90, "1Y": 252, ALL: Infinity }[range];
    const latestDay = state.market.day;
    const you = [...state.dailyHistory.filter(point => latestDay - point.t <= days), { v: totalValue, t: latestDay }];
    const benchmarkPrice = prices.get(benchmarkTicker)?.price;
    const bench = [...state.benchmarkHistory.filter(point => latestDay - point.t <= days), ...(benchmarkPrice ? [{ v: benchmarkPrice, t: latestDay }] : [])];
    const youBase = you[0]?.v || 1;
    const benchBase = bench[0]?.v || 1;
    const benchByDay = new Map(bench.map(point => [point.t, (point.v / benchBase - 1) * 100]));
    const hasBenchmark = state.benchmarkHistory.length > 0 && bench.length >= 2;
    const data = you.map(point => ({ t: point.t, you: (point.v / youBase - 1) * 100, bench: hasBenchmark ? benchByDay.get(point.t) ?? null : null }));
    return { data, youPct: data.at(-1)?.you ?? 0, benchPct: hasBenchmark ? (bench.at(-1)!.v / benchBase - 1) * 100 : null };
  }, [range, state.dailyHistory, state.benchmarkHistory, state.market.day, totalValue, prices, benchmarkTicker]);

  if (view !== "root") {
    return (
      <section className="account-screen px-4 pb-28 pt-4">
        {view === "missions" && (<>
          <SubHeader title="Missions" onBack={back} />
          <ul>{state.missions.map(mission => {
            const ready = !mission.claimed && mission.progress >= mission.target;
            return (
              <li key={mission.id} className="flex items-center gap-3 border-b border-[#2C2C2E] py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#1C1C1E] text-white"><Target size={18} /></span>
                <span className="flex-1"><b className="block text-[15px] text-white">{mission.title}</b><small className="text-[13px] text-[#8E8E93] tabular-nums">{mission.description} · {Math.floor(mission.progress)}/{mission.target}</small></span>
                <button type="button" disabled={!ready} onClick={() => onClaimMission(mission.id)} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold tabular-nums ${ready ? "bg-[#00D09C] text-black" : "bg-[#1C1C1E] text-[#8E8E93]"}`}>{mission.claimed ? "Claimed" : ready ? `Claim ${money(mission.reward)}` : "In progress"}</button>
              </li>
            );
          })}</ul>
        </>)}
        {view === "achievements" && (<>
          <SubHeader title="Achievements" onBack={back} />
          <ul>{ACHIEVEMENTS.map(item => {
            const unlocked = state.achievements.includes(item.id);
            return (
              <li key={item.id} className={`flex items-center gap-3 border-b border-[#2C2C2E] py-3 ${unlocked ? "" : "opacity-50"}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#1C1C1E] text-white"><Trophy size={18} /></span>
                <span className="flex-1"><b className="block text-[15px] text-white">{item.id}</b><small className="text-[13px] text-[#8E8E93]">{item.description}</small></span>
                <span className={`text-[13px] font-semibold ${unlocked ? "text-[#00D09C]" : "text-[#8E8E93]"}`}>{unlocked ? "Unlocked" : "Locked"}</span>
              </li>
            );
          })}</ul>
        </>)}
        {view === "challenge" && (() => {
          const challenge = state.weeklyChallenge;
          const startDay = (challenge.week - 1) * 7 + 1, endDay = challenge.week * 7;
          const yourReturn = challenge.joined ? (totalValue / Math.max(1, challenge.startValue) - 1) * 100 : null;
          const minutesLeft = Math.max(0, (endDay - state.market.day) * 390 + Math.max(0, 960 - state.market.minute));
          const ended = state.market.day > endDay;
          const board = [{ name: "You", detail: challenge.joined ? "Your account" : "Not joined yet", returnPct: yourReturn, you: true }, ...challenge.bots.map((bot, index) => ({ name: bot.name, detail: BOT_DETAILS[bot.name] ?? BOT_FALLBACK[index % BOT_FALLBACK.length], returnPct: bot.returnPct as number | null, you: false }))]
            .sort((x, y) => (y.returnPct ?? -Infinity) - (x.returnPct ?? -Infinity));
          return (<>
            <SubHeader title="Weekly challenge" onBack={back} />
            <div className="rounded-2xl bg-[#1C1C1E] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[#3A2E10] text-[#F5C542]"><Trophy size={20} /></span>
                <span><small className="text-[11px] text-[#8E8E93]">Week {isoWeekLabel(startDay)}</small><b className="block text-[15px] leading-5 text-white">Same market. Same cash. Who trades best?</b></span>
              </div>
              <p className="mt-2 text-[13px] leading-5 text-[#C7C7CC]">Everyone starts from the same market this week. Your return is measured from your net worth when you join. Beat the bots to win {money(challenge.reward)}.</p>
              {challenge.joined && <div className="mt-3 flex justify-between text-[15px]"><span className="text-white">Your return</span><b className={`tabular-nums ${tone(yourReturn ?? 0)}`}>{signedPct(yourReturn ?? 0)}</b></div>}
              {challenge.joined && <p className="mt-1 text-[12px] text-[#8E8E93] tabular-nums">Day {Math.min(7, Math.max(1, state.market.day - startDay + 1))} of 7 · {shortGameDate(state.market.day)} · {clockLabel(state.market.minute)}</p>}
              {!challenge.joined && <button type="button" onClick={onJoinChallenge} className="mt-4 w-full rounded-xl bg-[#00D09C] py-3 text-[15px] font-bold text-black">Join challenge</button>}
              {challenge.joined && ended && !challenge.claimed && <button type="button" onClick={onClaimChallenge} className="mt-4 w-full rounded-xl bg-[#00D09C] py-3 text-[15px] font-bold text-black">Claim reward</button>}
              <p className="mt-2 text-center text-[12px] text-[#8E8E93] tabular-nums">{ended ? "Challenge ended" : `Ends in ${Math.floor(minutesLeft / 390)}d ${Math.floor((minutesLeft % 390) / 60)}h`}</p>
            </div>
            <SectionHeading>Leaderboard</SectionHeading>
            <ol>{board.map((entry, index) => (
              <li key={entry.name} className={`flex items-center gap-3 rounded-lg px-2 py-2.5 ${entry.you ? "bg-[#0A3D33]/40" : ""}`}>
                <b className={`w-5 text-[15px] tabular-nums ${index < 3 ? "text-[#F5C542]" : "text-white"}`}>{index + 1}</b>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2C2C2E] text-[#00D09C]">{entry.you ? <User size={16} /> : <Bot size={16} />}</span>
                <span className="min-w-0 flex-1"><b className="block text-[14px] text-white">{entry.name}</b><small className="block text-[12px] leading-4 text-[#8E8E93]">{entry.detail}</small></span>
                <b className={`text-[14px] tabular-nums ${entry.returnPct === null ? "text-[#8E8E93]" : tone(entry.returnPct)}`}>{entry.returnPct === null ? "—" : signedPct(entry.returnPct)}</b>
              </li>
            ))}</ol>
            <SectionHeading>Rules</SectionHeading>
            <ul className="space-y-2 text-[13px] leading-5 text-[#C7C7CC]">
              {["Every player gets the same market, generated from this week's seed.", "Your return is measured from your net worth when you join.", "Four trading bots compete with their own strategies.", "Finish in first place when the week ends to claim the reward."].map(rule => (
                <li key={rule} className="flex gap-2"><i className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00D09C]" />{rule}</li>
              ))}
            </ul>
            <SectionHeading>Your results</SectionHeading>
            <p className="text-[13px] text-[#8E8E93]">{challenge.claimed ? `You claimed ${money(challenge.reward)} for week ${challenge.week}.` : ended && challenge.joined ? "This week's challenge has ended. Claim your result above." : "Finish a challenge to see your results here."}</p>
          </>);
        })()}
        {view === "history" && (<>
          <SubHeader title="History" onBack={back} />
          <Segmented options={["All", "Stocks", "Options", "Dividends"] as const} value={historyFilter} onChange={setHistoryFilter} />
          {(() => {
            const items = state.activity.filter(item => historyFilter === "All" || (historyFilter === "Stocks" ? TRADE_TYPES.has(item.type) : historyFilter === "Options" ? item.type.startsWith("option-") : item.type === "dividend"));
            return (<><p className="mt-4 text-[14px] text-white tabular-nums">Transactions: {items.length}</p><ActivityList items={items} currency={currency} /></>);
          })()}
        </>)}
        {view === "orders" && (<>
          <SubHeader title="Orders" onBack={back} />
          {state.queuedOrders.length === 0 ? <p className="py-6 text-center text-[14px] text-[#8E8E93]">No queued orders. Orders placed while the market is closed appear here.</p> : (
            <ul>{[...state.queuedOrders].reverse().map(order => (
              <li key={order.id} className="flex items-center gap-3 border-b border-[#2C2C2E] py-3">
                <span className="flex-1"><b className="block text-[15px] text-white">{order.ticker}</b><small className="text-[13px] text-[#8E8E93] tabular-nums">{order.action === "buy" ? "Buy" : "Sell"} • {order.shares.toFixed(4)} shares • Day {order.createdAtDay}</small></span>
                <span className="text-right"><b className="block text-[14px] capitalize text-white">{order.status.replace("_", " ")}</b><small className="text-[13px] text-[#8E8E93] tabular-nums">{money(order.filledPrice ?? order.targetPrice)}</small></span>
              </li>
            ))}</ul>
          )}
        </>)}
        {view === "statements" && (<>
          <SubHeader title="Monthly statements" onBack={back} />
          <p className="mb-2 text-[13px] text-[#8E8E93]">Statements close at the end of each simulated month.</p>
          {buildMonthlyStatements(state, totalValue).map(statement => (
            <div key={statement.month} className="mb-3 rounded-2xl bg-[#1C1C1E] px-4 py-3">
              <div className="mb-1 flex items-center justify-between"><b className="text-[16px] text-white">{statement.label}</b><span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${statement.inProgress ? "bg-[#3A2E10] text-[#F5C542]" : "bg-[#2C2C2E] text-[#8E8E93]"}`}>{statement.inProgress ? "In progress" : "Closed"}</span></div>
              {([["Return", signedPct(statement.returnPct), tone(statement.returnPct)], ["Starting value", money(statement.startingValue), ""], ["Ending value", money(statement.endingValue), ""], ["Deposits", money(statement.deposits), ""], ["Dividends", money(statement.dividends), ""], ["Trades", String(statement.trades), ""]] as const).map(([label, value, cls]) => (
                <div key={label} className="flex justify-between border-b border-[#2C2C2E] py-2 text-[15px] last:border-0"><span className="text-white">{label}</span><b className={`tabular-nums ${cls || "text-white"}`}>{value}</b></div>
              ))}
            </div>
          ))}
        </>)}
        {view === "dividends" && (<>
          <SubHeader title="Dividends" onBack={back} />
          <div className="mb-2 flex justify-between text-[15px]"><span className="text-white">Total received</span><b className="text-[#00D09C] tabular-nums">{money(dividends)}</b></div>
          <ActivityList items={state.activity.filter(item => item.type === "dividend")} currency={currency} />
        </>)}
        {view === "watchlists" && (<>
          <SubHeader title="Watchlists" onBack={back} />
          {state.watchlist.length === 0 ? <p className="py-6 text-center text-[14px] text-[#8E8E93]">Your watchlist is empty. Star a stock to add it.</p> : (
            <ul>{state.watchlist.map(ticker => {
              const stock = prices.get(ticker);
              if (!stock) return null;
              return (
                <li key={ticker}><button type="button" onClick={() => onOpenStock(stock)} className="flex w-full items-center gap-3 border-b border-[#2C2C2E] py-3 text-left">
                  <span className="flex-1"><b className="block text-[15px] text-white">{stock.ticker}</b><small className="text-[13px] text-[#8E8E93]">{stock.name}</small></span>
                  <span className="text-right tabular-nums"><b className="block text-[15px] text-white">{money(stock.price)}</b><small className={`text-[13px] ${tone(stock.change)}`}>{signedPct(stock.change)}</small></span>
                </button></li>
              );
            })}</ul>
          )}
        </>)}
        {view === "empire" && (<>
          <SubHeader title="Bank & empire" onBack={back} />
          {empirePanels}
        </>)}
      </section>
    );
  }

  return (
    <section className="account-screen px-4 pb-28 pt-4">
      <header className="flex h-11 items-center justify-between">
        <h1 className="text-[22px] font-bold text-white">Account</h1>
        <button type="button" aria-label="Open settings" onClick={onOpenSettings} className="flex h-10 w-10 items-center justify-end text-white"><Settings size={22} /></button>
      </header>

      <div className="mt-2 rounded-2xl bg-[#1C1C1E] px-4 py-3" aria-label="Rank">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3A2E10] text-[#F5C542]"><Crown size={18} /></span>
          <span><small className="block text-[12px] text-[#8E8E93]">Rank</small><b className="text-[18px] text-white">{progress.rank}</b></span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#2C2C2E]"><div className="h-full rounded-full bg-[#F5C542]" style={{ width: `${progress.ratio * 100}%` }} /></div>
        <p className="mt-2 text-[13px] text-[#8E8E93] tabular-nums">{progress.next ? `${state.xp} / ${progress.nextXp} XP to ${progress.next}` : `${state.xp} XP · Top rank reached`}</p>
      </div>

      <SectionHeading>Portfolio</SectionHeading>
      <dl>
        {([
          ["Total value", money(totalValue), "text-white"],
          ["Cash", money(state.cash), "text-white"],
          ["Buying power", money(state.cash), "text-white"],
          ["Stocks", money(stockValue), "text-white"],
          ["Options", money(0), "text-white"],
          ["Unrealized P/L", signedMoney(unrealized, currency), tone(unrealized)],
          ["Realized P/L", signedMoney(state.realizedPnl, currency), tone(state.realizedPnl)],
          ["Dividends", money(dividends), "text-white"],
          ["Deposits", money(state.start), "text-white"],
          ["All-time return", `${signedMoney(allTime, currency)} (${signedPct(allTime / Math.max(1, state.start) * 100)})`, tone(allTime)],
        ] as const).map(([label, value, cls]) => (
          <div key={label} className="flex items-center justify-between border-b border-[#2C2C2E] py-[6px] text-[15px] leading-5">
            <dt className="text-white">{label}</dt>
            <dd className={`font-semibold tabular-nums ${cls}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <SectionHeading>Performance</SectionHeading>
      <div className="flex justify-between" role="tablist" aria-label="Performance range">
        {(["1M", "3M", "1Y", "ALL"] as const).map(option => (
          <button key={option} type="button" role="tab" aria-selected={range === option} onClick={() => setRange(option)} className={`w-[22%] rounded-full py-2 text-[13px] font-semibold tabular-nums ${range === option ? "bg-[#0A3D33] text-[#00D09C]" : "text-[#8E8E93]"}`}>{option}</button>
        ))}
      </div>
      <div className="mt-2 h-32" role="img" aria-label="Account performance compared with benchmark">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={performance.data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            {performance.benchPct !== null && <Line type="linear" dataKey="bench" stroke="#C7C7CC" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />}
            <Line type="linear" dataKey="you" stroke="#00D09C" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-between text-[13px] font-semibold tabular-nums">
        <span className="flex items-center gap-1.5 text-[#00D09C]"><i className="h-2 w-2 rounded-full bg-[#00D09C]" />You {signedPct(performance.youPct)}</span>
        {performance.benchPct !== null && <span className="flex items-center gap-1.5 text-[#C7C7CC]"><i className="h-2 w-2 rounded-full bg-[#C7C7CC]" />{benchmarkTicker} {signedPct(performance.benchPct)}</span>}
      </div>

      <SectionHeading>Progress</SectionHeading>
      <Row icon={<Target size={18} />} label="Missions" value={`Ready to claim: ${claimable}`} dot={claimable > 0} onClick={() => setView("missions")} />
      <Row icon={<Trophy size={18} />} label="Achievements" value={`${state.achievements.filter(id => ACHIEVEMENTS.some(item => item.id === id)).length} / ${ACHIEVEMENTS.length}`} onClick={() => setView("achievements")} />
      <Row icon={<BookOpen size={18} />} label="Academy" value="Coming soon" onClick={() => onUnavailable("Academy")} />
      <Row icon={<Droplet size={18} />} label="Weekly challenge" onClick={() => setView("challenge")} />

      <SectionHeading>Activity</SectionHeading>
      <Row icon={<Clock3 size={18} />} label="History" onClick={() => setView("history")} />
      <Row icon={<List size={18} />} label="Orders" onClick={() => setView("orders")} />
      <Row icon={<FileText size={18} />} label="Monthly statements" onClick={() => setView("statements")} />
      <Row icon={<DollarSign size={18} />} label="Dividends" onClick={() => setView("dividends")} />
      <Row icon={<Star size={18} />} label="Watchlists" onClick={() => setView("watchlists")} />

      <SectionHeading>More</SectionHeading>
      <Row icon={<Crown size={18} />} label="Market Sim Pro" onClick={() => onUnavailable("Market Sim Pro")} />
      <Row icon={<Plus size={18} />} label="Add virtual cash" onClick={onAddCash} />
      {onOpenNetWorth && <Row icon={<PieChart size={18} />} label="Net worth" onClick={onOpenNetWorth} />}
      {onOpenLoans && <Row icon={<HandCoins size={18} />} label="Loans" value={state.loan > 0 ? formatMoney(state.loan, currency) : undefined} onClick={onOpenLoans} />}
      <Row icon={<Landmark size={18} />} label="Bank & empire" onClick={() => setView("empire")} />
      <Row icon={<Settings size={18} />} label="Settings" onClick={onOpenSettings} />

      <p className="mt-6 text-center text-[12px] text-[#8E8E93]">STONKS is a game. All companies, prices and money are fictional. Not investment advice.</p>
    </section>
  );
}
