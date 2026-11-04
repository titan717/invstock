import type { Stock } from "@/lib/market";
import type { GameNews } from "@/lib/game-engine";

export type WorldNewsEvent = GameNews & {
  source: string;
  category: "macro" | "industry" | "regulatory" | "company" | "scandal";
  affectedIndustries: string[];
  affectedSectors: string[];
  reliability: number;
  status: "developing" | "confirmed" | "unverified";
  severity: "low" | "moderate" | "high" | "critical";
  expiresDay: number;
  demandImpact: number;
  costImpact: number;
};

type EventTemplate = {
  headline: string;
  body: string;
  source: string;
  category: WorldNewsEvent["category"];
  industries: string[];
  sectors: string[];
  sentiment: number;
  magnitude: number;
  demandImpact: number;
  costImpact: number;
  duration: number;
  severity: WorldNewsEvent["severity"];
};

const templates: EventTemplate[] = [
  { headline: "Central bank signals higher rates", body: "Borrowing costs are expected to rise. Highly leveraged businesses face tighter margins while savers may benefit.", source: "Global Markets Desk", category: "macro", industries: ["banking", "construction"], sectors: ["Banking", "Financial Services", "Real Estate"], sentiment: -1, magnitude: .025, demandImpact: .92, costImpact: 1.1, duration: 4, severity: "high" },
  { headline: "Banking scandal triggers confidence shock", body: "Fresh allegations raise questions about lending controls. Customers begin reviewing their banking relationships, creating an opening for competitors.", source: "Financial Integrity Bureau", category: "scandal", industries: ["banking"], sectors: ["Banking", "Financial Services"], sentiment: -1, magnitude: .045, demandImpact: .78, costImpact: 1.12, duration: 5, severity: "critical" },
  { headline: "Consumer spending accelerates", body: "Retail activity strengthens as household confidence improves. Stores with reliable inventory are positioned to capture the increase in demand.", source: "Consumer Pulse", category: "industry", industries: ["retail", "logistics"], sectors: ["Consumer", "Travel"], sentiment: 1, magnitude: .028, demandImpact: 1.18, costImpact: 1.03, duration: 3, severity: "moderate" },
  { headline: "Global shipping disruption raises costs", body: "Port congestion and delayed freight are pushing delivery costs higher. Logistics operators with spare capacity may gain new contracts.", source: "World Trade Monitor", category: "industry", industries: ["logistics", "retail", "construction"], sectors: ["Industrials", "Consumer"], sentiment: -1, magnitude: .035, demandImpact: .9, costImpact: 1.2, duration: 4, severity: "high" },
  { headline: "Infrastructure spending boom announced", body: "A multi-year public investment programme is expected to lift contract pipelines and demand for construction materials and equipment.", source: "Infrastructure Wire", category: "industry", industries: ["construction", "logistics"], sectors: ["Industrials", "Materials"], sentiment: 1, magnitude: .04, demandImpact: 1.22, costImpact: 1.08, duration: 6, severity: "high" },
  { headline: "Inflation comes in hotter than expected", body: "Input prices and wage expectations move higher. Businesses with pricing power may protect margins, while cash-heavy consumers feel pressure.", source: "Economic Data Network", category: "macro", industries: ["retail", "construction", "logistics", "banking"], sectors: ["Consumer", "Industrials", "Banking", "Utilities", "Materials"], sentiment: -1, magnitude: .032, demandImpact: .94, costImpact: 1.16, duration: 5, severity: "high" },
  { headline: "Technology breakthrough boosts productivity outlook", body: "New automation tools could lower operating costs and improve service capacity across several industries.", source: "Technology Review", category: "company", industries: ["retail", "logistics", "banking"], sectors: ["Technology", "Semiconductors"], sentiment: 1, magnitude: .038, demandImpact: 1.08, costImpact: .94, duration: 4, severity: "moderate" },
  { headline: "Regulators tighten digital-asset controls", body: "New compliance requirements unsettle parts of the digital-asset market. Established financial firms may see a short-term increase in service demand.", source: "Regulatory Bulletin", category: "regulatory", industries: ["banking"], sectors: ["Technology", "Financial Services", "Banking"], sentiment: -1, magnitude: .05, demandImpact: 1.04, costImpact: 1.1, duration: 3, severity: "high" },
  { headline: "Corporate earnings season surprises investors", body: "A group of major companies reports stronger-than-expected results, lifting sentiment in selected sectors.", source: "Earnings Central", category: "company", industries: ["retail", "construction", "logistics", "banking"], sectors: ["Technology", "Consumer", "Industrials"], sentiment: 1, magnitude: .022, demandImpact: 1.04, costImpact: 1, duration: 2, severity: "low" },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function createWorldNewsEvent(stocks: Stock[], day: number, seed: number): WorldNewsEvent {
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const template = templates[Math.floor(random() * templates.length)];
  const affected = stocks.filter(stock => template.sectors.includes(stock.sector));
  const tickers = affected.map(stock => stock.ticker);
  const reliability = Number((0.58 + random() * 0.41).toFixed(2));
  const status: WorldNewsEvent["status"] = reliability < 0.68 ? "unverified" : reliability < 0.82 ? "developing" : "confirmed";
  const magnitude = template.magnitude * (0.8 + random() * 0.4);
  return {
    id: state,
    headline: template.headline,
    body: template.body,
    tickers,
    sentiment: template.sentiment,
    magnitude,
    type: "world",
    day,
    minute: 0,
    source: template.source,
    category: template.category,
    affectedIndustries: template.industries,
    affectedSectors: template.sectors,
    reliability,
    status,
    severity: template.severity,
    expiresDay: day + template.duration,
    demandImpact: template.demandImpact,
    costImpact: template.costImpact,
  };
}

export function applyWorldNewsToMarket(stocks: Stock[], event: WorldNewsEvent): Stock[] {
  const affected = new Set(event.tickers);
  return stocks.map(stock => {
    if (!affected.has(stock.ticker)) return stock;
    const beta = clamp(stock.beta, 0.6, 1.8);
    const reliabilityWeight = event.status === "unverified" ? 0.35 : event.status === "developing" ? 0.7 : 1;
    const move = event.sentiment * Number(event.magnitude ?? 0) * beta * reliabilityWeight;
    const price = Math.max(0.5, stock.price * (1 + move));
    const rounded = Number(price.toFixed(2));
    return { ...stock, price: rounded, change: stock.change + (rounded / stock.price - 1) * 100, history: [...stock.history.slice(-389), rounded] };
  });
}

export function getWorldIndustryModifiers(events: readonly GameNews[], industry: string, day: number): { demand: number; costs: number } {
  let demand = 1;
  let costs = 1;
  for (const event of events) {
    const world = event as WorldNewsEvent;
    if (world.type !== "world" || !world.expiresDay || world.expiresDay < day || !world.affectedIndustries?.includes(industry)) continue;
    const reliabilityWeight = world.status === "unverified" ? 0.35 : world.status === "developing" ? 0.7 : 1;
    demand *= 1 + (world.demandImpact - 1) * reliabilityWeight;
    costs *= 1 + (world.costImpact - 1) * reliabilityWeight;
  }
  return { demand: clamp(demand, 0.55, 1.5), costs: clamp(costs, 0.7, 1.6) };
}

export function pruneExpiredWorldNews(state: { news: GameNews[] }, day: number): void {
  state.news = state.news.filter(event => event.type !== "world" || !("expiresDay" in event) || Number((event as WorldNewsEvent).expiresDay) >= day).slice(0, 80);
}
