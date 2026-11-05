/** Shapes returned by the /api/fundamentals, /api/financials and /api/options routes. */
export type PeriodValue = { label: string; revenue: number | null; profit: number | null };
export type CompanyEvent = { date: number; title: string; detail: string };
export type CompanyFundamentals = {
  ticker: string; name: string; ceo: string | null; sector: string | null; industry: string | null; website: string | null; employees: number | null; headquarters: string | null; description: string | null;
  open: number | null; previousClose: number | null; dayLow: number | null; dayHigh: number | null; yearLow: number | null; yearHigh: number | null; volume: number | null; averageVolume: number | null;
  marketCap: number | null; pe: number | null; forwardPe: number | null; eps: number | null; priceToBook: number | null; bookValue: number | null; roe: number | null; debtToEquity: number | null; dividendYield: number | null; beta: number | null; profitMargin: number | null;
  holders: { insiders: number | null; institutions: number | null; institutionsCount: number | null } | null;
  quarterly: PeriodValue[]; yearly: PeriodValue[];
  events: CompanyEvent[];
  analysts: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number; targetMean: number | null; targetHigh: number | null; targetLow: number | null } | null;
};

export type StatementRow = { key: string; label: string; values: (number | null)[]; children?: StatementRow[]; format?: "money" | "ratio" | "percent" };
export type FinancialStatements = { ticker: string; period: "quarterly" | "annual"; dates: string[]; income: StatementRow[]; balance: StatementRow[]; cashflow: StatementRow[] };

export type OptionContract = { contractSymbol: string; strike: number; bid: number; ask: number; last: number; change: number; percentChange: number; volume: number; openInterest: number; impliedVolatility: number; inTheMoney: boolean; expiration: number };
export type OptionChain = { ticker: string; underlyingPrice: number; expirations: number[]; expiration: number; calls: OptionContract[]; puts: OptionContract[] };

export const optionMark = (contract: Pick<OptionContract, "bid" | "ask" | "last">) => (contract.bid > 0 && contract.ask > 0 ? (contract.bid + contract.ask) / 2 : contract.last);
