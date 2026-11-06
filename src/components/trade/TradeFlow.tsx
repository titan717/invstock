"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, Delete } from "lucide-react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";

export type TradeSide = "buy" | "sell";
export type TradeUnit = "Shares" | "Dollars";
export type TradeOrderType = "Market" | "Limit";

export type TradeFlowProps = {
  ticker: string;
  price: number;
  bid: number;
  ask: number;
  buyingPower: number;
  isMarketOpen: boolean;
  chartHistory: number[];
  tradeSide?: TradeSide;
  /** Shares currently held; caps sell orders. */
  sharesAvailable?: number;
  /** Fraction (0-1) of today's session elapsed; the rest of the chart is shaded. */
  sessionProgress?: number;
  /** Change over the charted session, in percent. */
  dayChangePct?: number;
  currencySymbol?: string;
  onBack: () => void;
  onExecuteTrade: (input: {
    side: TradeSide;
    unit: TradeUnit;
    amount: number;
    shares: number;
    estimatedPrice: number;
  }) => boolean | void;
  onQueueOrder: (input: {
    side: TradeSide;
    shares: number;
    targetPrice: number;
  }) => boolean | void;
};

const formatAmount = (value: number, symbol = "$") =>
  `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function TradeFlow({
  ticker,
  price,
  bid,
  ask,
  buyingPower,
  isMarketOpen,
  chartHistory,
  tradeSide = "buy",
  sharesAvailable = Infinity,
  sessionProgress = 1,
  dayChangePct,
  currencySymbol = "$",
  onBack,
  onExecuteTrade,
  onQueueOrder,
}: TradeFlowProps) {
  const [unit, setUnit] = useState<TradeUnit>("Dollars");
  const [orderType, setOrderType] = useState<TradeOrderType>("Market");
  const [typeSheet, setTypeSheet] = useState(false);
  const [amount, setAmount] = useState("");
  const [limitInput, setLimitInput] = useState(() => price.toFixed(2));
  const [editing, setEditing] = useState<"amount" | "limit">("amount");
  const [confirmation, setConfirmation] = useState<null | {
    title: string;
    shares: number;
    price: number;
    total: number;
    status: string;
    type: TradeOrderType;
  }>(null);

  const isBuy = tradeSide === "buy";
  const limitPrice = Number(limitInput || 0);
  const executionPrice = orderType === "Limit" ? limitPrice : price;
  const numericAmount = Number(amount || 0);
  const estimatedShares = unit === "Dollars" ? (executionPrice > 0 ? numericAmount / executionPrice : 0) : numericAmount;
  const estimatedTotal = unit === "Dollars" ? numericAmount : numericAmount * executionPrice;
  const withinLimits = isBuy ? estimatedTotal <= buyingPower + 1e-9 : estimatedShares <= sharesAvailable + 1e-9;
  const canSubmit = numericAmount > 0 && estimatedShares > 0 && withinLimits && (orderType === "Market" || limitPrice > 0);
  const accent = canSubmit ? "#00D09C" : "#FF5722";

  const chartData = useMemo(() => chartHistory.map((value, index) => ({ index, value })), [chartHistory]);
  const change = dayChangePct ?? (chartHistory.length > 1 ? (chartHistory[chartHistory.length - 1] / chartHistory[0] - 1) * 100 : 0);
  const rising = change >= 0;
  // Points are session ticks (78 per day); never squeeze more history than the elapsed share of the day.
  const progress = Math.min(1, Math.max(0.05, sessionProgress, chartHistory.length / 78));

  const editValue = editing === "amount" ? amount : limitInput;
  const setEditValue = (next: string) => (editing === "amount" ? setAmount(next) : setLimitInput(next));
  const pressKey = (key: string) => {
    if (key === "backspace") { setEditValue(editValue.slice(0, -1)); return; }
    if (key === ".") { if (!editValue.includes(".")) setEditValue(editValue ? `${editValue}.` : "0."); return; }
    const decimals = editValue.split(".")[1];
    if (decimals !== undefined && decimals.length >= (editing === "amount" && unit === "Shares" ? 6 : 2)) return;
    setEditValue(editValue === "0" ? key : `${editValue}${key}`);
  };

  const submitOrder = () => {
    if (!canSubmit) return;
    if (orderType === "Market" && isMarketOpen) {
      const accepted = onExecuteTrade({ side: tradeSide, unit, amount: numericAmount, shares: estimatedShares, estimatedPrice: price });
      if (accepted === false) return;
      setConfirmation({ title: "Order filled", shares: estimatedShares, price, total: estimatedTotal, status: "Filled", type: "Market" });
      return;
    }
    const queued = onQueueOrder({ side: tradeSide, shares: estimatedShares, targetPrice: executionPrice });
    if (queued === false) return;
    setConfirmation({
      title: orderType === "Limit" ? "Limit order placed" : "Order queued",
      shares: estimatedShares,
      price: executionPrice,
      total: estimatedTotal,
      status: orderType === "Limit" ? (isBuy ? `Fills at ${formatAmount(executionPrice, currencySymbol)} or lower` : `Fills at ${formatAmount(executionPrice, currencySymbol)} or higher`) : "Queued for market open",
      type: orderType,
    });
  };

  const amountLabel = unit === "Dollars" ? formatAmount(numericAmount, currencySymbol).replace(/\.00$/, "") : amount || "0";
  const row = "flex items-center justify-between py-2.5 text-[14px] [font-variant-numeric:tabular-nums]";

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <header className="grid h-14 grid-cols-[44px_1fr_44px] items-center px-2">
        <button aria-label="Go back" onClick={onBack} className="grid h-11 w-11 place-items-center"><ChevronLeft size={24} /></button>
        <h1 className="text-center text-[17px] font-bold">{isBuy ? "Buy" : "Sell"} {ticker}</h1>
        <span />
      </header>

      <main className="flex-1 px-4">
        <div className={row}>
          <span className="font-semibold">Order type</span>
          <button type="button" aria-label="Order type" onClick={() => setTypeSheet(true)} className="flex items-center gap-1 font-semibold" style={{ color: accent }}>
            {orderType}<ChevronDown size={15} />
          </button>
        </div>
        <div className={row}>
          <span className="font-semibold">{isBuy ? "Buy in" : "Sell in"}</span>
          <div className="flex w-[58%] rounded-lg bg-[#1C1C1E] p-0.5" role="tablist" aria-label="Order unit">
            {(["Shares", "Dollars"] as TradeUnit[]).map((option) => (
              <button key={option} role="tab" aria-selected={unit === option} onClick={() => { setUnit(option); setAmount(""); setEditing("amount"); }}
                className={`flex-1 rounded-md py-1.5 text-[12px] font-semibold ${unit === option ? "bg-[#3A3A3C] text-white" : "text-[#8E8E93]"}`}>{option}</button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => setEditing("amount")} className={`${row} w-full`} aria-label="Edit amount">
          <span className="text-[16px] font-bold">{unit === "Dollars" ? "Amount" : "Shares"}</span>
          <span className="flex flex-col items-end">
            <b className="text-[24px] font-bold leading-7" data-testid="trade-amount">{amountLabel}</b>
            <i className="mt-1 block h-[2px] w-[150px] rounded" style={{ background: editing === "amount" ? accent : "#3A3A3C" }} />
          </span>
        </button>
        {unit === "Dollars" && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[50, 100, 250, 500].map((value) => (
              <button key={value} onClick={() => { setEditing("amount"); setAmount(String(value)); }} className="rounded-md bg-[#1C1C1E] py-1.5 text-[12px] font-semibold [font-variant-numeric:tabular-nums]">
                {currencySymbol}{value}
              </button>
            ))}
          </div>
        )}
        {orderType === "Limit" && (
          <button type="button" onClick={() => setEditing("limit")} className={`${row} mt-1 w-full`} aria-label="Edit limit price">
            <span className="font-semibold">Limit price</span>
            <span className="flex flex-col items-end">
              <b className="text-[18px] font-bold" data-testid="limit-price">{currencySymbol}{limitInput || "0"}</b>
              <i className="mt-1 block h-[2px] w-[110px] rounded" style={{ background: editing === "limit" ? accent : "#3A3A3C" }} />
            </span>
          </button>
        )}
        <div className={`${row} mt-1`}>
          <span className="text-[#C7C7CC]">Market price</span>
          <span className="text-[12px] text-[#C7C7CC]">{formatAmount(price, currencySymbol)} • Bid {formatAmount(bid, currencySymbol)} • Ask {formatAmount(ask, currencySymbol)}</span>
        </div>
        <div className={row}>
          <span className="font-bold">{unit === "Dollars" ? "Est. shares" : "Est. cost"}</span>
          <b data-testid="trade-estimate">{unit === "Dollars" ? estimatedShares.toLocaleString("en-US", { maximumFractionDigits: 6 }) : formatAmount(estimatedTotal, currencySymbol)}</b>
        </div>
        <p className="text-[11px] text-[#C7C7CC] [font-variant-numeric:tabular-nums]">
          {isBuy ? `${formatAmount(buyingPower, currencySymbol)} buying power available` : `${Number.isFinite(sharesAvailable) ? sharesAvailable.toLocaleString("en-US", { maximumFractionDigits: 6 }) : 0} ${sharesAvailable === 1 ? "share" : "shares"} available`}
          {orderType === "Limit" && " · Good until filled or cancelled"}
        </p>

        <div className="relative mt-3 h-[150px] overflow-hidden rounded-xl bg-[#0E0E0F] px-1 pt-6">
          <span className="absolute left-3 top-2 z-10 text-[11px] font-semibold" style={{ color: rising ? "#00D09C" : "#FF5722" }}>{ticker} · 1D · {rising ? "+" : "−"}{Math.abs(change).toFixed(2)}%</span>
          <span className="absolute bottom-0 right-0 top-0 bg-[#1C1C1E]" style={{ left: `${progress * 100}%` }} aria-hidden="true" />
          <div className="relative h-full" style={{ width: `${progress * 100}%` }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="tradeFlowFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={rising ? "#00D09C" : "#FF5722"} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={rising ? "#00D09C" : "#FF5722"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                {chartData.length > 0 && <ReferenceLine y={chartData[0].value} stroke="#8E8E93" strokeDasharray="2 3" strokeOpacity={0.6} />}
                <Area type="monotone" dataKey="value" stroke={rising ? "#00D09C" : "#FF5722"} fill="url(#tradeFlowFill)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>

      <footer className="mt-4 px-4 pb-4">
        {!isMarketOpen && orderType === "Market" && (
          <p className="mb-2 text-center text-[12px] text-[#FF5722]">The market is closed. Your order will be queued and sent when the market opens.</p>
        )}
        <button
          disabled={!canSubmit}
          onClick={submitOrder}
          className={`h-12 w-full rounded-full text-[15px] font-bold ${canSubmit ? "bg-[#00D09C] text-black" : "bg-[#1C1C1E] text-[#8E8E93]"}`}
        >
          {orderType === "Limit" ? "Place limit order" : isMarketOpen ? "Review order" : "Queue order"}
        </button>
        <div className="mt-2 grid grid-cols-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"].map((key) => (
            <button key={key} onClick={() => pressKey(key)} aria-label={key === "backspace" ? "Backspace" : key}
              className="flex h-12 items-center justify-center text-[20px] font-semibold text-white active:bg-[#1C1C1E]">
              {key === "backspace" ? <Delete size={20} /> : key}
            </button>
          ))}
        </div>
      </footer>

      {typeSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setTypeSheet(false)}>
          <div role="dialog" aria-modal="true" aria-label="Choose order type" onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-[#1C1C1E] px-4 pb-8 pt-3">
            <i className="mx-auto block h-1 w-10 rounded-full bg-[#3A3A3C]" />
            <h2 className="mt-4 text-[18px] font-bold">Order type</h2>
            {([
              ["Market", isBuy ? "Buy now at the best available price." : "Sell now at the best available price."],
              ["Limit", isBuy ? "Buy only at your limit price or lower. Stays open until filled." : "Sell only at your limit price or higher. Stays open until filled."],
            ] as [TradeOrderType, string][]).map(([value, description]) => (
              <button key={value} role="radio" aria-checked={orderType === value} onClick={() => { setOrderType(value); setTypeSheet(false); setEditing(value === "Limit" ? "limit" : "amount"); }}
                className="mt-3 flex w-full items-center gap-3 rounded-xl border border-[#2C2C2E] p-3 text-left">
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${orderType === value ? "border-[#00D09C]" : "border-[#8E8E93]"}`}>{orderType === value && <i className="h-2.5 w-2.5 rounded-full bg-[#00D09C]" />}</span>
                <span><b className="block text-[15px]">{value} order</b><small className="text-[12px] text-[#8E8E93]">{description}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div role="dialog" aria-modal="true" aria-label={confirmation.title} className="w-full max-w-md rounded-t-3xl bg-[#1C1C1E] p-6 pb-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0A3D33]">
              <Check size={30} className="text-[#00D09C]" />
            </div>
            <h2 className="mt-3 text-center text-[20px] font-bold">{confirmation.title}</h2>
            <p className="mt-1 text-center text-[13px] text-[#C7C7CC] [font-variant-numeric:tabular-nums]">
              {confirmation.status === "Filled" ? (isBuy ? "Bought" : "Sold") : isBuy ? "Buying" : "Selling"} {confirmation.shares.toLocaleString("en-US", { maximumFractionDigits: 6 })} shares of {ticker} at {formatAmount(confirmation.price, currencySymbol)}
            </p>
            <dl className="mt-5 text-[14px] [font-variant-numeric:tabular-nums]">
              {[["Order type", confirmation.type], ["Status", confirmation.status], [confirmation.status === "Filled" ? "Average price" : "Limit price", formatAmount(confirmation.price, currencySymbol)], ["Total", formatAmount(confirmation.total, currencySymbol)]].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-[#2C2C2E] py-3 last:border-b-0">
                  <dt className="text-[#C7C7CC]">{label}</dt><dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <button onClick={() => { setConfirmation(null); onBack(); }} className="mt-5 h-12 w-full rounded-full bg-[#00D09C] text-[15px] font-bold text-black">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
