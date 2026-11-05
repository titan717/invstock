"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Check, Layers, ListFilter, Minus, Plus, Search, X } from "lucide-react";
import type { GameState, OptionPosition } from "@/lib/game-engine";
import type { Stock } from "@/lib/market";
import type { OptionChain } from "@/lib/company-data";
import { optionMark } from "@/lib/company-data";
import { chanceOfProfit, generateOptionChain, optionGreeks, optionValue, simulatedVolatility, type OptionType } from "@/lib/options-engine";
import { CONTRACT_SIZE, OPTION_FEE_PER_CONTRACT, optionCost, positionMark, type OptionOrder } from "@/lib/options-trading";
import { exchangeSymbol } from "@/lib/live-quotes";
import { formatMoney, type CurrencyCode } from "@/lib/currency";
import { useJson } from "@/lib/use-json";
import { CompanyLogo } from "@/components/market/CompanyLogo";

export type OptionRow = { strike: number; bid: number; ask: number; mark: number; last: number; percentChange: number; volume: number; openInterest: number; iv: number; delta: number; gamma: number; theta: number; vega: number };
type Expiry = { key: string; label: string; days: number; date?: number };
type Contract = { row: OptionRow; type: OptionType; expiry: Expiry };

export type OptionsChainProps = {
  stock: Stock;
  stocks: Stock[];
  state: GameState;
  currency: CurrencyCode;
  liveData: boolean;
  marketOpen: boolean;
  onChangeTicker: (ticker: string) => void;
  /** Lets the shell hide the bottom navigation while a contract is open. */
  onDetailChange?: (open: boolean) => void;
  onOpenStock: (stock: Stock) => void;
  onBuy: (order: OptionOrder) => boolean;
  onSell: (id: string, contracts: number, price: number) => boolean;
};

const DAY = 86_400_000;
const shortDate = (time: number) => new Date(time).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const SIM_EXPIRIES = [4, 11, 18, 25, 46];
const TABS = ["Prices", "Activity", "Greeks"] as const;

/** Converts the real (Yahoo) chain or the engine's simulated chain into one row shape centred on the share price. */
export function chainRows(source: { live: OptionChain | null; stock: Stock; type: OptionType; days: number }): OptionRow[] {
  const { live, stock, type, days } = source;
  if (live) {
    const contracts = type === "call" ? live.calls : live.puts;
    const spot = stock.price;
    const sorted = [...contracts].filter(item => item.strike > 0).sort((a, b) => a.strike - b.strike);
    const centre = sorted.findIndex(item => item.strike >= spot);
    const from = Math.max(0, (centre < 0 ? sorted.length : centre) - 8);
    return sorted.slice(from, from + 16).map(item => {
      // Outside US hours Yahoo reports zero bid/ask and placeholder IVs; fall back to the last trade or the model so the chain stays tradable.
      const iv = item.impliedVolatility >= 0.08 && item.impliedVolatility < 5 ? item.impliedVolatility : simulatedVolatility(stock);
      const greeks = optionGreeks(spot, item.strike, days, iv, type);
      const quoted = item.bid > 0 && item.ask > 0;
      const mark = Number((quoted ? optionMark(item) : item.last > 0 ? item.last : optionValue(spot, item.strike, days, iv, type)).toFixed(2));
      const half = Math.max(0.01, mark * 0.015);
      const bid = quoted ? item.bid : Number(Math.max(0.01, mark - half).toFixed(2)), ask = quoted ? item.ask : Number((mark + half).toFixed(2));
      return { strike: item.strike, bid, ask, mark, last: item.last > 0 ? item.last : mark, percentChange: item.percentChange, volume: item.volume, openInterest: item.openInterest, iv, ...greeks };
    });
  }
  return generateOptionChain(stock, days, type).map(item => ({ strike: item.strike, bid: item.bid, ask: item.ask, mark: item.mark, last: item.last, percentChange: item.change, volume: item.volume, openInterest: item.openInterest, iv: item.impliedVolatility / 100, delta: item.delta, gamma: item.gamma, theta: item.theta, vega: item.vega }));
}

const compact = (value: number) => (value >= 1000 ? (value / 1000).toFixed(1).replace(/\.0$/, "") + "K" : String(Math.round(value)));

