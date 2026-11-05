import type { Stock } from "@/lib/market";
import { executeTrade } from "@/lib/simulator";
import type { GameState } from "@/lib/game-engine";
import { MARKET_CLOSE_MINUTE, MARKET_OPEN_MINUTE, MINUTES_PER_DAY } from "@/lib/market-hours";

export type MarketSpeed = "live" | "fast" | "turbo" | "paused";

export type QueuedOrderStatus =
  | "pending"
  | "filled"
  | "cancelled"
  | "expired"
  | "insufficient_funds";

export type QueuedOrder = {
  id: string;
  ticker: string;
  action: "buy" | "sell";
  shares: number;
  targetPrice: number;
  createdAtDay: number;
  createdAtMinute: number;
  status: QueuedOrderStatus;
  filledPrice?: number;
  filledDay?: number;
  filledMinute?: number;
};

export type MarketClock = {
  currentTime: number;
  marketSpeed: MarketSpeed;
  lastProcessedTick: number;
};

export type SipFrequency = "daily" | "weekly" | "monthly";

export type Sip = {
  id: string;
  ticker: string;
  amount: number;
  frequency: SipFrequency;
  nextExecutionTick: number;
  status: "active" | "paused" | "cancelled";
  lastExecutionTick?: number;
  failureReason?: string;
};

export type FinancialPeriod = "quarterly" | "yearly";

export type FinancialStatement = {
  ticker: string;
  period: FinancialPeriod;
  label: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  margin: number;
};

export type WatchlistAction =
  | { type: "add"; ticker: string }
  | { type: "remove"; ticker: string }
  | { type: "toggle"; ticker: string };

const object = (value: unknown): Record<string, any> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};

const number = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export { MARKET_CLOSE_MINUTE, MINUTES_PER_DAY };
/** Simulated minutes advanced per tick step while the market is closed (overnight fast-forward). */
export const OVERNIGHT_STEP_MINUTES = 60;

/** Monotonic simulated-minute counter across the full 24h day. Day 1 at the opening bell is tick 0. */
export function absoluteMarketTick(day: number, minute: number): number {
  return (Math.max(1, day) - 1) * MINUTES_PER_DAY + minute - MARKET_OPEN_MINUTE;
}

/**
 * Minutes the clock should advance on the next tick step. One minute while the market is
 * open; while closed, fast-forward in OVERNIGHT_STEP_MINUTES chunks that land exactly on
 * midnight (day rollover) and on the opening bell.
 */
export function clockStepMinutes(minute: number): number {
  if (minute >= MARKET_OPEN_MINUTE && minute < MARKET_CLOSE_MINUTE) return 1;
  const nextBoundary = minute >= MARKET_CLOSE_MINUTE ? MINUTES_PER_DAY : MARKET_OPEN_MINUTE;
  return Math.max(1, Math.min(OVERNIGHT_STEP_MINUTES, nextBoundary - minute));
}

export function createMarketClock(day = 1, minute = MARKET_OPEN_MINUTE): MarketClock {
  const tick = absoluteMarketTick(day, minute);
  return {
    currentTime: tick,
    marketSpeed: "live",
    lastProcessedTick: tick,
  };
}

export function isMarketOpen(state: GameState): boolean {
  const minute = state.market.minute;
  return minute >= MARKET_OPEN_MINUTE && minute < MARKET_CLOSE_MINUTE;
}

export type ApplyStockTradeResult =
  | { ok: true; state: GameState; quantity: number; executionPrice: number; fee: number }
  | { ok: false; state: GameState; reason: string };

/**
 * Single source of truth for stock fills. Routes through simulator.executeTrade so every
 * fill (manual, queued, SIP) pays the same spread and fee and updates cash, holdings,
 * realizedPnl, trades, holdSince and activity identically. Does not mutate `state`.
 */
