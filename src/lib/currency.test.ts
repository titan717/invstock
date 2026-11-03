import { describe, expect, it } from "vitest";
import { CURRENCIES, formatCompactMoney, formatMoney, convertFromUsd, convertToUsd } from "@/lib/currency";

describe("display currency utilities", () => {
  it("formats large values compactly without changing their underlying value", () => {
    expect(formatCompactMoney(convertToUsd(44000, "INR"), "INR")).toContain("44K");
    expect(formatCompactMoney(1250000, "USD")).toContain("1.25M");
    expect(formatCompactMoney(2400000000, "USD")).toContain("2.4B");
  });

  it("formats detailed values with currency precision", () => {
    expect(formatMoney(1250.5, "USD")).toContain("1,250.50");
    expect(formatMoney(1250.5, "INR")).toContain("669.25");
  });

  it("converts to and from the USD game base without mutating the amount", () => {
    const displayed = convertFromUsd(100, "INR");
    expect(displayed).toBeGreaterThan(0);
    expect(convertToUsd(displayed, "INR")).toBeCloseTo(100, 8);
    expect(CURRENCIES.map(currency => currency.code)).toEqual(["USD", "INR", "EUR", "GBP", "AED", "JPY"]);
  });
});
