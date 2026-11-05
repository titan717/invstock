import { describe, expect, it } from "vitest";
import { computeTechnicals, rsi, sma } from "@/lib/technicals";

const rising = Array.from({ length: 60 }, (_, i) => 100 + i + Math.sin(i) * 0.5);
const falling = rising.map(value => 300 - value);

describe("technicals", () => {
  it("computes moving averages and RSI bounds", () => {
    expect(sma([1, 2, 3, 4], 2)).toBe(3.5);
    expect(sma([1], 5)).toBeNull();
    const value = rsi(rising)!;
    expect(value).toBeGreaterThan(70);
    expect(value).toBeLessThanOrEqual(100);
  });

  it("leans bullish for uptrends and bearish for downtrends", () => {
    const up = computeTechnicals(rising), down = computeTechnicals(falling);
    expect(up.bullish).toBeGreaterThan(up.bearish);
    expect(down.bearish).toBeGreaterThan(down.bullish);
    expect(up.indicators.length).toBe(up.bullish + up.neutral + up.bearish);
  });
});