function Segmented<T extends string>({ items, value, onChange, label }: { items: readonly T[]; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-1 rounded-full bg-[#1C1C1E] p-[3px]">
      {items.map(item => (
        <button key={item} aria-pressed={value === item} onClick={() => onChange(item)} className={"h-8 flex-1 rounded-full text-[14px] font-semibold " + (value === item ? "bg-[#3A3A3C] text-white" : "text-[#C7C7CC]")}>{item}</button>
      ))}
    </div>
  );
}

/** Payoff-at-expiration chart with a draggable hypothetical price. */
function Payoff({ spot, strike, premium, type, contracts, ticker, money }: { spot: number; strike: number; premium: number; type: OptionType; contracts: number; ticker: string; money: (value: number) => string }) {
  const low = Math.min(spot, strike) * 0.85, high = Math.max(spot, strike) * 1.15;
  const [price, setPrice] = useState(spot);
  const profit = (at: number) => (Math.max(0, type === "call" ? at - strike : strike - at) - premium) * CONTRACT_SIZE * contracts;
  const width = 340, height = 150, maxGain = Math.max(Math.abs(profit(low)), Math.abs(profit(high)), premium * CONTRACT_SIZE * contracts * 2);
  const x = (at: number) => ((at - low) / (high - low)) * width;
  const zero = height * 0.62;
  const y = (value: number) => zero - (value / maxGain) * (zero - 6);
  const breakEven = type === "call" ? strike + premium : strike - premium;
  const points = [low, strike, high].map(at => `${x(at).toFixed(1)},${Math.max(4, Math.min(height - 4, y(profit(at)))).toFixed(1)}`).join(" ");
  const value = profit(price);
  return (
    <div>
      <p className={"text-center text-[13px] font-semibold tabular-nums " + (value >= 0 ? "text-[#00D09C]" : "text-[#FF5722]")}>If {ticker} is {money(price)} at expiration: {value >= 0 ? "+" : "−"}{money(Math.abs(value))}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full" role="img" aria-label="Payoff at expiration">
        <defs>
          <clipPath id="payoff-gain"><rect x="0" y="0" width={width} height={zero} /></clipPath>
          <clipPath id="payoff-loss"><rect x="0" y={zero} width={width} height={height - zero} /></clipPath>
        </defs>
        <polygon points={`0,${zero} ${points} ${width},${zero}`} fill="#00D09C" fillOpacity="0.18" clipPath="url(#payoff-gain)" />
        <polygon points={`0,${zero} ${points} ${width},${zero}`} fill="#FF5722" fillOpacity="0.22" clipPath="url(#payoff-loss)" />
        <polyline points={points} fill="none" stroke="#00D09C" strokeWidth="2" clipPath="url(#payoff-gain)" />
        <polyline points={points} fill="none" stroke="#FF5722" strokeWidth="2" clipPath="url(#payoff-loss)" />
        <line x1={x(spot)} x2={x(spot)} y1="0" y2={height} stroke="#8E8E93" strokeDasharray="3 4" />
        <line x1={x(breakEven)} x2={x(breakEven)} y1="0" y2={height} stroke="#F5C542" strokeDasharray="3 4" />
        <circle cx={x(price)} cy={Math.max(4, Math.min(height - 4, y(value)))} r="4.5" fill={value >= 0 ? "#00D09C" : "#FF5722"} />
      </svg>
      <input aria-label="Price at expiration" type="range" min={low} max={high} step={(high - low) / 200} value={price} onChange={event => setPrice(Number(event.target.value))} className="payoff-slider mt-2 w-full" />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  return <div className="flex justify-between py-[7px] text-[13px]"><span className="text-[#C7C7CC]">{label}</span><b className={"font-semibold tabular-nums " + (tone === "gain" ? "text-[#00D09C]" : tone === "loss" ? "text-[#FF5722]" : "text-white")}>{value}</b></div>;
}

export function OptionsChain(props: OptionsChainProps) {
  const { stock, stocks, state, currency, liveData, marketOpen, onChangeTicker, onDetailChange, onOpenStock, onBuy, onSell } = props;
  const money = (value: number) => formatMoney(value, currency);
  const listed = liveData && exchangeSymbol(stock.ticker) !== null;
  const [expiryKey, setExpiryKey] = useState<string | null>(null);
  const [action, setAction] = useState<"Buy" | "Sell">("Buy");
  const [side, setSide] = useState<"Calls" | "Puts">("Calls");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Prices");
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [contract, setContract] = useState<Contract | null>(null);
  const [positionsOpen, setPositionsOpen] = useState(false);

  const base = useJson<OptionChain>(listed ? `/api/options/${stock.ticker}` : null, 60_000);
  const liveExpiries = useMemo<Expiry[]>(() => (base.data?.expirations ?? []).slice(0, 8).map(date => {
    const days = Math.max(0, Math.ceil((date * 1000 - Date.now()) / DAY));
    return { key: String(date), label: `${shortDate(date * 1000)} · ${days}d`, days, date };
  }).filter(item => item.days >= 1), [base.data]);
  const simExpiries = useMemo<Expiry[]>(() => SIM_EXPIRIES.map(days => ({ key: `sim-${days}`, label: `${shortDate(Date.now() + days * DAY)} · ${days}d`, days })), []);
  const usingLive = listed && liveExpiries.length > 0;
  const expiries = usingLive ? liveExpiries : simExpiries;
  const expiry = expiries.find(item => item.key === expiryKey) ?? expiries[0];
  const dated = useJson<OptionChain>(usingLive && expiry?.date && expiry.date !== base.data?.expiration ? `/api/options/${stock.ticker}?date=${expiry.date}` : null, 60_000);
  const liveChain = usingLive ? (expiry?.date === base.data?.expiration ? base.data : dated.data) : null;
  const type: OptionType = side === "Calls" ? "call" : "put";
  const rows = useMemo(() => (usingLive && !liveChain ? [] : chainRows({ live: liveChain, stock, type, days: expiry?.days ?? 4 })), [usingLive, liveChain, stock, type, expiry?.days]);
  const markerIndex = rows.findIndex(row => row.strike >= stock.price);
  const positions = state.optionPositions;
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const marker = tableRef.current?.querySelector<HTMLElement>("[data-share-price]");
    if (marker && tableRef.current && typeof tableRef.current.scrollTo === "function") tableRef.current.scrollTo({ top: Math.max(0, marker.offsetTop - tableRef.current.clientHeight / 2) });
  }, [stock.ticker, expiry?.key, side, rows.length > 0]);

  useEffect(() => { onDetailChange?.(!!contract); }, [contract, onDetailChange]);
  useEffect(() => () => onDetailChange?.(false), [onDetailChange]);

  if (contract) {
    return <ContractDetail key={`${contract.type}-${contract.row.strike}-${contract.expiry.key}`} {...props} contract={contract} initialAction={action} onBack={() => setContract(null)} positions={positions} money={money} onBuy={onBuy} onSell={onSell} marketOpen={marketOpen} />;
  }

  const filtered = stocks.filter(item => item.ticker !== "BTCX" && (item.ticker + " " + item.name).toLowerCase().includes(query.toLowerCase())).slice(0, 30);
  const up = stock.change >= 0;
  return (
    <section className="options-chain -mx-4 min-h-[calc(100vh-80px)] bg-black text-white" aria-label="Options chain">
      <header className="flex items-center gap-4 px-4 pb-2 pt-4">
        <h1 className="flex-1 text-[24px] font-bold">Options</h1>
        <button aria-label="Your option positions" onClick={() => setPositionsOpen(true)} className="relative"><ListFilter size={22} />{positions.length > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#00D09C]" />}</button>
        <button aria-label="Stock details" onClick={() => onOpenStock(stock)}><Layers size={20} /></button>
        <button aria-label="Change underlying stock" onClick={() => setPicker(true)} className="h-9 rounded-full bg-[#1C1C1E] px-4 text-[14px] font-bold">{stock.ticker}</button>
      </header>
      <button onClick={() => onOpenStock(stock)} className="flex w-full items-center gap-3 px-4 py-1 text-left">
        <CompanyLogo ticker={stock.ticker} name={stock.name} size={30} />
        <span className="flex-1"><b className="block text-[16px]">{stock.ticker}</b><small className="text-[12px] text-[#C7C7CC]">{stock.name}</small></span>
        <span className="text-right tabular-nums"><b className="block text-[17px]">{money(stock.price)}</b><small className={"text-[12px] font-semibold " + (up ? "text-[#00D09C]" : "text-[#FF5722]")}>{up ? "+" : "−"}{money(Math.abs(stock.price - stock.price / (1 + stock.change / 100)))} ({up ? "+" : ""}{stock.change.toFixed(2)}%)</small></span>
      </button>
      <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Expiration">
        {expiries.map(item => (
          <button key={item.key} role="tab" aria-selected={item.key === expiry?.key} onClick={() => setExpiryKey(item.key)} className={"h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold tabular-nums " + (item.key === expiry?.key ? "bg-[#0B3D2E] text-[#00D09C]" : "text-[#C7C7CC]")}>{item.label}</button>
        ))}
      </div>
      <div className="mt-3 flex gap-3 px-4">
        <Segmented label="Order side" items={["Buy", "Sell"] as const} value={action} onChange={setAction} />
        <Segmented label="Option type" items={["Calls", "Puts"] as const} value={side} onChange={setSide} />
      </div>
      <div className="mt-3 flex gap-2 px-4">
        {TABS.map(item => <button key={item} onClick={() => setTab(item)} aria-pressed={tab === item} className={"h-8 flex-1 rounded-lg text-[13px] font-semibold " + (tab === item ? "bg-[#0B3D2E] text-[#00D09C]" : "text-[#C7C7CC]")}>{item}</button>)}
      </div>
      <div ref={tableRef} className="mt-2 max-h-[calc(100vh-330px)] overflow-y-auto">
        <table className="w-full table-fixed text-right text-[13px] tabular-nums">
          <thead className="sticky top-0 z-10 bg-black text-[11px] text-[#C7C7CC]">
            <tr>{(tab === "Greeks" ? ["Strike", "Delta", "Gamma", "Theta", "Vega", "IV"] : tab === "Activity" ? ["Strike", "Volume", "Open int.", "Last", "% Chg", "IV"] : ["Strike", "Bid", "Ask", "Mark", "Last", "% Chg"]).map((head, index) => <th key={head} className={"py-2 font-normal " + (index === 0 ? "pl-4 text-left" : index === 5 ? "pr-4" : "")}>{head}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const itm = type === "call" ? row.strike < stock.price : row.strike > stock.price;
              const tone = row.percentChange >= 0 ? "text-[#00D09C]" : "text-[#FF5722]";
              return (
                <Fragment key={row.strike}>
                  {index === markerIndex && (
                    <tr data-share-price aria-label={`Share price ${money(stock.price)}`}><td colSpan={6} className="relative h-6 p-0"><span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-[#00D09C]" /><span className="relative z-[1] mx-auto block w-fit rounded-full bg-[#00D09C] px-3 py-[2px] text-[11px] font-bold text-black">Share price {money(stock.price)}</span></td></tr>
                  )}
                  <tr onClick={() => expiry && setContract({ row, type, expiry })} className={"h-[51px] cursor-pointer border-b border-black " + (itm ? "bg-[#0A2A20]" : "")}>
                    <td className="pl-4 text-left text-[14px] font-bold text-white">{money(row.strike)}</td>
                    {tab === "Greeks" ? (
                      <><td>{row.delta.toFixed(3)}</td><td>{row.gamma.toFixed(3)}</td><td>{row.theta.toFixed(3)}</td><td>{row.vega.toFixed(3)}</td><td className="pr-4">{(row.iv * 100).toFixed(1)}%</td></>
                    ) : tab === "Activity" ? (
                      <><td>{compact(row.volume)}</td><td>{compact(row.openInterest)}</td><td>{money(row.last)}</td><td className={tone}>{row.percentChange >= 0 ? "+" : ""}{row.percentChange.toFixed(1)}%</td><td className="pr-4">{(row.iv * 100).toFixed(1)}%</td></>
                    ) : (
                      <><td className={action === "Sell" ? "font-semibold text-[#00D09C]" : "text-white"}>{money(row.bid)}</td><td className={action === "Buy" ? "font-semibold text-[#00D09C]" : "text-white"}>{money(row.ask)}</td><td className="text-white">{money(row.mark)}</td><td className="text-white">{money(row.last)}</td><td className={"pr-4 font-semibold " + tone}>{row.percentChange >= 0 ? "+" : ""}{row.percentChange.toFixed(1)}%</td></>
                    )}
                  </tr>
                </Fragment>
              );
            })}
            {markerIndex === -1 && rows.length > 0 && <tr data-share-price><td colSpan={6} className="relative h-6 p-0"><span className="absolute inset-x-0 top-1/2 h-[2px] bg-[#00D09C]" /><span className="relative z-[1] mx-auto block w-fit rounded-full bg-[#00D09C] px-3 py-[2px] text-[11px] font-bold text-black">Share price {money(stock.price)}</span></td></tr>}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-12 text-center text-[14px] text-[#8E8E93]">{base.failed || dated.failed ? "Option chain unavailable right now." : "Loading option chain…"}</p>}
        <p className="px-4 py-4 text-[12px] text-[#8E8E93]">{usingLive ? "Live exchange quotes, delayed up to 15 minutes." : "Quotes priced by the simulator from the current share price."} Simulated orders with virtual money; no real contracts are traded.</p>
      </div>

      {picker && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setPicker(false)}>
          <div role="dialog" aria-label="Choose underlying" className="max-h-[75vh] w-full overflow-y-auto rounded-t-[22px] bg-[#1C1C1E] p-4" onClick={event => event.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-black px-3"><Search size={17} className="text-[#8E8E93]" /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search stocks" className="h-11 flex-1 bg-transparent text-[15px] outline-none" /></div>
            {filtered.map(item => (
              <button key={item.ticker} onClick={() => { onChangeTicker(item.ticker); setExpiryKey(null); setPicker(false); setQuery(""); }} className="flex w-full items-center gap-3 py-2 text-left">
                <CompanyLogo ticker={item.ticker} name={item.name} size={32} /><span className="flex-1"><b className="block text-[15px]">{item.ticker}</b><small className="text-[12px] text-[#8E8E93]">{item.name}</small></span>{item.ticker === stock.ticker && <Check size={18} className="text-[#00D09C]" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {positionsOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setPositionsOpen(false)}>
          <div role="dialog" aria-label="Your option positions" className="max-h-[75vh] w-full overflow-y-auto rounded-t-[22px] bg-[#1C1C1E] p-4" onClick={event => event.stopPropagation()}>
            <div className="mb-2 flex items-center"><h2 className="flex-1 text-[18px] font-bold">Your contracts</h2><button aria-label="Close" onClick={() => setPositionsOpen(false)}><X size={20} /></button></div>
            {positions.length === 0 && <p className="py-6 text-center text-[14px] text-[#8E8E93]">You don&apos;t hold any options contracts yet.</p>}
            {positions.map(position => <PositionRow key={position.id} position={position} stocks={stocks} day={state.market.day} money={money} />)}
          </div>
        </div>
      )}
    </section>
  );
}

function PositionRow({ position, stocks, day, money }: { position: OptionPosition; stocks: Stock[]; day: number; money: (value: number) => string }) {
  const spot = stocks.find(item => item.ticker === position.ticker)?.price ?? 0;
  const mark = positionMark(position, spot, day);
  const pnl = (mark - position.premium) * CONTRACT_SIZE * position.contracts;
  return (
    <div className="flex items-center justify-between border-b border-[#2C2C2E] py-3 text-[14px] tabular-nums">
      <span><b className="block">{position.ticker} {money(position.strike)} {position.type === "call" ? "Call" : "Put"}</b><small className="text-[12px] text-[#8E8E93]">{position.contracts} × · avg {money(position.premium)} · {Math.max(0, position.expiryDay - day)}d left</small></span>
      <span className="text-right"><b className="block">{money(mark * CONTRACT_SIZE * position.contracts)}</b><small className={"text-[12px] font-semibold " + (pnl >= 0 ? "text-[#00D09C]" : "text-[#FF5722]")}>{pnl >= 0 ? "+" : "−"}{money(Math.abs(pnl))}</small></span>
    </div>
  );
}

function ContractDetail({ stock, contract, initialAction, onBack, positions, money, onBuy, onSell, marketOpen, state }: OptionsChainProps & { contract: Contract; initialAction: "Buy" | "Sell"; onBack: () => void; positions: OptionPosition[]; money: (value: number) => string }) {
  const { row, type, expiry } = contract;
  const [action, setAction] = useState<"Buy" | "Sell">(initialAction);
  const [contracts, setContracts] = useState(1);
  const [orderType, setOrderType] = useState<"Market" | "Limit">("Market");
  const [limit, setLimit] = useState(() => row.mark.toFixed(2));
  const [review, setReview] = useState(false);
  const label = `${stock.ticker} ${money(row.strike)} ${type === "call" ? "Call" : "Put"}`;
  const expiryDay = state.market.day + Math.ceil(expiry.days);
  const held = positions.find(position => position.ticker === stock.ticker && position.type === type && position.strike === row.strike && position.expiryDay === expiryDay);
  const quoted = action === "Buy" ? row.ask : row.bid;
  const limitPrice = Number(limit);
  const price = orderType === "Limit" && limitPrice > 0 ? limitPrice : quoted;
  const fillable = orderType === "Market" || (action === "Buy" ? limitPrice >= row.ask : limitPrice <= row.bid);
  const cost = optionCost(contracts, price);
  const breakEven = type === "call" ? row.strike + row.ask : row.strike - row.ask;
  const premiumCost = row.ask * CONTRACT_SIZE;
  const chance = chanceOfProfit(stock.price, breakEven, expiry.days, row.iv, type);
  const change = row.last && row.percentChange ? row.last - row.last / (1 + row.percentChange / 100) : 0;
  const canSell = !!held && contracts <= held.contracts;
  const disabledReason = !(price > 0) ? "This contract has no quote right now." : !marketOpen ? "Options trade during regular market hours only." : action === "Sell" && !held ? "You don't hold this contract, so there is nothing to sell." : action === "Sell" && !canSell ? `You hold ${held!.contracts} contract${held!.contracts > 1 ? "s" : ""}.` : !fillable ? (action === "Buy" ? "Limit price is below the ask, so the order would not fill." : "Limit price is above the bid, so the order would not fill.") : action === "Buy" && cost > state.cash ? "Not enough buying power for this order." : null;
  const submit = () => {
    const ok = action === "Buy" ? onBuy({ ticker: stock.ticker, type, strike: row.strike, daysToExpiry: expiry.days, contracts, price, iv: row.iv }) : onSell(held!.id, contracts, price);
    if (ok) { setReview(false); onBack(); }
  };

  return (
    <section className="-mx-4 min-h-screen bg-black px-4 pb-28 text-white" aria-label={label}>
      <header className="relative flex h-14 items-center justify-center">
        <button aria-label="Back to options chain" onClick={onBack} className="absolute left-0"><ArrowLeft size={22} /></button>
        <h1 className="text-[17px] font-bold tabular-nums">{label}</h1>
      </header>
      <p className="text-[13px] text-[#C7C7CC]">Expires {expiry.label.split(" · ")[0]} · {expiry.days} day{expiry.days === 1 ? "" : "s"} left</p>
      <p className="mt-1 text-[30px] font-bold tabular-nums">{money(row.mark)}</p>
      <p className={"text-[13px] font-semibold tabular-nums " + (row.percentChange >= 0 ? "text-[#00D09C]" : "text-[#FF5722]")}>{change >= 0 ? "+" : "−"}{money(Math.abs(change))} ({row.percentChange >= 0 ? "+" : ""}{row.percentChange.toFixed(2)}%) Today</p>
      <p className="text-[13px] text-[#C7C7CC] tabular-nums">Bid {money(row.bid)} · Ask {money(row.ask)}</p>
      <div className="mt-3 flex"><Segmented label="Order side" items={["Buy", "Sell"] as const} value={action} onChange={setAction} /></div>
      <p className={"mt-2 text-center text-[13px] font-semibold " + (action === "Buy" ? "text-[#00D09C]" : "text-[#FF5722]")}>{action === "Buy" ? "Buy to open" : "Sell to close"}{held ? ` · you hold ${held.contracts}` : ""}</p>

      <h2 className="mt-5 text-[17px] font-bold">Payoff at expiration</h2>
      <Payoff spot={stock.price} strike={row.strike} premium={row.ask} type={type} contracts={contracts} ticker={stock.ticker} money={money} />

      <h2 className="mt-5 text-[17px] font-bold">Stats</h2>
      <div className="grid grid-cols-2 gap-x-6">
        <Stat label="Break-even" value={money(breakEven)} /><Stat label="Chance of profit" value={(chance * 100).toFixed(1) + "%"} />
        <Stat label="Max profit" value={type === "call" ? "Unlimited" : money(Math.max(0, breakEven) * CONTRACT_SIZE * contracts)} tone="gain" /><Stat label="Max loss" value={"−" + money(premiumCost * contracts)} tone="loss" />
        <Stat label="Implied volatility" value={(row.iv * 100).toFixed(1) + "%"} /><Stat label="Delta" value={row.delta.toFixed(3)} />
        <Stat label="Gamma" value={row.gamma.toFixed(3)} /><Stat label="Theta" value={row.theta.toFixed(3)} />
        <Stat label="Vega" value={row.vega.toFixed(3)} /><Stat label="Volume" value={row.volume.toLocaleString("en-US")} />
        <Stat label="Open interest" value={compact(row.openInterest)} /><Stat label="Time to expiry" value={`${expiry.days} days`} />
      </div>

      <h2 className="mt-5 text-[17px] font-bold">Order</h2>
      <div className="flex items-center justify-between py-2 text-[15px]"><span>Contracts</span><span className="flex items-center gap-5"><button aria-label="Fewer contracts" onClick={() => setContracts(Math.max(1, contracts - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-[#2C2C2E]"><Minus size={16} /></button><b className="w-6 text-center tabular-nums">{contracts}</b><button aria-label="More contracts" onClick={() => setContracts(Math.min(999, contracts + 1))} className="grid h-8 w-8 place-items-center rounded-full bg-[#2C2C2E]"><Plus size={16} /></button></span></div>
      <div className="flex items-center justify-between gap-6 py-2 text-[15px]"><span>Order type</span><div className="flex w-[180px]"><Segmented label="Order type" items={["Market", "Limit"] as const} value={orderType} onChange={setOrderType} /></div></div>
      {orderType === "Limit" && <label className="flex items-center justify-between py-2 text-[15px]"><span>Limit price</span><input inputMode="decimal" aria-label="Limit price" value={limit} onChange={event => setLimit(event.target.value.replace(/[^\d.]/g, ""))} className="h-9 w-[110px] rounded-lg bg-[#1C1C1E] px-3 text-right tabular-nums outline-none" /></label>}
      <p className="text-[12px] text-[#C7C7CC] tabular-nums">{money(state.cash)} buying power available</p>
      <div className="mt-3 flex justify-between text-[17px] font-bold tabular-nums"><span>{action === "Buy" ? "Est. cost" : "Est. credit"}</span><span>{money(action === "Buy" ? cost : Math.max(0, contracts * price * CONTRACT_SIZE - contracts * OPTION_FEE_PER_CONTRACT))}</span></div>
      <p className="mt-3 text-[12px] text-[#C7C7CC]">{disabledReason ?? "Options trade during regular market hours only."}</p>
      <p className="mt-2 text-[11px] text-[#8E8E93]">Options settle in cash at expiration. In-the-money contracts you hold pay their intrinsic value, and out-of-the-money contracts expire worthless. Commission {money(OPTION_FEE_PER_CONTRACT)} per contract.</p>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-black px-4 pb-6 pt-3">
        <button onClick={() => setReview(true)} disabled={!!disabledReason} className="h-12 w-full rounded-full bg-[#00D09C] text-[16px] font-bold text-black disabled:opacity-40">Review order</button>
      </div>

      {review && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={() => setReview(false)}>
          <div role="dialog" aria-label="Review order" className="w-full rounded-t-[22px] bg-[#1C1C1E] px-4 pb-6 pt-5" onClick={event => event.stopPropagation()}>
            <h2 className="pb-3 text-[19px] font-bold tabular-nums">{label} • {expiry.label.split(" · ")[0]}</h2>
            {[["Action", action === "Buy" ? "Buy to open" : "Sell to close"], ["Contracts", String(contracts)], ["Order type", orderType], ["Price per share", money(price)]].map(([name, value]) => <div key={name} className="flex justify-between border-b border-[#2C2C2E] py-3 text-[15px]"><span className="text-[#C7C7CC]">{name}</span><b className="tabular-nums">{value}</b></div>)}
            <div className="flex justify-between py-3 text-[16px] font-bold tabular-nums"><span>{action === "Buy" ? "Est. cost" : "Est. credit"}</span><span>{money(action === "Buy" ? cost : Math.max(0, contracts * price * CONTRACT_SIZE - contracts * OPTION_FEE_PER_CONTRACT))}</span></div>
            <p className="text-[11px] text-[#8E8E93]">Simulated order with virtual money. No real trade is placed.</p>
            <div className="mt-4 flex flex-col items-center gap-1 text-[13px] font-semibold text-[#C7C7CC]"><ArrowUp size={16} />Swipe up to submit</div>
            <button aria-label="Submit order" onClick={submit}
              className="mt-3 grid h-14 w-full place-items-center rounded-full bg-[#0B3D2E]"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#00D09C] text-black"><ArrowUp size={22} /></span></button>
          </div>
        </div>
      )}
    </section>
  );
}
