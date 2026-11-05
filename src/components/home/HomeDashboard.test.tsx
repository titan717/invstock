import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeDashboard, getMarketSession } from "@/components/home/HomeDashboard";
import { createMarket } from "@/lib/market";

const stock = createMarket(731991)[0];

const props = {
  marketMinute: 600,
  totalValue: 12500,
  dailyChange: 192.99,
  dailyChangePct: 1.73,
  previousClose: 12307.01,
  chartData: [{ label: "Day 1", value: 12307.01 }, { label: "Day 2", value: 12500 }],
  currency: "USD" as const,
  buyingPower: 4200,
  timeframe: "1D",
  positions: [{ stock, quantity: 2.5, marketValue: stock.price * 2.5, returnPct: 4.2 }],
  onTimeframeChange: vi.fn(),
  onStockSelect: vi.fn(),
  onHistory: vi.fn(),
  onAddCash: vi.fn(),
  onSettings: vi.fn()
};

beforeEach(() => {
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  });
});

describe("market session display", () => {
  afterEach(cleanup);

  it("treats the simulated regular session as open and computes time to close", () => {
    expect(getMarketSession(600)).toEqual({ isOpen: true, minutesRemaining: 360 });
  });

  it("shows the closed state before the simulated opening minute", () => {
    expect(getMarketSession(540)).toEqual({ isOpen: false, minutesUntilOpen: 30 });
  });

  it("renders live portfolio data, positions, and timeframe controls", () => {
    render(<HomeDashboard {...props} />);
    expect(screen.getByRole("heading", { name: "Investing" })).toBeTruthy();
    expect(screen.getByText(/Market open/)).toBeTruthy();
    expect(screen.getByText("Positions")).toBeTruthy();
    expect(screen.getByText(stock.ticker)).toBeTruthy();
    expect(screen.getByRole("button", { name: "1D" })).toBeTruthy();
  });

  it("opens the visual-only speed sheet and selects a mode without changing simulator settings", () => {
    render(<HomeDashboard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Market speed" }));
    expect(screen.getByRole("dialog", { name: "Market speed" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Fast.*1 hour per real minute/ }));
    expect(screen.getByRole("button", { name: "Market speed" }).textContent).toContain("Fast");
    expect(props.onTimeframeChange).not.toHaveBeenCalled();
  });

  it("dims the net worth and chart when the simulated market is closed", () => {
    render(<HomeDashboard {...props} marketMinute={540} />);
    expect(screen.getByTestId("home-net-worth").className).toContain("is-market-closed");
    expect(screen.getByTestId("home-portfolio-chart").className).toContain("is-market-closed");
  });
});
