import type { Stock } from "@/lib/market";
import { MARKET_OPEN_MINUTE, MARKET_SESSION_MINUTES, type GameState } from "@/lib/game-engine";

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

export function absoluteMarketTick(day: number, minute: number): number {
  return (
    (Math.max(1, day) - 1) * MARKET_SESSION_MINUTES +
    Math.max(0, minute - MARKET_OPEN_MINUTE)
  );
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
  return minute >= MARKET_OPEN_MINUTE && minute < MARKET_OPEN_MINUTE + MARKET_SESSION_MINUTES;
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

  const prices = new Map(stocks.map((stock) => [stock.ticker, stock.price]));
  let cash = state.cash;
  const holdings = { ...state.holdings };
  const filled: QueuedOrder[] = [];
  const rejected: QueuedOrder[] = [];

  const queuedOrders = state.queuedOrders.map((order) => {
    if (order.status !== "pending") return order;

    const price = prices.get(order.ticker);

    if (price === undefined || price <= 0) {
      const expired: QueuedOrder = { ...order, status: "expired" };
      rejected.push(expired);
      return expired;
    }

    const executable =
      order.action === "buy" ? price <= order.targetPrice : price >= order.targetPrice;

    if (!executable) return order;

    if (order.action === "buy") {
      const cost = price * order.shares;

      if (cost > cash) {
        const rejectedOrder: QueuedOrder = {
          ...order,
          status: "insufficient_funds",
        };
        rejected.push(rejectedOrder);
        return rejectedOrder;
      }

      cash -= cost;
      const previous = holdings[order.ticker];
      const previousQuantity = previous?.quantity ?? 0;
      const previousCost = (previous?.averageCost ?? 0) * previousQuantity;

      holdings[order.ticker] = {
        quantity: previousQuantity + order.shares,
        averageCost: (previousCost + cost) / (previousQuantity + order.shares),
      };
    } else {
      const previous = holdings[order.ticker];
      const available = previous?.quantity ?? 0;

      if (available < order.shares) {
        const rejectedOrder: QueuedOrder = { ...order, status: "expired" };
        rejected.push(rejectedOrder);
        return rejectedOrder;
      }

      cash += price * order.shares;
      const remaining = available - order.shares;

      if (remaining <= 0) {
        delete holdings[order.ticker];
      } else {
        holdings[order.ticker] = {
          quantity: remaining,
          averageCost: previous.averageCost,
        };
      }
    }

    const executed: QueuedOrder = {
      ...order,
      status: "filled",
      filledPrice: price,
      filledDay: state.market.day,
      filledMinute: state.market.minute,
    };

    filled.push(executed);
    return executed;
  });

  const activity = [
    ...filled.map((order) => ({
      type: order.action === "buy" ? "queued-buy" : "queued-sell",
      ticker: order.ticker,
      qty: order.shares,
      price: order.filledPrice,
      amount: (order.filledPrice ?? 0) * order.shares,
      day: state.market.day,
    })),
    ...state.activity,
  ].slice(0, 100);

  return {
    state: {
      ...state,
      cash,
      holdings,
      queuedOrders,
      activity,
      clock: { ...clock, currentTime: currentTick, lastProcessedTick: currentTick },
    },
    filled,
    rejected,
  };
}

const SIP_INTERVAL_TICKS: Record<SipFrequency, number> = {
  daily: MARKET_SESSION_MINUTES,
  weekly: MARKET_SESSION_MINUTES * 5,
  monthly: MARKET_SESSION_MINUTES * 21,
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
  const currentTick = absoluteMarketTick(state.market.day, state.market.minute);
  const prices = new Map(stocks.map((stock) => [stock.ticker, stock.price]));

  let cash = state.cash;
  const holdings = { ...state.holdings };
  const executed: ProcessSipsResult["executed"] = [];
  const paused: Sip[] = [];

  const sips = state.sips.map((sip) => {
    if (sip.status !== "active" || sip.nextExecutionTick > currentTick) return sip;

    const price = prices.get(sip.ticker);

    if (price === undefined || price <= 0) {
      const pausedSip: Sip = {
        ...sip,
        status: "paused",
        failureReason: "Market price unavailable.",
      };
      paused.push(pausedSip);
      return pausedSip;
    }

    if (sip.amount > cash) {
      const pausedSip: Sip = {
        ...sip,
        status: "paused",
        failureReason: "Insufficient cash.",
      };
      paused.push(pausedSip);
      return pausedSip;
    }

    const shares = sip.amount / price;
    const cost = shares * price;
    cash -= cost;

    const previous = holdings[sip.ticker];
    const previousQuantity = previous?.quantity ?? 0;
    const previousCost = (previous?.averageCost ?? 0) * previousQuantity;

    holdings[sip.ticker] = {
      quantity: previousQuantity + shares,
      averageCost: (previousCost + cost) / (previousQuantity + shares),
    };

    const updatedSip: Sip = {
      ...sip,
      lastExecutionTick: currentTick,
      nextExecutionTick: nextSipTick(currentTick, sip.frequency),
      failureReason: undefined,
    };

    executed.push({
      sip: updatedSip,
      ticker: sip.ticker,
      shares,
      price,
      amount: cost,
    });

    return updatedSip;
  });

  const activity = [
    ...executed.map((item) => ({
      type: "sip-buy",
      ticker: item.ticker,
      qty: item.shares,
      price: item.price,
      amount: item.amount,
      day: state.market.day,
    })),
    ...state.activity,
  ].slice(0, 100);

  return {
    state: { ...state, cash, holdings, sips, activity },
    executed,
    paused,
  };
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
