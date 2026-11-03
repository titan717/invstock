export type CurrencyCode = "USD" | "INR" | "EUR" | "GBP" | "AED" | "JPY";
export type Difficulty = "easy" | "normal" | "hard" | "expert";

export const CURRENCIES: { code: CurrencyCode; label: string; locale: string }[] = [
  { code: "USD", label: "US Dollar (USD)", locale: "en-US" },
  { code: "INR", label: "Indian Rupee (INR)", locale: "en-IN" },
  { code: "EUR", label: "Euro (EUR)", locale: "de-DE" },
  { code: "GBP", label: "British Pound (GBP)", locale: "en-GB" },
  { code: "AED", label: "UAE Dirham (AED)", locale: "en-AE" },
  { code: "JPY", label: "Japanese Yen (JPY)", locale: "ja-JP" },
];

// Fixed simulator display rates, not live foreign-exchange quotes. All game values remain USD.
export const SIMULATOR_FX_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 88.5,
  EUR: 0.86,
  GBP: 0.75,
  AED: 3.6725,
  JPY: 154.5,
};

export function convertFromUsd(amount: number, currency: CurrencyCode): number {
  return amount * SIMULATOR_FX_RATES[currency];
}

export function convertToUsd(amount: number, currency: CurrencyCode): number {
  return amount / SIMULATOR_FX_RATES[currency];
}

export function formatMoney(amountUsd: number, currency: CurrencyCode = "USD"): string {
  const metadata = CURRENCIES.find(item => item.code === currency) ?? CURRENCIES[0];
  return new Intl.NumberFormat(metadata.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(convertFromUsd(amountUsd, currency));
}

export function formatCompactMoney(amountUsd: number, currency: CurrencyCode = "USD"): string {
  const metadata = CURRENCIES.find(item => item.code === currency) ?? CURRENCIES[0];
  const amount = convertFromUsd(amountUsd, currency);
  const absolute = Math.abs(amount);
  const divisor = absolute >= 1e12 ? 1e12 : absolute >= 1e9 ? 1e9 : absolute >= 1e6 ? 1e6 : absolute >= 1e3 ? 1e3 : 1;
  const suffix = divisor === 1e12 ? "T" : divisor === 1e9 ? "B" : divisor === 1e6 ? "M" : divisor === 1e3 ? "K" : "";
  if (!suffix) return formatMoney(amountUsd, currency);
  const currencyPrefix = new Intl.NumberFormat(metadata.locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).formatToParts(0).filter(part => part.type !== "integer" && part.type !== "group" && part.type !== "decimal" && part.type !== "fraction").map(part => part.value).join("");
  const compact = new Intl.NumberFormat("en", { maximumSignificantDigits: 3 }).format(amount / divisor);
  return `${currencyPrefix}${compact}${suffix}`;
}