export function applyStockTrade(
  state: GameState,
  stock: Stock,
  side: "buy" | "sell",
  quantity: number,
  activityType: string = side
): ApplyStockTradeResult {
  const result = executeTrade(
    { cash: state.cash, holdings: state.holdings, realizedPnl: state.realizedPnl, trades: state.trades },
    stock,
    side,
    quantity
  );
  if (!result.ok) return { ok: false, state, reason: result.reason };

  const holdSince = { ...state.holdSince };
  if (side === "buy" && !state.holdings[stock.ticker]) holdSince[stock.ticker] = state.market.day;
  if (side === "sell" && !result.portfolio.holdings[stock.ticker]) delete holdSince[stock.ticker];

  return {
    ok: true,
    quantity: result.quantity,
    executionPrice: result.executionPrice,
    fee: result.fee,
    state: {
      ...state,
      cash: result.portfolio.cash,
      holdings: result.portfolio.holdings,
      realizedPnl: result.portfolio.realizedPnl,
      trades: result.portfolio.trades,
      holdSince,
      activity: [
        {
          type: activityType,
          ticker: stock.ticker,
          qty: result.quantity,
          price: result.executionPrice,
          fee: result.fee,
          amount: result.executionPrice * result.quantity + (side === "buy" ? result.fee : -result.fee),
          day: state.market.day,
        },
        ...state.activity,
      ].slice(0, 100),
    },
  };
}

export type EnqueueOrderInput = {
  ticker: string;
  action: "buy" | "sell";
  shares: number;
  targetPrice: number;
};

export function enqueueOrder(state: GameState, input: EnqueueOrderInput): GameState {
  const ticker = input.ticker.trim().toUpperCase();
  if (!ticker || !(input.shares > 0) || !(input.targetPrice > 0)) return state;

  const order: QueuedOrder = {
    id: `queued-${state.market.day}-${state.market.minute}-${state.queuedOrders.length}`,
    ticker,
    action: input.action,
    shares: input.shares,
    targetPrice: input.targetPrice,
    createdAtDay: state.market.day,
    createdAtMinute: state.market.minute,
    status: "pending",
  };

  return { ...state, queuedOrders: [...state.queuedOrders, order] };
}

export function updateWatchlist(state: GameState, action: WatchlistAction): GameState {
  const ticker = action.ticker.trim().toUpperCase();
  if (!ticker) return state;

  const current = new Set(state.watchlist);
  const shouldRemove =
    action.type === "remove" ||
    (action.type === "toggle" && current.has(ticker));

  if (shouldRemove) {
    current.delete(ticker);
  } else {
    current.add(ticker);
  }

  return { ...state, watchlist: [...current] };
}

export function hydrateTradingAutomation(
  source: unknown,
  state: GameState
): Pick<GameState, "clock" | "queuedOrders" | "sips"> {
  const raw = object(source);
  const rawClock = object(raw.clock);
  const fallbackClock = createMarketClock(
    state.market.day,
    state.market.minute
  );

  const clock: MarketClock = rawClock.currentTime !== undefined
    ? {
        currentTime: number(rawClock.currentTime, fallbackClock.currentTime),
        marketSpeed: ["live", "fast", "turbo", "paused"].includes(rawClock.marketSpeed)
          ? rawClock.marketSpeed
          : "live",
        lastProcessedTick: number(
          rawClock.lastProcessedTick,
          fallbackClock.lastProcessedTick
        ),
      }
    : fallbackClock;

  const queuedOrders: QueuedOrder[] = Array.isArray(raw.queuedOrders)
    ? raw.queuedOrders
        .map((item: unknown, index: number): QueuedOrder | null => {
          const order = object(item);
          const ticker = String(order.ticker ?? "").trim().toUpperCase();
          const action = order.action === "sell" ? "sell" : "buy";
          const shares = number(order.shares);
          const targetPrice = number(order.targetPrice);

          if (!ticker || shares <= 0 || targetPrice <= 0) return null;

          return {
            id: String(order.id ?? `queued-${index}`),
            ticker,
            action,
            shares,
            targetPrice,
            createdAtDay: number(order.createdAtDay, state.market.day),
            createdAtMinute: number(
              order.createdAtMinute,
              state.market.minute
            ),
            status: [
              "pending",
              "filled",
              "cancelled",
              "expired",
              "insufficient_funds",
            ].includes(order.status)
              ? order.status
              : "pending",
            filledPrice: order.filledPrice === undefined ? undefined : number(order.filledPrice),
            filledDay: order.filledDay === undefined ? undefined : number(order.filledDay),
            filledMinute:
              order.filledMinute === undefined ? undefined : number(order.filledMinute),
          };
        })
        .filter((order): order is QueuedOrder => order !== null)
    : [];

  const sips: Sip[] = Array.isArray(raw.sips)
    ? raw.sips
        .map((item: unknown, index: number): Sip | null => {
          const sip = object(item);
          const ticker = String(sip.ticker ?? "").trim().toUpperCase();
          const amount = number(sip.amount);
          const frequency = ["daily", "weekly", "monthly"].includes(sip.frequency)
            ? sip.frequency
            : "monthly";

          if (!ticker || amount <= 0) return null;

          return {
            id: String(sip.id ?? `sip-${index}`),
            ticker,
            amount,
            frequency,
            nextExecutionTick: number(
              sip.nextExecutionTick,
              absoluteMarketTick(state.market.day, state.market.minute)
            ),
            status: ["active", "paused", "cancelled"].includes(sip.status)
              ? sip.status
              : "active",
            lastExecutionTick:
              sip.lastExecutionTick === undefined
                ? undefined
                : number(sip.lastExecutionTick),
            failureReason:
              sip.failureReason === undefined ? undefined : String(sip.failureReason),
          };
        })
        .filter((sip): sip is Sip => sip !== null)
    : [];

  return { clock, queuedOrders, sips };
}

