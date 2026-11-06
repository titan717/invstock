import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoansScreen, TRADING_DAYS_PER_MONTH, creditAvailable } from "@/components/loans/LoansScreen";
import { DIFFICULTY_RULES, calculateNetWorth, createGameState, loanInstallment, takePersonalLoan } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

const stocks = createMarket(731991);

describe("Loans screen", () => {
  afterEach(cleanup);

  it("limits the amount to available credit and takes the selected EMI plan", () => {
    const state = createGameState();
    const limit = creditAvailable(state, stocks);
    expect(limit).toBe(Math.floor(calculateNetWorth(state, stocks) * DIFFICULTY_RULES[state.settings.difficulty].creditLimit / 100) * 100);
    const onTakeLoan = vi.fn(() => true);
    render(<LoansScreen state={state} stocks={stocks} currency="USD" onBack={vi.fn()} onTakeLoan={onTakeLoan} onRepay={vi.fn()} />);
    fireEvent.change(screen.getByRole("slider", { name: "Loan amount" }), { target: { value: String(limit) } });
    expect(screen.getByTestId("loan-amount").textContent).toBe(`$${limit.toLocaleString("en-US")}`);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    fireEvent.click(radios[1]);
    fireEvent.click(screen.getByRole("button", { name: "Take a loan" }));
    expect(onTakeLoan).toHaveBeenCalledWith(limit, 6 * TRADING_DAYS_PER_MONTH);
  });

  it("shows the outstanding loan with its installment after borrowing", () => {
    const base = createGameState();
    const result = takePersonalLoan(structuredClone(base), stocks, 1000, 63);
    expect(result.ok).toBe(true);
    render(<LoansScreen state={result.state} stocks={stocks} currency="USD" onBack={vi.fn()} onTakeLoan={vi.fn()} onRepay={vi.fn()} />);
    const apr = DIFFICULTY_RULES[base.settings.difficulty].loanApr;
    expect(screen.getByLabelText("Current loan").textContent).toContain(`$${loanInstallment(1000, apr, 63).toFixed(2)}/day`);
    expect(screen.getByLabelText("Current loan").textContent).toContain("63 installments left");
  });
});
