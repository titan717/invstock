import { describe, expect, it } from "vitest";
import {
  createGameState,
  hydrateGameState,
  reviewFinancialScrutinyAction,
  hireComplianceOfficerAction,
  resolveFinancialInvestigationAction,
  purchaseLegacyUpgradeAction,
  rebirthGameAction,
} from "@/lib/game-engine";

describe("compliance and rebirth game integration", () => {
  it("migrates version-three saves without losing portfolio or settings", () => {
    const old = { ...createGameState(), version: 3, cash: 12000, holdings: { MSFT: { quantity: 2, averageCost: 400 } }, settings: { ...createGameState().settings, currency: "INR" } };
    const restored = hydrateGameState(old, []);
    expect(restored.version).toBe(4);
    expect(restored.cash).toBe(12000);
    expect(restored.holdings.MSFT.quantity).toBe(2);
    expect(restored.settings.currency).toBe("INR");
    expect(restored.scrutiny.level).toBe("low");
    expect(restored.legacy.rebirthCount).toBe(0);
  });


  it("does not increase scrutiny when the same financial activity is reviewed twice", () => {
    const state = createGameState();
    state.activity.unshift({ type: "transfer", amount: 250000, day: 1 });
    const signals = {
      largeMovementCount: 1, rapidTradeCount: 0, highRiskBusinessCount: 0,
      unexplainedWealthRatio: 0.2, unpaidTax: 0, recordsQuality: 0.8,
    };
    reviewFinancialScrutinyAction(state, signals);
    const score = state.scrutiny.score;
    reviewFinancialScrutinyAction(state, signals);
    expect(state.scrutiny.score).toBe(score);
  });

  it("opens a review from high-risk financial signals and supports resolution", () => {
    const state = createGameState();
    const review = reviewFinancialScrutinyAction(state, {
      largeMovementCount: 4, rapidTradeCount: 9, highRiskBusinessCount: 2,
      unexplainedWealthRatio: 0.6, unpaidTax: 2500, recordsQuality: 0.1,
    });
    expect(review.ok).toBe(true);
    expect(state.scrutiny.investigation?.status).toBe("open");
    const cash = state.cash;
    expect(resolveFinancialInvestigationAction(state, "pay-fine").ok).toBe(true);
    expect(state.cash).toBeLessThan(cash);
    expect(state.scrutiny.investigation?.status).toBe("fine-paid");
  });

  it("charges for and activates compliance staff", () => {
    const state = createGameState();
    const cash = state.cash;
    expect(hireComplianceOfficerAction(state).ok).toBe(true);
    expect(state.scrutiny.complianceOfficer).toBe(true);
    expect(state.cash).toBe(cash - 5000);
    expect(hireComplianceOfficerAction(state).ok).toBe(false);
  });

  it("resets ordinary assets on rebirth while preserving settings and legacy rewards", () => {
    const state = createGameState();
    state.cash = 12_000_000;
    state.settings.currency = "INR";
    state.settings.difficulty = "hard";
    state.profileName = "Alex";
    state.achievements = ["Landlord", "Millionaire"];
    state.holdings.MSFT = { quantity: 2, averageCost: 400 };
    state.cryptoHoldings.BTC = { quantity: 0.5, averageCost: 50000 };
    state.legacy.points = 10;
    purchaseLegacyUpgradeAction(state, "startingCapital");
    const result = rebirthGameAction(state, []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.cash).toBe(7500);
    expect(result.state.holdings).toEqual({});
    expect(result.state.cryptoHoldings).toEqual({});
    expect(result.state.profileName).toBe("Alex");
    expect(result.state.settings.currency).toBe("INR");
    expect(result.state.settings.difficulty).toBe("hard");
    expect(result.state.legacy.rebirthCount).toBe(1);
    expect(result.state.legacy.permanentAchievements).toContain("Millionaire");
  });
});