export type ProcessQueuedOrdersResult = {
  state: GameState;
  filled: QueuedOrder[];
  rejected: QueuedOrder[];
};

export function processQueuedOrders(
  state: GameState,
  stocks: Stock[]
): ProcessQueuedOrdersResult {
  const clock = state.clock ?? createMarketClock(state.market.day, state.market.minute);
  const currentTick = absoluteMarketTick(state.market.day, state.market.minute);

  if (clock.marketSpeed === "paused") {
    return {
      state: { ...state, clock: { ...clock, currentTime: currentTick } },
      filled: [],
      rejected: [],
    };
  }

  const marketJustOpened =
    currentTick > clock.lastProcessedTick &&
    state.market.minute === MARKET_OPEN_MINUTE;

  if (!marketJustOpened) {
    return {
      state: {
        ...state,
        clock: { ...clock, currentTime: currentTick, lastProcessedTick: currentTick },
      },
      filled: [],
      rejected: [],
    };
  }

  const byTicker = new Map(stocks.map((stock) => [stock.ticker, stock]));
  let working: GameState = state;
  const filled: QueuedOrder[] = [];
  const rejected: QueuedOrder[] = [];

  const queuedOrders = state.queuedOrders.map((order) => {
    if (order.status !== "pending") return order;

    const stock = byTicker.get(order.ticker);

    if (!stock || stock.price <= 0) {
      const expired: QueuedOrder = { ...order, status: "expired" };
      rejected.push(expired);
      return expired;
    }

    const executable =
      order.action === "buy" ? stock.price <= order.targetPrice : stock.price >= order.targetPrice;

    if (!executable) return order;

    const fill = applyStockTrade(
      working,
      stock,
      order.action,
      order.shares,
      order.action === "buy" ? "queued-buy" : "queued-sell"
    );

    if (!fill.ok) {
      const rejectedOrder: QueuedOrder = {
        ...order,
        status: order.action === "buy" ? "insufficient_funds" : "expired",
      };
      rejected.push(rejectedOrder);
      return rejectedOrder;
    }

    working = fill.state;
    const executed: QueuedOrder = {
      ...order,
      status: "filled",
      filledPrice: fill.executionPrice,
      filledDay: state.market.day,
      filledMinute: state.market.minute,
    };

    filled.push(executed);
    return executed;
  });

  return {
    state: {
      ...working,
      queuedOrders,
      clock: { ...clock, currentTime: currentTick, lastProcessedTick: currentTick },
    },
    filled,
    rejected,
  };
}

const SIP_INTERVAL_TICKS: Record<SipFrequency, number> = {
  daily: MINUTES_PER_DAY,
  weekly: MINUTES_PER_DAY * 7,
  monthly: MINUTES_PER_DAY * 30,
};

