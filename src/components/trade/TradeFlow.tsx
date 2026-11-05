"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUp, Check, ChevronDown, Delete } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

export type TradeSide = "buy" | "sell";
export type TradeUnit = "Shares" | "Dollars";

export type TradeFlowProps = {
  ticker: string;
  price: number;
  bid: number;
  ask: number;
  buyingPower: number;
  isMarketOpen: boolean;
  chartHistory: number[];
  tradeSide?: TradeSide;
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
  currencySymbol = "$",
  onBack,
  onExecuteTrade,
  onQueueOrder,
}: TradeFlowProps) {
  const [unit, setUnit] = useState<TradeUnit>("Dollars");
  const [amount, setAmount] = useState("");
  const [confirmation, setConfirmation] = useState<null | {
    title: string;
    shares: number;
    price: number;
    total: number;
    status: string;
  }>(null);

  const numericAmount = Number(amount || 0);
  const estimatedShares = unit === "Dollars" && price > 0
    ? numericAmount / price
    : numericAmount;
  const estimatedTotal = unit === "Dollars" ? numericAmount : numericAmount * price;

  const chartData = useMemo(
    () => chartHistory.map((value, index) => ({ index, value })),
    [chartHistory]
  );

  const chartRising =
    chartHistory.length < 2 ||
    chartHistory[chartHistory.length - 1] >= chartHistory[0];

  const appendDigit = (digit: string) => {
    if (digit === "." && amount.includes(".")) return;
    if (digit !== "." && amount === "0") {
      setAmount(digit);
      return;
    }
    setAmount((current) => `${current}${digit}`);
  };

  const pressKey = (key: string) => {
    if (key === "backspace") {
      setAmount((current) => current.slice(0, -1));
      return;
    }
    appendDigit(key);
  };

  const submitOrder = () => {
    if (numericAmount <= 0 || estimatedShares <= 0) return;

    if (isMarketOpen) {
      const accepted = onExecuteTrade({
        side: tradeSide,
        unit,
        amount: numericAmount,
        shares: estimatedShares,
        estimatedPrice: price,
      });
      if (accepted === false) return;
      setConfirmation({
        title: "Order filled",
        shares: estimatedShares,
        price,
        total: estimatedTotal,
        status: "Filled",
      });
      return;
    }

    const queued = onQueueOrder({
      side: tradeSide,
      shares: estimatedShares,
      targetPrice: price,
    });
    if (queued === false) return;
    setConfirmation({
      title: "Order queued",
      shares: estimatedShares,
      price,
      total: estimatedTotal,
      status: "Queued for market open",
    });
  };

  const canSubmit = numericAmount > 0 && estimatedShares > 0;

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <header className="flex items-center justify-between px-4 pb-3 pt-5">
        <button
          aria-label="Go back"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1C1C1E]"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-base font-semibold">
            {tradeSide === "buy" ? "Buy" : "Sell"} {ticker}
          </p>
          <button className="mt-0.5 flex items-center gap-1 text-xs text-[#8E8E93]">
            Order type: Market
            <ChevronDown size={13} />
          </button>
        </div>
        <div className="h-10 w-10" />
      </header>

      <main className="flex-1 px-4">
        <div className="flex rounded-full bg-[#1C1C1E] p-1">
          {(["Shares", "Dollars"] as TradeUnit[]).map((option) => (
            <button
              key={option}
              onClick={() => setUnit(option)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                unit === option ? "bg-[#2C2C2E] text-white" : "text-[#8E8E93]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-[64px] font-light leading-none tracking-tight [font-variant-numeric:tabular-nums]">
            {unit === "Dollars"
              ? formatAmount(numericAmount, currencySymbol)
              : `${amount || "0"}`}
          </p>
          <p className="mt-3 text-sm text-[#8E8E93] [font-variant-numeric:tabular-nums]">
            Est. {estimatedShares.toLocaleString("en-US", {
              maximumFractionDigits: 6,
            })} shares
          </p>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2">
          {[50, 100, 250, 500].map((value) => (
            <button
              key={value}
              onClick={() => {
                setUnit("Dollars");
                setAmount(String(value));
              }}
              className="rounded-full bg-[#1C1C1E] py-2 text-sm text-white [font-variant-numeric:tabular-nums]"
            >
              {currencySymbol}
              {value}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-[#1C1C1E] p-4">
          <div className="flex items-center justify-between text-sm [font-variant-numeric:tabular-nums]">
            <span className="text-[#8E8E93]">Market price</span>
            <span>{formatAmount(price, currencySymbol)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm [font-variant-numeric:tabular-nums]">
            <span className="text-[#8E8E93]">Bid · Ask</span>
            <span>
              {formatAmount(bid, currencySymbol)} · {formatAmount(ask, currencySymbol)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm [font-variant-numeric:tabular-nums]">
            <span className="text-[#8E8E93]">Buying power</span>
            <span>{formatAmount(buyingPower, currencySymbol)}</span>
          </div>
        </div>

        <div className="mt-4 h-24 rounded-2xl bg-[#1C1C1E] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="tradeFlowFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D09C" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00D09C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartRising ? "#00D09C" : "#FF5722"}
                fill="url(#tradeFlowFill)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </main>

      <footer className="mt-6 px-4 pb-6">
        {!isMarketOpen && (
          <p className="mb-3 text-center text-sm text-[#FF5722]">
            The market is closed. Your order will be queued and sent when the market opens.
          </p>
        )}

        {isMarketOpen ? (
          <button
            disabled={!canSubmit}
            onClick={submitOrder}
            className={`w-full rounded-full py-4 text-base font-semibold transition-opacity ${
              canSubmit ? "bg-[#00D09C] text-black" : "bg-[#1C1C1E] text-[#8E8E93]"
            }`}
          >
            Review order
          </button>
        ) : (
          <button
            disabled={!canSubmit}
            onClick={submitOrder}
            className={`flex w-full items-center justify-between rounded-full bg-[#0A3D33] p-2 transition-opacity ${
              canSubmit ? "opacity-100" : "opacity-50"
            }`}
          >
            <span className="pl-4 text-sm font-medium text-[#00D09C]">
              Swipe up to submit
            </span>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00D09C] text-black">
              <ArrowUp size={22} />
            </span>
          </button>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"].map((key) => (
            <button
              key={key}
              onClick={() => pressKey(key)}
              aria-label={key === "backspace" ? "Backspace" : key}
              className="flex h-14 items-center justify-center rounded-2xl bg-[#1C1C1E] text-xl text-white active:bg-[#2C2C2E]"
            >
              {key === "backspace" ? <Delete size={22} /> : key}
            </button>
          ))}
        </div>
      </footer>

      {confirmation && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-md rounded-t-3xl bg-[#1C1C1E] p-6 pb-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0A3D33]">
              <Check size={32} className="text-[#00D09C]" />
            </div>
            <h2 className="mt-4 text-center text-xl font-semibold">
              {confirmation.title}
            </h2>
            <p className="mt-2 text-center text-sm text-[#8E8E93] [font-variant-numeric:tabular-nums]">
              {tradeSide === "buy" ? "Bought" : "Sold"} {confirmation.shares.toFixed(4)} shares of{" "}
              {ticker} at {formatAmount(confirmation.price, currencySymbol)}
            </p>

            <dl className="mt-6 space-y-3 text-sm [font-variant-numeric:tabular-nums]">
              <div className="flex justify-between">
                <dt className="text-[#8E8E93]">Order type</dt>
                <dd>Market</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8E8E93]">Status</dt>
                <dd>{confirmation.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8E8E93]">Average price</dt>
                <dd>{formatAmount(confirmation.price, currencySymbol)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#8E8E93]">Total</dt>
                <dd>{formatAmount(confirmation.total, currencySymbol)}</dd>
              </div>
            </dl>

            <button
              onClick={() => {
                setConfirmation(null);
                onBack();
              }}
              className="mt-6 w-full rounded-full bg-[#00D09C] py-4 text-base font-semibold text-black"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
