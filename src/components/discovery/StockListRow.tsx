"use client";

import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";
import { CompanyLogo } from "@/components/market/CompanyLogo";
import { formatMoney } from "@/lib/currency";
import type { CurrencyCode } from "@/lib/currency";
import type { Stock } from "@/lib/market";

type Props = {
  stock: Stock;
  currency?: CurrencyCode;
  onClick: () => void;
  mode?: "price" | "volume";
  quantity?: number;
  value?: number;
  changePercent?: number;
  /** Replaces the company name line (Home positions show only the share count). */
  subtitle?: string;
};

const signedChange = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;

export function StockListRow({ stock, currency = "USD", onClick, mode = "price", quantity, value, changePercent, subtitle }: Props) {
  const history = stock.history.map((value, index) => ({ index, value }));
  const displayedChange = changePercent ?? stock.change;
  const positive = displayedChange >= 0;
  const accessibleQuantity = quantity === undefined ? "" : `, ${quantity.toFixed(3)} shares`;

  return (
    <button
      type="button"
      className="stock-list-row"
      data-stock-ticker={stock.ticker}
      aria-label={`${stock.ticker}, ${stock.name}${accessibleQuantity}, ${formatMoney(value ?? stock.price, currency)}, ${signedChange(displayedChange)}`}
      onClick={onClick}
    >
      <span className="stock-row-identity">
        <CompanyLogo ticker={stock.ticker} name={stock.name} size={40} className="stock-row-logo" />
        <span className="stock-row-meta">
          <b>{stock.ticker}</b>
          {subtitle !== undefined ? <small className="tabular-nums">{subtitle}</small> : <small>{stock.name}</small>}
          {quantity !== undefined && subtitle === undefined && <small className="stock-row-quantity tabular-nums">{quantity.toFixed(3)} shares</small>}
        </span>
      </span>
      <span className={`stock-row-sparkline ${positive ? "positive" : "negative"}`} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            {history.length > 0 && <ReferenceLine y={history[0].value} stroke="#8E8E93" strokeDasharray="2 3" strokeOpacity={0.7} />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={positive ? "#00D09C" : "#FF5722"}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </span>
      <span className="stock-row-quote tabular-nums">
        <b>{mode === "volume" ? `Vol ${(stock.volume / 1e6).toFixed(1)}M` : formatMoney(value ?? stock.price, currency)}</b>
        <small className={`stock-change-pill ${positive ? "positive" : "negative"}`}>{signedChange(displayedChange)}</small>
      </span>
    </button>
  );
}