export function nextSipTick(currentTick: number, frequency: SipFrequency): number {
  return currentTick + SIP_INTERVAL_TICKS[frequency];
}

export type ProcessSipsResult = {
  state: GameState;
  executed: Array<{
    sip: Sip;
    ticker: string;
    shares: number;
    price: number;
    amount: number;
  }>;
  paused: Sip[];
};

export function processSips(state: GameState, stocks: Stock[]): ProcessSipsResult {
  // SIPs only execute during the trading session; anything due overnight runs at the open.
  if (!isMarketOpen(state)) return { state, executed: [], paused: [] };

  const currentTick = absoluteMarketTick(state.market.day, state.market.minute);
  const byTicker = new Map(stocks.map((stock) => [stock.ticker, stock]));

  let working: GameState = state;
  const executed: ProcessSipsResult["executed"] = [];
  const paused: Sip[] = [];

  const sips = state.sips.map((sip) => {
    if (sip.status !== "active" || sip.nextExecutionTick > currentTick) return sip;

    const stock = byTicker.get(sip.ticker);

    if (!stock || stock.price <= 0) {
      const pausedSip: Sip = { ...sip, status: "paused", failureReason: "Market price unavailable." };
      paused.push(pausedSip);
      return pausedSip;
    }

    // Same sizing as a manual "Dollars" order: shares = amount / market price, then spread + fee.
    const fill = applyStockTrade(working, stock, "buy", sip.amount / stock.price, "sip-buy");

    if (!fill.ok) {
      const pausedSip: Sip = { ...sip, status: "paused", failureReason: fill.reason };
      paused.push(pausedSip);
      return pausedSip;
    }

    working = fill.state;
    const updatedSip: Sip = {
      ...sip,
      lastExecutionTick: currentTick,
      nextExecutionTick: nextSipTick(currentTick, sip.frequency),
      failureReason: undefined,
    };

    executed.push({
      sip: updatedSip,
      ticker: sip.ticker,
      shares: fill.quantity,
      price: fill.executionPrice,
      amount: fill.executionPrice * fill.quantity + fill.fee,
    });

    return updatedSip;
  });

  return { state: { ...working, sips }, executed, paused };
}

export function generateFinancials(
  ticker: string,
  marketCap: number,
  period: FinancialPeriod = "quarterly"
): FinancialStatement[] {
  const normalizedTicker = ticker.trim().toUpperCase();
  let randomState = hashTicker(normalizedTicker);

  const random = () => {
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    return randomState / 4294967296;
  };

  const periodCount = period === "quarterly" ? 12 : 3;
  const annualRevenueBase = Math.max(
    1_000_000,
    marketCap * (0.08 + random() * 0.22)
  );
  const periodRevenueBase = period === "quarterly" ? annualRevenueBase / 4 : annualRevenueBase;
  const growth = period === "quarterly" ? 0.015 + random() * 0.06 : 0.08 + random() * 0.22;
  const expenseRatio = period === "quarterly" ? 0.58 + random() * 0.24 : 0.6 + random() * 0.22;

  return Array.from({ length: periodCount }, (_, index) => {
    const label =
      period === "quarterly"
        ? `Q${(index % 4) + 1} ${Math.floor(index / 4) + 1}`
        : `Year ${index + 1}`;

    const seasonal =
      period === "quarterly" ? 1 + Math.sin((index / 4) * Math.PI * 2) * 0.06 : 1;
    const revenue = periodRevenueBase * Math.pow(1 + growth, index) * seasonal;
    const expenses = revenue * expenseRatio;
    const netProfit = revenue - expenses;

    return {
      ticker: normalizedTicker,
      period,
      label,
      revenue: roundCurrency(revenue),
      expenses: roundCurrency(expenses),
      netProfit: roundCurrency(netProfit),
      margin: revenue > 0 ? netProfit / revenue : 0,
    };
  });
}

function hashTicker(ticker: string): number {
  let hash = 2166136261;

  for (let index = 0; index < ticker.length; index++) {
    hash ^= ticker.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
