"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { DIFFICULTY_RULES, calculateNetWorth, loanInstallment, type GameState } from "@/lib/game-engine";
import type { Stock } from "@/lib/market";
import { formatMoney, type CurrencyCode } from "@/lib/currency";

/** Trading days per simulated month, used to turn EMI plans into daily installments. */
export const TRADING_DAYS_PER_MONTH = 21;
export const LOAN_PLAN_MONTHS = [3, 6, 12] as const;
const STEP = 100;

type Props = {
  state: GameState;
  stocks: Stock[];
  currency: CurrencyCode;
  onBack: () => void;
  onTakeLoan: (amount: number, days: number) => boolean;
  onRepay: (amount: number) => boolean;
};

export function creditAvailable(state: GameState, stocks: Stock[]) {
  return Math.max(0, Math.floor((calculateNetWorth(state, stocks) * DIFFICULTY_RULES[state.settings.difficulty].creditLimit - state.loan) / STEP) * STEP);
}

export function LoansScreen({ state, stocks, currency, onBack, onTakeLoan, onRepay }: Props) {
  const limit = creditAvailable(state, stocks);
  const apr = DIFFICULTY_RULES[state.settings.difficulty].loanApr;
  const [amount, setAmount] = useState(() => Math.min(limit, Math.max(STEP, Math.round(limit / 2 / STEP) * STEP)));
  const [planIndex, setPlanIndex] = useState(0);
  const [details, setDetails] = useState(false);
  const money = (value: number, decimals = 0) => formatMoney(value, currency, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const principal = Math.min(amount, limit);
  const total = principal + state.loan;
  const plans = useMemo(() => LOAN_PLAN_MONTHS.map(months => {
    const days = months * TRADING_DAYS_PER_MONTH;
    const daily = loanInstallment(total, apr, days);
    return { months, days, daily, monthly: daily * TRADING_DAYS_PER_MONTH, repayable: daily * days };
  }), [total, apr]);
  const plan = plans[planIndex];
  const outstandingInstallment = state.loan > 0 && state.loanTermDays > 0 ? loanInstallment(state.loan, apr, state.loanTermDays) : state.loan * 0.02;
  const fill = limit > 0 ? (principal / limit) * 100 : 0;

  return (
    <section className="flex min-h-full flex-col bg-black text-white" aria-label="Loans">
      <header className="flex h-16 items-center gap-3 px-3">
        <button type="button" aria-label="Back" onClick={onBack} className="grid h-10 w-10 place-items-center"><ArrowLeft size={22} /></button>
        <h1 className="text-[18px] font-bold">Loans</h1>
      </header>

      <div className="flex-1 px-4 pb-32">
        <h2 className="mt-6 text-center text-[20px] font-bold">Personal Loan</h2>
        <p className="mt-6 text-center text-[11px] font-semibold tracking-[0.12em] text-[#8E8E93]">LOAN AMOUNT</p>
        <p className="mt-1 text-center text-[32px] font-bold tabular-nums" data-testid="loan-amount">{money(principal)}</p>
        <input
          type="range"
          aria-label="Loan amount"
          min={limit > 0 ? STEP : 0}
          max={limit}
          step={STEP}
          value={principal}
          disabled={limit < STEP}
          onChange={event => setAmount(Number(event.target.value))}
          className="loan-slider mt-6 w-full"
          style={{ background: `linear-gradient(to right, #00D09C ${fill}%, #2C2C2E ${fill}%)` }}
        />
        <div className="mt-2 flex justify-between text-[12px] text-[#8E8E93] tabular-nums"><span>{money(limit > 0 ? STEP : 0)}</span><span>Limit {money(limit)}</span></div>

        <p className="mt-8 text-center text-[11px] font-semibold tracking-[0.12em] text-[#8E8E93]">EMI PLANS AVAILABLE</p>
        <p className="mt-2 text-center"><span className="rounded-md bg-[#0B3D2E] px-2 py-1 text-[12px] font-semibold text-[#00D09C] tabular-nums">@{(apr * 100).toFixed(2)}% p.a.</span></p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#2C2C2E]" role="radiogroup" aria-label="EMI plans">
          {plans.map((item, index) => (
            <div key={item.months} className="border-b border-[#2C2C2E] last:border-b-0">
              <div className="flex items-center gap-3 px-4 py-4">
                <button type="button" role="radio" aria-checked={planIndex === index} onClick={() => { setPlanIndex(index); setDetails(false); }} className="flex flex-1 items-center gap-3 text-left">
                  <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${planIndex === index ? "border-[#00D09C]" : "border-[#8E8E93]"}`}>{planIndex === index && <i className="h-2.5 w-2.5 rounded-full bg-[#00D09C]" />}</span>
                  <span className="text-[16px] font-bold tabular-nums">{money(item.monthly)} <span className="text-[13px] font-normal text-[#C7C7CC]">× {item.months} months</span></span>
                </button>
                {planIndex === index && <button type="button" onClick={() => setDetails(value => !value)} className="rounded-lg border border-[#3A3A3C] px-3 py-1.5 text-[12px] font-semibold">Details</button>}
              </div>
              {planIndex === index && details && (
                <dl className="grid grid-cols-2 gap-y-2 px-4 pb-4 text-[13px] tabular-nums">
                  <dt className="text-[#8E8E93]">Daily installment</dt><dd className="text-right">{money(item.daily, 2)}</dd>
                  <dt className="text-[#8E8E93]">Trading days</dt><dd className="text-right">{item.days}</dd>
                  <dt className="text-[#8E8E93]">Total interest</dt><dd className="text-right">{money(item.repayable - total, 2)}</dd>
                  <dt className="text-[#8E8E93]">Total repayable</dt><dd className="text-right">{money(item.repayable, 2)}</dd>
                  {state.loan > 0 && <><dt className="text-[#8E8E93]">Includes current balance</dt><dd className="text-right">{money(state.loan, 2)}</dd></>}
                </dl>
              )}
            </div>
          ))}
        </div>

        {state.loan > 0 && (
          <div className="mt-6 rounded-2xl bg-[#1C1C1E] p-4 tabular-nums" aria-label="Current loan">
            <div className="flex justify-between text-[13px] text-[#8E8E93]"><span>Outstanding</span><span>{state.loanTermDays > 0 ? `${state.loanTermDays} installments left` : "Minimum payment plan"}</span></div>
            <div className="mt-1 flex justify-between text-[17px] font-bold"><span className="text-[#FF5722]">{money(state.loan, 2)}</span><span>{money(outstandingInstallment, 2)}/day</span></div>
            <button type="button" disabled={state.cash < 0.01} onClick={() => onRepay(Math.min(state.cash, state.loan))} className="mt-3 h-10 w-full rounded-full border border-[#3A3A3C] text-[14px] font-semibold disabled:opacity-40">
              Repay {money(Math.min(state.cash, state.loan), 2)} now
            </button>
          </div>
        )}
        <p className="mt-6 text-center text-[11px] leading-4 text-[#8E8E93]">Installments are taken from buying power at each market close. Missed payments add a penalty to your balance. Virtual money only.</p>
      </div>

      <div className="sticky bottom-0 bg-black px-4 pb-6 pt-3">
        <button type="button" disabled={principal < STEP} onClick={() => onTakeLoan(principal, plan.days)} className="h-12 w-full rounded-xl bg-[#00D09C] text-[16px] font-bold text-black disabled:opacity-40">Take a loan</button>
      </div>
    </section>
  );
}
