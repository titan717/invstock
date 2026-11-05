import { NextResponse } from "next/server";
import { exchangeSymbol, parseSpark, type LiveQuoteMap } from "@/lib/live-quotes";

export const dynamic = "force-dynamic";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; STONKS/1.0)" };

export async function GET(request: Request) {
  const tickers = (new URL(request.url).searchParams.get("symbols") ?? "").split(",").map(item => item.trim().toUpperCase()).filter(item => /^[A-Z.\-]{1,10}$/.test(item)).slice(0, 80);
  const live = tickers.filter(ticker => exchangeSymbol(ticker));
  const quotes: LiveQuoteMap = {};
  const batches: string[][] = [];
  for (let index = 0; index < live.length; index += 20) batches.push(live.slice(index, index + 20));
  await Promise.all(batches.map(async batch => {
    const symbols = batch.map(ticker => exchangeSymbol(ticker)).join(",");
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(symbols)}&range=1d&interval=5m`, { headers: UA, cache: "no-store" });
      if (!response.ok) return;
      Object.assign(quotes, parseSpark(await response.json(), batch));
    } catch { /* provider unavailable: the client falls back to simulated prices */ }
  }));
  return NextResponse.json({ asOf: Date.now(), quotes }, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } });
}
