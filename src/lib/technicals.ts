export type Signal = "Bullish" | "Neutral" | "Bearish";
export type Indicator = { name: string; value: number | null; display: string; signal: Signal; description: string };
export type TechnicalSummary = { indicators: Indicator[]; bullish: number; neutral: number; bearish: number; verdict: "Strongly bearish" | "Bearish" | "Neutral" | "Bullish" | "Strongly bullish"; score: number };

const last = (values: number[]) => values[values.length - 1];

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  return values.slice(-period).reduce((sum, value) => sum + value, 0) / period;
}

export function emaSeries(values: number[], period: number): number[] {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out = [values[0]];
  for (let index = 1; index < values.length; index++) out.push(values[index] * k + out[index - 1] * (1 - k));
  return out;
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length <= period) return null;
  let gain = 0, loss = 0;
  for (let index = 1; index <= period; index++) {
    const delta = values[index] - values[index - 1];
    if (delta >= 0) gain += delta; else loss -= delta;
  }
  gain /= period; loss /= period;
  for (let index = period + 1; index < values.length; index++) {
    const delta = values[index] - values[index - 1];
    gain = (gain * (period - 1) + Math.max(0, delta)) / period;
    loss = (loss * (period - 1) + Math.max(0, -delta)) / period;
  }
  if (loss === 0) return gain === 0 ? 50 : 100;
  return 100 - 100 / (1 + gain / loss);
}

export function macd(values: number[]): { macd: number; signal: number; histogram: number } | null {
  if (values.length < 35) return null;
  const fast = emaSeries(values, 12), slow = emaSeries(values, 26);
  const line = fast.map((value, index) => value - slow[index]);
  const signal = emaSeries(line.slice(25), 9);
  const m = last(line), s = last(signal);
  return { macd: m, signal: s, histogram: m - s };
}

export function stochastic(values: number[], period = 14): number | null {
  if (values.length < period) return null;
  const window = values.slice(-period);
  const high = Math.max(...window), low = Math.min(...window);
  return high === low ? 50 : ((last(values) - low) / (high - low)) * 100;
}

export function roc(values: number[], period = 12): number | null {
  if (values.length <= period) return null;
  const base = values[values.length - 1 - period];
  return base ? (last(values) / base - 1) * 100 : null;
}

const fixed = (value: number | null, digits = 2) => (value === null ? "—" : value.toFixed(digits));

/** Classic oscillator and moving-average signals computed from a close-price series. */
export function computeTechnicals(values: number[]): TechnicalSummary {
  const price = values.length ? last(values) : 0;
  const r = rsi(values), m = macd(values), st = stochastic(values), change = roc(values);
  const s20 = sma(values, 20), s50 = sma(values, 50), e20 = values.length >= 20 ? last(emaSeries(values, 20)) : null;
  const versus = (average: number | null): Signal => (average === null ? "Neutral" : price > average * 1.001 ? "Bullish" : price < average * 0.999 ? "Bearish" : "Neutral");
  const indicators: Indicator[] = [
    { name: "RSI (14)", value: r, display: fixed(r), signal: r === null ? "Neutral" : r < 30 ? "Bullish" : r > 70 ? "Bearish" : "Neutral", description: "Below 30 is oversold, above 70 is overbought." },
    { name: "MACD (12, 26, 9)", value: m?.histogram ?? null, display: fixed(m?.macd ?? null), signal: !m ? "Neutral" : m.histogram > 0 ? "Bullish" : m.histogram < 0 ? "Bearish" : "Neutral", description: "MACD above its signal line points to upward momentum." },
    { name: "Stochastic %K (14)", value: st, display: fixed(st), signal: st === null ? "Neutral" : st < 20 ? "Bullish" : st > 80 ? "Bearish" : "Neutral", description: "Where the close sits within the recent high–low range." },
    { name: "Rate of change (12)", value: change, display: change === null ? "—" : `${change.toFixed(2)}%`, signal: change === null ? "Neutral" : change > 0.5 ? "Bullish" : change < -0.5 ? "Bearish" : "Neutral", description: "Percentage move over the last 12 periods." },
    { name: "SMA (20)", value: s20, display: fixed(s20), signal: versus(s20), description: "Price above the average is bullish." },
    { name: "SMA (50)", value: s50, display: fixed(s50), signal: versus(s50), description: "Price above the average is bullish." },
    { name: "EMA (20)", value: e20, display: fixed(e20), signal: versus(e20), description: "Exponential average that reacts faster to recent prices." },
  ];
  const bullish = indicators.filter(item => item.signal === "Bullish").length;
  const bearish = indicators.filter(item => item.signal === "Bearish").length;
  const neutral = indicators.length - bullish - bearish;
  const score = (bullish - bearish) / indicators.length;
  const verdict = score >= 0.5 ? "Strongly bullish" : score >= 0.2 ? "Bullish" : score <= -0.5 ? "Strongly bearish" : score <= -0.2 ? "Bearish" : "Neutral";
  return { indicators, bullish, neutral, bearish, verdict, score };
}
