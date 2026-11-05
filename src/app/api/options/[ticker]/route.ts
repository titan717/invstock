import { NextResponse } from "next/server";
import { exchangeSymbol } from "@/lib/live-quotes";
import { raw, yahooJson } from "@/lib/server/yahoo";
import type { OptionChain, OptionContract } from "@/lib/company-data";

export const dynamic = "force-dynamic";
type Obj = Record<string, unknown>;

const contract = (item: Obj): OptionContract => ({
  contractSymbol: String(item.contractSymbol ?? ""), strike: raw(item.strike) ?? 0, bid: raw(item.bid) ?? 0, ask: raw(item.ask) ?? 0, last: raw(item.lastPrice) ?? 0,
  change: raw(item.change) ?? 0, percentChange: raw(item.percentChange) ?? 0, volume: raw(item.volume) ?? 0, openInterest: raw(item.openInterest) ?? 0,
  impliedVolatility: raw(item.impliedVolatility) ?? 0, inTheMoney: item.inTheMoney === true, expiration: raw(item.expiration) ?? 0,
});

export async function GET(request: Request, context: { params: Promise<{ ticker: string }> }) {
  const ticker = (await context.params).ticker.toUpperCase();
  const symbol = /^[A-Z.\-]{1,10}$/.test(ticker) ? exchangeSymbol(ticker) : null;
  if (!symbol) return NextResponse.json({ error: "No listed options for this ticker." }, { status: 404 });
  const date = Number(new URL(request.url).searchParams.get("date"));
  try {
    const payload = await yahooJson<{ optionChain?: { result?: Obj[] } }>(`https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}${Number.isFinite(date) && date > 0 ? `?date=${Math.floor(date)}` : ""}`);
    const result = payload.optionChain?.result?.[0];
    if (!result) return NextResponse.json({ error: "Option chain unavailable." }, { status: 502 });
    const options = ((result.options as Obj[] | undefined) ?? [])[0] ?? {};
    const quote = (result.quote as Obj | undefined) ?? {};
    const data: OptionChain = {
      ticker, underlyingPrice: raw(quote.regularMarketPrice) ?? 0,
      expirations: ((result.expirationDates as number[] | undefined) ?? []).filter(Number.isFinite),
      expiration: raw(options.expirationDate) ?? 0,
      calls: ((options.calls as Obj[] | undefined) ?? []).map(contract),
      puts: ((options.puts as Obj[] | undefined) ?? []).map(contract),
    };
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ error: "Option chain unavailable." }, { status: 502 });
  }
}
