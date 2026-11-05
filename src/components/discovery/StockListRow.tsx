"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import { CompanyLogo } from "@/components/market/CompanyLogo";
import { formatMoney } from "@/lib/currency";
import type { CurrencyCode } from "@/lib/currency";
import type { Stock } from "@/lib/market";

type Props = {
  stock: Stock;
  currency?: CurrencyCode;
  onClick: () => void;
  mode?: "price" | "volume";\n  quantity?: number;\n  value?: number;\n  changePercent?: number;
};

const signedChange = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;

export function StockListRow({ stock, currency = "USD", onClick, mode = "price", quantity, value, changePercent }: Props) {
  const history = stock.history.map((value, index) => ({ index, value }));
  const displayedChange = changePercent ?? stock.change;\n  const positive = displayedChange >= 0;\n  const accessibleQuantity = quantity === undefined ? "" : `, ${quantity.toFixed(3)} shares`;

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
          <small>{stock.name}</small>\n          {quantity !== undefined && <small className="stock-row-quantity">{quantity.toFixed(3)} shares</small>}
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
        <b>{mode === "volume" ? `Vol ${(stock.volume / 1e6).toFixed(1)}M` : formatMoney(value ?? stock.price, currency)}</b>
        <small className={`stock-change-pill ${positive ? "positive" : "negative"}`}>{signedChange(displayedChange)}</small>
      </span>
    </button>
  );
}
