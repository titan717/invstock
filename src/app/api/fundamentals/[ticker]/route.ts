import { NextResponse } from "next/server";
import { exchangeSymbol } from "@/lib/live-quotes";
import { raw, yahooJson } from "@/lib/server/yahoo";
import type { CompanyEvent, CompanyFundamentals, PeriodValue } from "@/lib/company-data";

export const dynamic = "force-dynamic";
type Obj = Record<string, unknown>;
const o = (value: unknown): Obj => (value && typeof value === "object" ? (value as Obj) : {});
const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

export async function GET(_request: Request, context: { params: Promise<{ ticker: string }> }) {
  const ticker = (await context.params).ticker.toUpperCase();
  const symbol = /^[A-Z.\-]{1,10}$/.test(ticker) ? exchangeSymbol(ticker) : null;
  if (!symbol) return NextResponse.json({ error: "No exchange listing for this ticker." }, { status: 404 });
  try {
    const modules = "assetProfile,summaryDetail,defaultKeyStatistics,financialData,majorHoldersBreakdown,calendarEvents,earnings,recommendationTrend,price";
    const payload = await yahooJson<Obj>(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`);
    const result = o((o(payload.quoteSummary).result as unknown[] | undefined)?.[0]);
    const profile = o(result.assetProfile), summary = o(result.summaryDetail), stats = o(result.defaultKeyStatistics), financial = o(result.financialData), holders = o(result.majorHoldersBreakdown), calendar = o(result.calendarEvents), earnings = o(result.earnings), price = o(result.price);
    const chart = o(earnings.financialsChart);
    const periods = (list: unknown, label: (item: Obj) => string): PeriodValue[] => (Array.isArray(list) ? list.map(item => ({ label: label(o(item)), revenue: raw(o(item).revenue), profit: raw(o(item).earnings) })) : []);
    const officers = Array.isArray(profile.companyOfficers) ? (profile.companyOfficers as Obj[]) : [];
    const ceo = officers.find(item => /CEO|Chief Executive/i.test(String(item.title ?? ""))) ?? officers[0];
    const events: CompanyEvent[] = [];
    const earningsDates = Array.isArray(o(calendar.earnings).earningsDate) ? (o(calendar.earnings).earningsDate as unknown[]) : [];
    const firstEarnings = raw(earningsDates[0]);
    if (firstEarnings) events.push({ date: firstEarnings, title: "Result", detail: o(calendar.earnings).isEarningsDateEstimate ? "Expected release date" : "Release date" });
    const exDividend = raw(calendar.exDividendDate);
    if (exDividend) events.push({ date: exDividend, title: "Ex-dividend", detail: "Buy before this date to receive the dividend" });
    const dividendDate = raw(calendar.dividendDate);
    if (dividendDate) events.push({ date: dividendDate, title: "Dividend", detail: "Payment date" });
    const trend = o((Array.isArray(o(result.recommendationTrend).trend) ? (o(result.recommendationTrend).trend as unknown[]) : [])[0]);
    const city = [str(profile.city), str(profile.state), str(profile.country)].filter(Boolean).join(", ");
    const insiders = raw(holders.insidersPercentHeld), institutions = raw(holders.institutionsPercentHeld);
    const data: CompanyFundamentals = {
      ticker, name: str(price.longName) ?? str(price.shortName) ?? ticker, ceo: ceo ? str(ceo.name) : null, sector: str(profile.sector), industry: str(profile.industry), website: str(profile.website), employees: raw(profile.fullTimeEmployees), headquarters: city || null, description: str(profile.longBusinessSummary),
      open: raw(summary.open), previousClose: raw(summary.previousClose), dayLow: raw(summary.dayLow), dayHigh: raw(summary.dayHigh), yearLow: raw(summary.fiftyTwoWeekLow), yearHigh: raw(summary.fiftyTwoWeekHigh), volume: raw(summary.volume), averageVolume: raw(summary.averageVolume),
      marketCap: raw(price.marketCap) ?? raw(summary.marketCap), pe: raw(summary.trailingPE), forwardPe: raw(summary.forwardPE), eps: raw(stats.trailingEps), priceToBook: raw(stats.priceToBook), bookValue: raw(stats.bookValue), roe: raw(financial.returnOnEquity), debtToEquity: raw(financial.debtToEquity), dividendYield: raw(summary.dividendYield), beta: raw(summary.beta), profitMargin: raw(financial.profitMargins) ?? raw(stats.profitMargins),
      holders: insiders !== null || institutions !== null ? { insiders, institutions, institutionsCount: raw(holders.institutionsCount) } : null,
      quarterly: periods(chart.quarterly, item => String(item.date ?? "")), yearly: periods(chart.yearly, item => String(item.date ?? "")),
      events: events.sort((a, b) => a.date - b.date),
      analysts: Object.keys(trend).length ? { strongBuy: raw(trend.strongBuy) ?? 0, buy: raw(trend.buy) ?? 0, hold: raw(trend.hold) ?? 0, sell: raw(trend.sell) ?? 0, strongSell: raw(trend.strongSell) ?? 0, targetMean: raw(financial.targetMeanPrice), targetHigh: raw(financial.targetHighPrice), targetLow: raw(financial.targetLowPrice) } : null,
    };
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ error: "Fundamentals unavailable." }, { status: 502 });
  }
}
