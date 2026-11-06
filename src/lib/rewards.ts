import type { GameState } from "@/lib/game-engine";

/** Seven-day login ladder from the spec (Day 1 $100 … Day 7 $2,000). */
export const DAILY_BONUSES = [100, 200, 300, 500, 750, 1000, 2000];
export const VIDEO_BONUS = 5000;
export const VIDEO_BONUSES_PER_DAY = 24;
/** Free virtual-cash packs. Larger paid packs from the spec are not sold in this build. */
export const CASH_PACKS = [25_000, 100_000];

export type RewardsState = { loginDate: string | null; streak: number; videoDate: string | null; videosUsed: number };
export const createRewards = (): RewardsState => ({ loginDate: null, streak: 0, videoDate: null, videosUsed: 0 });

export function hydrateRewards(value: unknown): RewardsState {
  const source = value && typeof value === "object" ? (value as Partial<RewardsState>) : {};
  const date = (input: unknown) => (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input) ? input : null);
  const count = (input: unknown, max: number) => (typeof input === "number" && Number.isFinite(input) ? Math.max(0, Math.min(max, Math.floor(input))) : 0);
  return { loginDate: date(source.loginDate), streak: count(source.streak, DAILY_BONUSES.length), videoDate: date(source.videoDate), videosUsed: count(source.videosUsed, VIDEO_BONUSES_PER_DAY) };
}

/** Local calendar date (YYYY-MM-DD) — bonuses follow the player's real days, not simulated days. */
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
const previousDate = (date: string) => { const [y, m, d] = date.split("-").map(Number); return localDate(new Date(y, m - 1, d - 1)); };

export type DailyBonusStatus = { claimable: boolean; dayIndex: number; amount: number };
/** Which ladder step is next. A missed day resets the streak to Day 1; after Day 7 the ladder restarts. */
export function dailyBonusStatus(rewards: RewardsState, today = localDate()): DailyBonusStatus {
  if (rewards.loginDate === today) return { claimable: false, dayIndex: Math.max(0, rewards.streak - 1), amount: DAILY_BONUSES[Math.max(0, rewards.streak - 1)] };
  const continuing = rewards.loginDate !== null && rewards.loginDate === previousDate(today) && rewards.streak < DAILY_BONUSES.length;
  const dayIndex = continuing ? rewards.streak : 0;
  return { claimable: true, dayIndex, amount: DAILY_BONUSES[dayIndex] };
}

export type RewardResult = { ok: true; state: GameState; amount: number } | { ok: false; reason: string };

/** Adds virtual cash and counts it as a deposit so returns stay honest. */
function credit(state: GameState, amount: number, type: string): GameState {
  const next = structuredClone(state);
  next.cash += amount;
  next.start += amount;
  if (next.weeklyChallenge.joined) next.weeklyChallenge.startValue += amount;
  next.activity.unshift({ type, amount, day: next.market.day });
  next.activity = next.activity.slice(0, 100);
  return next;
}

export function claimDailyBonus(state: GameState, doubled = false, today = localDate()): RewardResult {
  const status = dailyBonusStatus(state.rewards, today);
  if (!status.claimable) return { ok: false, reason: "Today's bonus is already claimed. Come back tomorrow." };
  const amount = status.amount * (doubled ? 2 : 1);
  const next = credit(state, amount, "login-bonus");
  next.rewards = { ...next.rewards, loginDate: today, streak: status.dayIndex + 1 };
  return { ok: true, state: next, amount };
}

export const videosLeft = (rewards: RewardsState, today = localDate()) => VIDEO_BONUSES_PER_DAY - (rewards.videoDate === today ? rewards.videosUsed : 0);

export function claimVideoBonus(state: GameState, today = localDate()): RewardResult {
  const left = videosLeft(state.rewards, today);
  if (left <= 0) return { ok: false, reason: "No video bonuses left today." };
  const next = credit(state, VIDEO_BONUS, "video-bonus");
  next.rewards = { ...next.rewards, videoDate: today, videosUsed: VIDEO_BONUSES_PER_DAY - left + 1 };
  return { ok: true, state: next, amount: VIDEO_BONUS };
}

export function addVirtualCash(state: GameState, amount: number): RewardResult {
  if (!CASH_PACKS.includes(amount)) return { ok: false, reason: "That cash pack isn't available." };
  return { ok: true, state: credit(state, amount, "virtual-cash"), amount };
}
