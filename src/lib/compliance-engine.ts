export type ScrutinyLevel = "low" | "moderate" | "high" | "critical";
export type InvestigationStatus = "open" | "cleared" | "fine-paid" | "dismissed";

export type Investigation = {
  id: string;
  status: InvestigationStatus;
  openedAtReview: number;
  fine: number;
  estimatedTaxAdjustment: number;
  legalCost: number;
  reputationPenalty: number;
  reason: string;
};

export type ScrutinyState = {
  score: number;
  level: ScrutinyLevel;
  reasons: string[];
  investigation: Investigation | null;
  complianceOfficer: boolean;
  reviews: number;
  lastActivityFingerprint: string;
};

export type ScrutinySignals = {
  largeMovementCount: number;
  rapidTradeCount: number;
  highRiskBusinessCount: number;
  unexplainedWealthRatio: number;
  unpaidTax: number;
  recordsQuality: number;
};

export type InvestigationAction = "submit-records" | "pay-fine" | "challenge";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function createScrutinyState(): ScrutinyState {
  return { score: 0, level: "low", reasons: [], investigation: null, complianceOfficer: false, reviews: 0, lastActivityFingerprint: "" };
}

export function getScrutinyLevel(score: number): ScrutinyLevel {
  return score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "moderate" : "low";
}

export function evaluateFinancialScrutiny(current: ScrutinyState, signals: ScrutinySignals): { state: ScrutinyState; reasons: string[] } {
  const reasons: string[] = [];
  const movements = Math.max(0, Math.floor(signals.largeMovementCount));
  const rapidTrades = Math.max(0, Math.floor(signals.rapidTradeCount));
  const riskyBusinesses = Math.max(0, Math.floor(signals.highRiskBusinessCount));
  const wealthRatio = Math.max(0, signals.unexplainedWealthRatio);
  const unpaidTax = Math.max(0, signals.unpaidTax);
  const recordsQuality = clamp(signals.recordsQuality, 0, 1);
  let risk = Math.min(20, movements * 5);
  if (movements > 0) reasons.push("Large or unusual transfers need supporting records.");
  risk += Math.min(20, rapidTrades * 2);
  if (rapidTrades >= 4) reasons.push("Unusually rapid trading activity was detected.");
  risk += Math.min(24, riskyBusinesses * 8);
  if (riskyBusinesses > 0) reasons.push("High-risk business activity requires stronger controls.");
  risk += Math.min(20, wealthRatio * 40);
  if (wealthRatio >= 0.15) reasons.push("Reported wealth does not yet explain recent asset growth.");
  if (unpaidTax > 0) {
    risk += 10 + Math.min(15, unpaidTax / 1000);
    reasons.push("Outstanding tax obligations need to be settled or reconciled.");
  }
  risk += (1 - recordsQuality) * 20;
  if (recordsQuality < 0.7) reasons.push("Financial records are incomplete or out of date.");
  if (current.complianceOfficer) risk *= 0.75;
  const cleanReview = risk === 0 && unpaidTax === 0 && recordsQuality >= 0.9;
  const score = clamp(cleanReview ? current.score - (current.complianceOfficer ? 8 : 5) : current.score + risk, 0, 100);
  const level = getScrutinyLevel(score);
  const shouldOpen = (level === "high" || level === "critical") && current.investigation?.status !== "open";
  const investigation = shouldOpen ? {
    id: "case-" + (current.reviews + 1),
    status: "open" as const,
    openedAtReview: current.reviews + 1,
    fine: Math.max(100, Math.round(unpaidTax * 0.15 + wealthRatio * 5000 + score * 4)),
    estimatedTaxAdjustment: Math.round(unpaidTax * 0.1 + wealthRatio * 2500),
    legalCost: Math.round(250 + score * 6),
    reputationPenalty: Math.round((score - 40) / 5),
    reason: reasons[0] ?? "Multiple financial risk indicators require review.",
  } : current.investigation;
  const state: ScrutinyState = {
    ...current,
    score,
    level,
    reasons,
    investigation,
    reviews: current.reviews + 1,
  };
  return { state, reasons };
}

export function hireComplianceOfficer(state: ScrutinyState): ScrutinyState {
  return state.complianceOfficer ? state : { ...state, complianceOfficer: true };
}

export function resolveInvestigation(state: ScrutinyState, action: InvestigationAction, challengeSuccessful = false): ScrutinyState & { cashPenalty: number; legalCost: number } {
  const investigation = state.investigation;
  if (!investigation || investigation.status !== "open") return { ...state, cashPenalty: 0, legalCost: 0 };
  if (action === "submit-records") {
    return { ...state, score: clamp(state.score - 28, 0, 100), level: getScrutinyLevel(clamp(state.score - 28, 0, 100)), reasons: [], investigation: { ...investigation, status: "cleared" }, cashPenalty: 0, legalCost: 0 };
  }
  if (action === "pay-fine") {
    return { ...state, score: clamp(state.score - 12, 0, 100), level: getScrutinyLevel(clamp(state.score - 12, 0, 100)), investigation: { ...investigation, status: "fine-paid" }, cashPenalty: investigation.fine, legalCost: investigation.legalCost };
  }
  if (challengeSuccessful) {
    return { ...state, score: clamp(state.score - 35, 0, 100), level: getScrutinyLevel(clamp(state.score - 35, 0, 100)), reasons: [], investigation: { ...investigation, status: "dismissed" }, cashPenalty: 0, legalCost: 0 };
  }
  return { ...state, investigation: { ...investigation, legalCost: investigation.legalCost }, cashPenalty: 0, legalCost: investigation.legalCost };
}
