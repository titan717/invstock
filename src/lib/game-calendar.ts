/**
 * Maps the simulator's trading-day counter onto a weekday calendar so screens can show
 * dates like "Mon, Jan 12 · 10:27 AM". Day 1 is Monday, Jan 5 2026; weekends are skipped.
 */
const EPOCH = Date.UTC(2026, 0, 5);
const DAY_MS = 86_400_000;

export function tradingDayDate(day: number): Date {
  const index = Math.max(0, Math.floor(day) - 1);
  const weeks = Math.floor(index / 5), weekday = index % 5;
  return new Date(EPOCH + (weeks * 7 + weekday) * DAY_MS);
}

export function clockLabel(minute: number): string {
  const total = ((Math.floor(minute) % 1440) + 1440) % 1440;
  const hours = Math.floor(total / 60), minutes = total % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function gameDateLabel(day: number, minute?: number): string {
  const date = tradingDayDate(day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  return minute === undefined ? date : `${date} · ${clockLabel(minute)}`;
}

export const shortGameDate = (day: number) => tradingDayDate(day).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
