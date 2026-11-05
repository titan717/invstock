import { NextResponse } from "next/server";
import { exchangeSymbol, type LiveDetail } from "@/lib/live-quotes";

export const dynamic = "force-dynamic";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; STONKS/1.0)" };
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

export async function GET(_request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker: raw } = await context.params;
  const ticker = raw.toUpperCase();
  const symbol = /^[A-Z.\-]{1,10}$/.test(ticker) ? exchangeSymbol(ticker) : null;
  if (!symbol) return NextResponse.json({ error: "No exchange listing for this ticker." }, { status: 404 });
  try {
    const [chart, search] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m`, { headers: UA, cache: "no-store" }).then(response => (response.ok ? response.json() : null)),
      fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=10&quotesCount=0`, { headers: UA, cache: "no-store" }).then(response => (response.ok ? response.json() : null)).catch(() => null),
    ]);
    const meta = chart?.chart?.result?.[0]?.meta;
    if (!meta) return NextResponse.json({ error: "Quote unavailable." }, { status: 502 });
    const detail: LiveDetail = {
      ticker,
      price: num(meta.regularMarketPrice) ?? 0,
      previousClose: num(meta.previousClose) ?? num(meta.chartPreviousClose) ?? 0,
      dayHigh: num(meta.regularMarketDayHigh),
      dayLow: num(meta.regularMarketDayLow),
      yearHigh: num(meta.fiftyTwoWeekHigh),
      yearLow: num(meta.fiftyTwoWeekLow),
      volume: num(meta.regularMarketVolume),
      exchange: typeof meta.fullExchangeName === "string" ? meta.fullExchangeName : null,
      time: num(meta.regularMarketTime) ?? 0,
      news: Array.isArray(search?.news) ? search.news.filter((item: { title?: unknown; link?: unknown }) => typeof item.title === "string" && typeof item.link === "string").slice(0, 10).map((item: { title: string; publisher?: string; link: string; providerPublishTime?: number }) => ({ title: item.title, publisher: item.publisher ?? "", link: item.link, time: item.providerPublishTime ?? 0 })) : [],
    };
    return NextResponse.json(detail, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ error: "Quote unavailable." }, { status: 502 });
  }
}
