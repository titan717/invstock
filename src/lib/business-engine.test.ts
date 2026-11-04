import { describe, expect, it } from "vitest";
import {
  BUSINESS_CATALOG,
  calculateBusinessEconomics,
  fireEmployee,
  hireEmployee,
  purchaseBusiness,
  promoteEmployee,
  setBusinessStrategy,
  simulateBusinessMinutes,
  upgradeBusiness,
} from "@/lib/business-engine";

describe("business empire management", () => {
  it("offers all four initial industries and purchases a company with shared cash", () => {
    expect(BUSINESS_CATALOG.map(item => item.industry)).toEqual(["retail", "construction", "banking", "logistics"]);
    const purchase = purchaseBusiness(25000, "retail-shop", "Bengaluru", "biz-1");
    expect(purchase.ok).toBe(true);
    if (!purchase.ok) return;
    expect(purchase.cash).toBe(15000);
    expect(purchase.business.city).toBe("Bengaluru");
    expect(purchase.business.employees).toHaveLength(0);
  });

  it("applies permanent legacy discounts to acquisition costs without changing asset value", () => {
    const standard = purchaseBusiness(25000, "retail-shop", "Bengaluru", "standard");
    const discounted = purchaseBusiness(25000, "retail-shop", "Bengaluru", "discounted", 0.9);
    expect(standard.ok && discounted.ok).toBe(true);
    if (!standard.ok || !discounted.ok) return;
    expect(discounted.cash).toBeGreaterThan(standard.cash??0);
    expect(discounted.business.value).toBe(standard.business.value);
  });

  it("rejects unaffordable purchases without changing cash", () => {
    const purchase = purchaseBusiness(100, "retail-shop", "Bengaluru", "biz-1");
    expect(purchase.ok).toBe(false);
    if (purchase.ok) return;
    expect(purchase.cash).toBe(100);
  });

  it("lets the owner hire and fire staff with role-based payroll", () => {
    const purchase = purchaseBusiness(25000, "retail-shop", "Bengaluru", "biz-1");
    if (!purchase.ok) throw new Error("fixture purchase failed");
    const hired = hireEmployee(purchase.business, "worker", "emp-1", "Asha");
    expect(hired.ok).toBe(true);
    if (!hired.ok) return;
    expect(hired.business.employees[0].name).toBe("Asha");
    expect(hired.business.employees[0].salaryPerDay).toBeGreaterThan(0);
    const promoted = promoteEmployee(hired.business, "emp-1");
    expect(promoted.ok).toBe(true);
    if (promoted.ok) expect(promoted.business.employees[0].role).toBe("specialist");
    const fired = fireEmployee(hired.business, "emp-1");
    expect(fired.ok).toBe(true);
    if (fired.ok) expect(fired.business.employees).toHaveLength(0);
  });

  it("changes pricing strategy and calculates revenue, payroll and operating profit", () => {
    const purchase = purchaseBusiness(25000, "retail-shop", "Bengaluru", "biz-1");
    if (!purchase.ok) throw new Error("fixture purchase failed");
    const hired = hireEmployee(purchase.business, "manager", "emp-1", "Asha");
    if (!hired.ok) throw new Error("fixture hire failed");
    const premium = setBusinessStrategy(hired.business, "premium");
    const economics = calculateBusinessEconomics(premium, "normal");
    expect(economics.dailyRevenue).toBeGreaterThan(0);
    expect(economics.dailyPayroll).toBeGreaterThan(0);
    expect(economics.dailyProfit).toBe(economics.dailyRevenue - economics.dailyOperatingCosts - economics.dailyPayroll);
  });

  it("upgrades a business only when the shared cash balance covers the cost", () => {
    const purchase = purchaseBusiness(25000, "retail-shop", "Bengaluru", "biz-1");
    if (!purchase.ok) throw new Error("fixture purchase failed");
    expect(upgradeBusiness(purchase.business, 100).ok).toBe(false);
    const upgraded = upgradeBusiness(purchase.business, 10000);
    expect(upgraded.ok).toBe(true);
    if (!upgraded.ok) return;
    expect(upgraded.cash).toBeLessThan(10000);
    expect(upgraded.business.level).toBe(2);
  });

  it("accrues passive profit over simulated minutes and clamps invalid durations", () => {
    const purchase = purchaseBusiness(25000, "retail-shop", "Bengaluru", "biz-1");
    if (!purchase.ok) throw new Error("fixture purchase failed");
    const result = simulateBusinessMinutes(purchase.business, 60, "normal");
    expect(result.profit).toBeGreaterThan(0);
    expect(result.business.totalProfit).toBeCloseTo(result.profit);
    const invalid = simulateBusinessMinutes(purchase.business, -10, "normal");
    expect(invalid.profit).toBe(0);
  });
});

