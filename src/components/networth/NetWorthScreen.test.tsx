import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NetWorthScreen } from "@/components/networth/NetWorthScreen";
import { calculateNetWorth, createGameState } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

const stocks = createMarket(731991);
const setup = () => {
  const state = createGameState();
  const nvda = stocks.find(stock => stock.ticker === "NVDA")!;
  state.holdings = { NVDA: { quantity: 3, averageCost: nvda.price } } as typeof state.holdings;
  return state;
};

describe("Net worth screen", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: class { observe() {} unobserve() {} disconnect() {} } });
  });
  afterEach(cleanup);

  it("shows current vs invested, product rows and hides values on the eye toggle", () => {
    const state = setup();
    const total = calculateNetWorth(state, stocks);
    const onLoans = vi.fn(), onExplore = vi.fn();
    const { container } = render(<NetWorthScreen state={state} stocks={stocks} currency="USD" totalValue={total} onBack={vi.fn()} onExplore={onExplore} onLoans={onLoans} />);
    expect(screen.getByRole("heading", { name: "Net Worth" })).toBeTruthy();
    expect(screen.getByText(/Data as of 05 Jan '26/)).toBeTruthy();
    expect(screen.getByTestId("net-worth-current").textContent).toBe(`$${Math.round(total).toLocaleString("en-US")}`);
    expect(container.querySelector('[data-asset-class="stocks"]')?.textContent).toContain("1 stock");
    fireEvent.click(screen.getByRole("button", { name: "Hide values" }));
    expect(screen.getByTestId("net-worth-current").textContent).toBe("••••");
    fireEvent.click(container.querySelector('[data-asset-class="crypto"] button')!);
    expect(onExplore).toHaveBeenCalledWith("crypto");
    fireEvent.click(container.querySelector('[data-asset-class="loans"] button')!);
    expect(onLoans).toHaveBeenCalled();
  });

  it("switches the asset allocation card between classes", () => {
    const state = setup();
    render(<NetWorthScreen state={state} stocks={stocks} currency="USD" totalValue={calculateNetWorth(state, stocks)} onBack={vi.fn()} onExplore={vi.fn()} onLoans={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Stocks allocation" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /^Cash & savings/ }));
    expect(screen.getByRole("heading", { name: "Cash & savings allocation" })).toBeTruthy();
  });
});
