import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StockDetail } from "@/components/stock/StockDetail";
import { FinancialsScreen } from "@/components/stock/FinancialsScreen";
import { createGameState } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const noop = () => {};
const stocks = createMarket();

function renderDetail(overrides: Partial<Parameters<typeof StockDetail>[0]> = {}) {
  const stock = stocks[0];
  const props = { stock, state: createGameState(), stocks, currency: "USD" as const, saved: false, liveData: false, backLabel: "Home", onBack: noop, onToggleSaved: noop, onTrade: noop, onCreateSip: noop, onAddAlert: noop, onRemoveAlert: noop, onSearch: noop, onOpenStock: noop, onOpenFinancials: noop, onOpenOptions: noop, ...overrides };
  render(<StockDetail {...props} />);
  return stock;
}

describe("StockDetail", () => {
  it("renders header, tabs and the SIP / Sell / Buy bar from game state", () => {
    const onTrade = vi.fn(), onBack = vi.fn();
    const stock = renderDetail({ onTrade, onBack });
    expect(screen.getAllByText(stock.name).length).toBeGreaterThan(0);
    for (const tab of ["Overview", "Technicals", "News", "Events"]) expect(screen.getByRole("tab", { name: tab })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Buy" }));
    fireEvent.click(screen.getByRole("button", { name: "Sell" }));
    expect(onTrade.mock.calls).toEqual([["buy"], ["sell"]]);
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows a technicals summary verdict", () => {
    renderDetail();
    fireEvent.click(screen.getByRole("tab", { name: "Technicals" }));
    expect(screen.getByText("Summary")).toBeTruthy();
  });

  it("toggles saved state", () => {
    const onToggleSaved = vi.fn();
    renderDetail({ onToggleSaved });
    fireEvent.click(screen.getByRole("button", { name: "Save stock" }));
    expect(onToggleSaved).toHaveBeenCalled();
  });
});

describe("FinancialsScreen", () => {
  it("renders statement rows from the financials API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ ticker: "NVDA", period: "quarterly", dates: ["2026-04-30", "2026-07-31"], income: [{ key: "TotalRevenue", label: "Revenue", values: [44_000_000_000, 46_700_000_000], children: [{ key: "OperatingRevenue", label: "Revenue from Operations", values: [44_000_000_000, 46_700_000_000] }] }, { key: "EBIT", label: "EBIT", values: [20_000_000_000, 22_000_000_000] }], balance: [], cashflow: [] }) })));
    render(<FinancialsScreen ticker="NVDA" name="Nvidia" onBack={noop} />);
    expect(await screen.findByText("Revenue")).toBeTruthy();
    expect(screen.getAllByText("46,700")).toHaveLength(2);
    expect(screen.getByText("Revenue from Operations")).toBeTruthy();
    expect(screen.getByText("Operating Profit Margin")).toBeTruthy();
  });
});
