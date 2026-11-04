import { describe, expect, it } from "vitest";
import {
  REBIRTH_UNLOCK_NET_WORTH,
  createLegacyState,
  calculateLegacyPoints,
  canRebirth,
  previewRebirth,
  purchaseLegacyUpgrade,
} from "@/lib/rebirth-engine";

describe("rebirth and permanent legacy progression", () => {
  it("unlocks rebirth at the published net-worth milestone", () => {
    expect(canRebirth(REBIRTH_UNLOCK_NET_WORTH - 1)).toBe(false);
    expect(canRebirth(REBIRTH_UNLOCK_NET_WORTH)).toBe(true);
  });

  it("awards more legacy points for greater wealth and completed achievements", () => {
    const early = calculateLegacyPoints(10_000_000, 2);
    const advanced = calculateLegacyPoints(100_000_000, 12);
    expect(advanced).toBeGreaterThan(early);
  });

  it("previews the reset while preserving profile, settings and permanent achievements", () => {
    const legacy = createLegacyState();
    const preview = previewRebirth({
      profileName: "Alex", netWorth: 25_000_000, achievements: ["Landlord", "Millionaire"],
      settings: { currency: "INR", difficulty: "hard" },
      stockPositions: 4, cryptoPositions: 2, businesses: 3, properties: 5,
    }, legacy);
    expect(preview.reset.stockPositions).toBe(0);
    expect(preview.reset.cryptoPositions).toBe(0);
    expect(preview.reset.businesses).toBe(0);
    expect(preview.reset.properties).toBe(0);
    expect(preview.preserve.profileName).toBe("Alex");
    expect(preview.preserve.settings).toEqual({ currency: "INR", difficulty: "hard" });
    expect(preview.preserve.permanentAchievements).toContain("Millionaire");
    expect(preview.legacyPointsEarned).toBeGreaterThan(0);
  });

  it("spends legacy points on permanent upgrades without allowing overspending", () => {
    const legacy = { ...createLegacyState(), points: 20 };
    const bought = purchaseLegacyUpgrade(legacy, "startingCapital");
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(bought.legacy.upgrades.startingCapital).toBe(1);
    expect(bought.legacy.points).toBe(15);
    expect(purchaseLegacyUpgrade(bought.legacy, "researchEfficiency").ok).toBe(true);
    const empty = { ...bought.legacy, points: 0 };
    expect(purchaseLegacyUpgrade(empty, "businessCostReduction").ok).toBe(false);
  });
});
