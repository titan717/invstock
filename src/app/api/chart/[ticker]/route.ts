import { NextResponse } from "next/server";
import { exchangeSymbol } from "@/lib/live-quotes";

export const dynamic = "force-dynamic";

const RANGES: Record<string, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" }, "1W": { range: "5d", interval: "30m" }, "1M": { range: "1mo", interval: "1d" }, "3M": { range: "3mo", interval: "1d" },
  "6M": { range: "6mo", interval: "1d" }, "1Y": { range: "1y", interval: "1d" }, "5Y": { range: "5y", interval: "1wk" }, "All": { range: "max", interval: "1mo" },
};

export async function GET(request: Request, context: { params: Promise<{ ticker: string }> }) {
  const ticker = (await context.params).ticker.toUpperCase();
  const symbol = /^[A-Z.\-]{1,10}$/.test(ticker) ? exchangeSymbol(ticker) : null;
  const spec = RANGES[new URL(request.url).searchParams.get("range") ?? "1D"] ?? RANGES["1D"];
  if (!symbol) return NextResponse.json({ error: "No exchange listing for this ticker." }, { status: 404 });
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${spec.range}&interval=${spec.interval}`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; STONKS/1.0)" }, cache: "no-store" });
    const payload = response.ok ? await response.json() : null;
    const result = payload?.chart?.result?.[0];
    const times: number[] = result?.timestamp ?? [];
    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
    const points = times.map((t, index) => ({ t, v: closes[index] })).filter((point): point is { t: number; v: number } => typeof point.v === "number" && Number.isFinite(point.v)).map(point => ({ t: point.t, v: Number(point.v.toFixed(2)) }));
    if (!points.length) return NextResponse.json({ error: "Chart unavailable." }, { status: 502 });
    return NextResponse.json({ ticker, points }, { headers: { "Cache-Control": `public, s-maxage=${spec.range === "1d" ? 30 : 600}, stale-while-revalidate=600` } });
  } catch {
    return NextResponse.json({ error: "Chart unavailable." }, { status: 502 });
  }
}
