import { NextResponse } from "next/server";
import { exchangeSymbol } from "@/lib/live-quotes";
import { yahooJson } from "@/lib/server/yahoo";
import type { FinancialStatements, StatementRow } from "@/lib/company-data";

export const dynamic = "force-dynamic";

type Spec = { key: string; label: string; format?: StatementRow["format"]; children?: Spec[] };
const INCOME: Spec[] = [
  { key: "TotalRevenue", label: "Revenue", children: [{ key: "OperatingRevenue", label: "Revenue from Operations" }] },
  { key: "TotalExpenses", label: "Expenses", children: [{ key: "CostOfRevenue", label: "Cost of Revenue" }, { key: "ResearchAndDevelopment", label: "Research & Development" }, { key: "SellingGeneralAndAdministration", label: "Selling, General & Administrative Expenses" }] },
  { key: "EBITDA", label: "EBITDA" },
  { key: "EBIT", label: "EBIT" },
  { key: "PretaxIncome", label: "Profit Before Tax" },
  { key: "NetIncome", label: "Net Profit" },
  { key: "DilutedEPS", label: "Earning Per Share (Diluted)", format: "ratio" },
];
const BALANCE: Spec[] = [
  { key: "TotalAssets", label: "Total Assets", children: [{ key: "CurrentAssets", label: "Current Assets" }, { key: "CashAndCashEquivalents", label: "Cash & Equivalents" }] },
  { key: "TotalLiabilitiesNetMinorityInterest", label: "Total Liabilities", children: [{ key: "CurrentLiabilities", label: "Current Liabilities" }, { key: "LongTermDebt", label: "Long Term Debt" }] },
  { key: "StockholdersEquity", label: "Shareholders' Equity" },
];
const CASHFLOW: Spec[] = [
  { key: "OperatingCashFlow", label: "Operating Activities" },
  { key: "InvestingCashFlow", label: "Investing Activities" },
  { key: "FinancingCashFlow", label: "Financing Activities" },
  { key: "FreeCashFlow", label: "Free Cash Flow" },
];
const keys = (specs: Spec[]): string[] => specs.flatMap(spec => [spec.key, ...keys(spec.children ?? [])]);

type Series = { meta: { type: string[] }; [type: string]: unknown };

export async function GET(request: Request, context: { params: Promise<{ ticker: string }> }) {
  const ticker = (await context.params).ticker.toUpperCase();
  const symbol = /^[A-Z.\-]{1,10}$/.test(ticker) ? exchangeSymbol(ticker) : null;
  if (!symbol) return NextResponse.json({ error: "No exchange listing for this ticker." }, { status: 404 });
  const period = new URL(request.url).searchParams.get("period") === "annual" ? "annual" : "quarterly";
  const now = Math.floor(Date.now() / 1000);
  const types = [...keys(INCOME), ...keys(BALANCE), ...keys(CASHFLOW)].map(key => period + key).join(",");
  try {
    const payload = await yahooJson<{ timeseries?: { result?: Series[] } }>(`https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=${types}&period1=${now - 86400 * (period === "annual" ? 2200 : 800)}&period2=${now}`);
    const series = new Map<string, Map<string, number>>();
    const dateSet = new Set<string>();
    for (const item of payload.timeseries?.result ?? []) {
      const type = item.meta?.type?.[0];
      const values = Array.isArray(item[type]) ? (item[type] as ({ asOfDate: string; reportedValue?: { raw?: number } } | null)[]) : [];
      const map = new Map<string, number>();
      for (const value of values) if (value?.asOfDate && typeof value.reportedValue?.raw === "number") { map.set(value.asOfDate, value.reportedValue.raw); dateSet.add(value.asOfDate); }
      series.set(type.slice(period.length), map);
    }
    const dates = [...dateSet].sort();
    const build = (specs: Spec[]): StatementRow[] => specs.map(spec => ({ key: spec.key, label: spec.label, format: spec.format ?? "money", values: dates.map(date => series.get(spec.key)?.get(date) ?? null), children: spec.children ? build(spec.children).filter(row => row.values.some(value => value !== null)) : undefined })).filter(row => row.values.some(value => value !== null));
    const data: FinancialStatements = { ticker, period, dates, income: build(INCOME), balance: build(BALANCE), cashflow: build(CASHFLOW) };
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ error: "Financial statements unavailable." }, { status: 502 });
  }
}
