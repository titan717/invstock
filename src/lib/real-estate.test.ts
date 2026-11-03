import { describe, expect, it } from "vitest";
import {
  PROPERTY_CATALOG,
  calculatePropertyEconomics,
  purchaseProperty,
  simulatePropertyMinutes,
  upgradeProperty,
  sellProperty,
} from "@/lib/real-estate";

describe("global real estate market", () => {
  it("offers multiple property classes and global city markets", () => {
    expect(PROPERTY_CATALOG.map(item => item.type)).toContain("apartment");
    expect(PROPERTY_CATALOG.map(item => item.type)).toContain("warehouse");
  });

  it("purchases property using shared cash and applies the selected city's price index", () => {
    const bengaluru = purchaseProperty(100000, "studio-apartment", "Bengaluru", "property-1");
    const london = purchaseProperty(100000, "studio-apartment", "London", "property-2");
    expect(bengaluru.ok).toBe(true);
    expect(london.ok).toBe(true);
    if (!bengaluru.ok || !london.ok) return;
    expect(london.property.value).toBeGreaterThan(bengaluru.property.value);
    expect(london.cash).toBeLessThan(bengaluru.cash);
  });

  it("calculates rental income after occupancy and maintenance costs", () => {
    const purchase = purchaseProperty(100000, "studio-apartment", "Bengaluru", "property-1");
    if (!purchase.ok) throw new Error("fixture purchase failed");
    const economics = calculatePropertyEconomics(purchase.property);
    expect(economics.monthlyGrossRent).toBeGreaterThan(0);
    expect(economics.monthlyMaintenance).toBeGreaterThan(0);
    expect(economics.monthlyNetRent).toBe(economics.monthlyGrossRent - economics.monthlyMaintenance);
  });

  it("upgrades and sells a property while returning shared cash", () => {
    const purchase = purchaseProperty(100000, "studio-apartment", "Bengaluru", "property-1");
    if (!purchase.ok) throw new Error("fixture purchase failed");
    const upgraded = upgradeProperty(purchase.property, purchase.cash);
    expect(upgraded.ok).toBe(true);
    if (!upgraded.ok) return;
    expect(upgraded.property.level).toBe(2);
    const sold = sellProperty(upgraded.property);
    expect(sold.proceeds).toBeGreaterThan(0);
    expect(sold.proceeds).toBeLessThan(upgraded.property.value);
  });

  it("accrues rent and property appreciation over simulated time", () => {
    const purchase = purchaseProperty(100000, "studio-apartment", "Bengaluru", "property-1");
    if (!purchase.ok) throw new Error("fixture purchase failed");
    const result = simulatePropertyMinutes(purchase.property, 390);
    expect(result.netIncome).toBeGreaterThan(0);
    expect(result.property.value).toBeGreaterThan(purchase.property.value);
  });
});
