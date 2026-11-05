import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OptionsChain, chainRows } from "@/components/options/OptionsChain";
import { createGameState } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

afterEach(cleanup);
const stocks = createMarket();
const stock = stocks[0];

function renderChain(overrides = {}) {
  const props = { stock, stocks, state: createGameState(), currency: "USD" as const, liveData: false, marketOpen: true, onChangeTicker: vi.fn(), onOpenStock: vi.fn(), onBuy: vi.fn(() => true), onSell: vi.fn(() => true), ...overrides };
  render(<OptionsChain {...props} />);
  return props;
}

describe("OptionsChain", () => {
  it("renders Strike/Bid/Ask/Mark/Last/% Chg with the share price marker", () => {
    renderChain();
    for (const head of ["Strike", "Bid", "Ask", "Mark", "Last", "% Chg"]) expect(screen.getByRole("columnheader", { name: head })).toBeTruthy();
    expect(screen.getByText(/^Share price \$/)).toBeTruthy();
  });

  it("places the marker between the strikes surrounding the share price", () => {
    const rows = chainRows({ live: null, stock, type: "call", days: 4 });
    const index = rows.findIndex(row => row.strike >= stock.price);
    expect(rows[index - 1].strike).toBeLessThan(stock.price);
    expect(rows[index].strike).toBeGreaterThanOrEqual(stock.price);
  });

  it("opens a contract and submits a buy-to-open order", () => {
    const props = renderChain();
    const rows = screen.getAllByRole("row");
    const marker = rows.findIndex(row => row.hasAttribute("data-share-price"));
    fireEvent.click(rows[marker + 2]);
    expect(screen.getByText("Payoff at expiration")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Review order" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit order" }));
    expect(props.onBuy).toHaveBeenCalledWith(expect.objectContaining({ ticker: stock.ticker, contracts: 1, type: "call" }));
  });

  it("blocks orders while the market is closed", () => {
    renderChain({ marketOpen: false });
    fireEvent.click(screen.getAllByRole("row")[3]);
    expect((screen.getByRole("button", { name: "Review order" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
