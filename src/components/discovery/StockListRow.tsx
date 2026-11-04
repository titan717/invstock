"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import { ChevronRight } from "lucide-react";
import { CompanyLogo } from "@/components/market/CompanyLogo";
import { formatMoney } from "@/lib/currency";
import type { CurrencyCode } from "@/lib/currency";
import type { Stock } from "@/lib/market";

type Props = {
  stock: Stock;
  currency?: CurrencyCode;
  onClick: () => void;
  mode?: "price" | "volume";
};

const signedChange = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;

export function StockListRow({ stock, currency = "USD", onClick, mode = "price" }: Props) {
  const history = stock.history.map((value, index) => ({ index, value }));
  const positive = stock.change >= 0;

  return (
    <button
      type="button"
      className="stock-list-row"
      data-stock-ticker={stock.ticker}
      aria-label={`${stock.ticker}, ${stock.name}, ${formatMoney(stock.price, currency)}, ${signedChange(stock.change)}`}
      onClick={onClick}
    >
      <span className="stock-row-identity">
        <CompanyLogo ticker={stock.ticker} name={stock.name} size={40} className="stock-row-logo" />
        <span className="stock-row-meta">
          <b>{stock.ticker}</b>
          <small>{stock.name}</small>
        </span>
      </span>
      <span className={`stock-row-sparkline ${positive ? "positive" : "negative"}`} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
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
      <span className="stock-row-quote">
        <b>{mode === "volume" ? `Vol ${(stock.volume / 1e6).toFixed(1)}M` : formatMoney(stock.price, currency)}</b>
        <small className={`stock-change-pill ${positive ? "positive" : "negative"}`}>{signedChange(stock.change)}</small>
      </span>
      <ChevronRight className="stock-row-chevron" size={15} aria-hidden="true" />
    </button>
  );
}
