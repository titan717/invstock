import { describe, expect, it } from "vitest";
import {
  createScrutinyState,
  evaluateFinancialScrutiny,
  resolveInvestigation,
  hireComplianceOfficer,
} from "@/lib/compliance-engine";

describe("financial scrutiny and investigations", () => {
  it("raises scrutiny from explainable risk signals rather than random events", () => {
    const result = evaluateFinancialScrutiny(createScrutinyState(), {
      largeMovementCount: 3, rapidTradeCount: 8, highRiskBusinessCount: 1,
      unexplainedWealthRatio: 0.45, unpaidTax: 1200, recordsQuality: 0.25,
    });
    expect(result.state.score).toBeGreaterThan(60);
    expect(["high", "critical"]).toContain(result.state.level);
    expect(result.reasons.length).toBeGreaterThan(2);
    expect(result.state.investigation).not.toBeNull();
  });

  it("does not open an investigation for normal activity with complete records", () => {
    const result = evaluateFinancialScrutiny(createScrutinyState(), {
      largeMovementCount: 0, rapidTradeCount: 0, highRiskBusinessCount: 0,
      unexplainedWealthRatio: 0, unpaidTax: 0, recordsQuality: 1,
    });
    expect(result.state.level).toBe("low");
    expect(result.state.investigation).toBeNull();
  });

  it("allows good records and a compliance officer to reduce scrutiny", () => {
    const initial = evaluateFinancialScrutiny(createScrutinyState(), {
      largeMovementCount: 2, rapidTradeCount: 4, highRiskBusinessCount: 0,
      unexplainedWealthRatio: 0.2, unpaidTax: 0, recordsQuality: 0.4,
    }).state;
    const staffed = hireComplianceOfficer(initial);
    const improved = evaluateFinancialScrutiny(staffed, {
      largeMovementCount: 0, rapidTradeCount: 0, highRiskBusinessCount: 0,
      unexplainedWealthRatio: 0, unpaidTax: 0, recordsQuality: 1,
    }).state;
    expect(improved.score).toBeLessThan(initial.score);
  });

  it("resolves an investigation through records, payment or a successful challenge", () => {
    const opened = evaluateFinancialScrutiny(createScrutinyState(), {
      largeMovementCount: 4, rapidTradeCount: 9, highRiskBusinessCount: 2,
      unexplainedWealthRatio: 0.6, unpaidTax: 2500, recordsQuality: 0.1,
    }).state;
    expect(opened.investigation).not.toBeNull();
    const submitted = resolveInvestigation(opened, "submit-records");
    expect(submitted.investigation?.status).toBe("cleared");
    const paid = resolveInvestigation(opened, "pay-fine");
    expect(paid.cashPenalty).toBeGreaterThan(0);
    const challenged = resolveInvestigation(opened, "challenge", true);
    expect(challenged.investigation?.status).toBe("dismissed");
  });
});
