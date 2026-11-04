export const REBIRTH_UNLOCK_NET_WORTH = 10_000_000;
export type LegacyUpgrade = "startingCapital" | "businessCostReduction" | "researchEfficiency";
export type LegacyState = {
  points: number;
  lifetimePoints: number;
  rebirthCount: number;
  upgrades: Record<LegacyUpgrade, number>;
  permanentAchievements: string[];
  lastRebirthDay: number;
};
export type RebirthSnapshot = {
  profileName: string;
  netWorth: number;
  achievements: string[];
  settings: { currency: string; difficulty: string };
  stockPositions: number;
  cryptoPositions: number;
  businesses: number;
  properties: number;
};
export type RebirthPreview = {
  canRebirth: boolean;
  legacyPointsEarned: number;
  pointsAfterRebirth: number;
  reset: { cash: number; stocks: number; crypto: number; businesses: number; properties: number; ordinaryProgress: boolean };
  preserve: { profileName: string; settings: RebirthSnapshot["settings"]; permanentAchievements: string[]; rebirthCount: number };
};

const UPGRADE_COST: Record<LegacyUpgrade, number> = {
  startingCapital: 5,
  businessCostReduction: 8,
  researchEfficiency: 10,
};
const UPGRADE_MAX = 5;

export function createLegacyState(): LegacyState {
  return { points: 0, lifetimePoints: 0, rebirthCount: 0, upgrades: { startingCapital: 0, businessCostReduction: 0, researchEfficiency: 0 }, permanentAchievements: [], lastRebirthDay: 0 };
}

export function canRebirth(netWorth: number): boolean {
  return Number.isFinite(netWorth) && netWorth >= REBIRTH_UNLOCK_NET_WORTH;
}

export function calculateLegacyPoints(netWorth: number, achievementCount: number): number {
  const wealth = Math.max(0, Number.isFinite(netWorth) ? netWorth : 0);
  const achievements = Math.max(0, Math.floor(achievementCount));
  return Math.max(0, Math.floor(Math.sqrt(wealth / 1_000_000) * 5 + achievements * 1.5));
}

export function previewRebirth(snapshot: RebirthSnapshot, legacy: LegacyState): RebirthPreview {
  const canReset = canRebirth(snapshot.netWorth);
  const legacyPointsEarned = canReset ? calculateLegacyPoints(snapshot.netWorth, snapshot.achievements.length) : 0;
  const permanentAchievements = [...new Set([...legacy.permanentAchievements, ...snapshot.achievements])];
  return {
    canRebirth: canReset,
    legacyPointsEarned,
    pointsAfterRebirth: legacy.points + legacyPointsEarned,
    reset: {
      cash: 5_000 + legacy.upgrades.startingCapital * 2_500,
      stocks: 0,
      crypto: 0,
      businesses: 0,
      properties: 0,
      ordinaryProgress: true,
    },
    preserve: {
      profileName: snapshot.profileName,
      settings: { ...snapshot.settings },
      permanentAchievements,
      rebirthCount: legacy.rebirthCount + (canReset ? 1 : 0),
    },
  };
}

export function purchaseLegacyUpgrade(legacy: LegacyState, upgrade: LegacyUpgrade): { ok: true; legacy: LegacyState } | { ok: false; reason: string } {
  const level = legacy.upgrades[upgrade];
  if (level >= UPGRADE_MAX) return { ok: false, reason: "This legacy upgrade is already at its maximum level." };
  const cost = UPGRADE_COST[upgrade] * (level + 1);
  if (legacy.points < cost) return { ok: false, reason: "Not enough Legacy Points for this upgrade." };
  return {
    ok: true,
    legacy: {
      ...legacy,
      points: legacy.points - cost,
      upgrades: { ...legacy.upgrades, [upgrade]: level + 1 },
    },
  };
}

export function completeRebirth(legacy: LegacyState, snapshot: RebirthSnapshot, day: number): { ok: true; legacy: LegacyState; preview: RebirthPreview } | { ok: false; reason: string } {
  const preview = previewRebirth(snapshot, legacy);
  if (!preview.canRebirth) return { ok: false, reason: "Reach the rebirth net-worth milestone before resetting your empire." };
  return {
    ok: true,
    preview,
    legacy: {
      ...legacy,
      points: preview.pointsAfterRebirth,
      lifetimePoints: legacy.lifetimePoints + preview.legacyPointsEarned,
      rebirthCount: legacy.rebirthCount + 1,
      permanentAchievements: preview.preserve.permanentAchievements,
      lastRebirthDay: Math.max(0, Math.floor(day)),
    },
  };
}
