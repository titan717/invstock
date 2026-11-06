import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage";
import { createGameState } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

const market = createMarket(731991);
const stock = (ticker: string, change: number, volume: number) => ({
  ...market.find(item => item.ticker === ticker)!,
  change,
  volume
});
const stocks = [
  stock("MSFT", 1.25, 50),
  stock("NVDA", 4.5, 150),
  stock("JPM", -2.75, 300)
];

const props = {
  stocks,
  state: createGameState(),
  currency: "USD" as const,
  search: "",
  onSearchChange: vi.fn(),
  sector: "All",
  onSectorChange: vi.fn(),
  asset: "Stocks" as const,
  onAssetChange: vi.fn(),
  onStockSelect: vi.fn(),
  onCryptoTrade: vi.fn()
};

describe("Discover stocks", () => {
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
  afterEach(cleanup);

  it("hides market sections while searching and shows only matching stock rows", () => {
    const { container } = render(<DiscoveryPage {...props} search="nvda" />);

    expect(screen.getByRole("textbox", { name: "Search companies or tickers" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Top gainers" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Top losers" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Most active" })).toBeNull();
    expect(container.querySelectorAll(".discovery-stock-list")).toHaveLength(1);
    expect(container.querySelector('[data-stock-ticker="NVDA"]')).not.toBeNull();
    expect(container.querySelector('[data-stock-ticker="MSFT"]')).toBeNull();
  });

  it("shows the requested empty state when no symbol matches", () => {
    render(<DiscoveryPage {...props} search="not-a-real-symbol" />);

    expect(screen.getByText("No symbols found")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Top gainers" })).toBeNull();
  });

  it("ranks top gainers, top losers, and most active from the current stock data", () => {
    const { container } = render(<DiscoveryPage {...props} />);

    const lists = container.querySelectorAll(".discovery-stock-list");
    expect(lists).toHaveLength(3);
    expect(lists[0].querySelector("button")?.getAttribute("data-stock-ticker")).toBe("NVDA");
    expect(lists[1].querySelector("button")?.getAttribute("data-stock-ticker")).toBe("JPM");
    expect(lists[2].querySelector("button")?.getAttribute("data-stock-ticker")).toBe("JPM");
  });

  it("opens a sector screen listing only that sector's stocks", () => {
    const { container } = render(<DiscoveryPage {...props} sector="Technology" />);
    expect(screen.getByRole("heading", { name: "Technology" })).toBeTruthy();

    const rows = Array.from(container.querySelectorAll(".discovery-stock-list [data-stock-ticker]"));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(row => ["MSFT", "NVDA"].includes(row.getAttribute("data-stock-ticker") ?? ""))).toBe(true);
  });

  it("opens All symbols sorted by ticker and returns with Back", () => {
    const { container } = render(<DiscoveryPage {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "All symbols" }));
    expect(screen.getByRole("heading", { name: "All symbols" })).toBeTruthy();
    const tickers = Array.from(container.querySelectorAll("[data-stock-ticker]")).map(row => row.getAttribute("data-stock-ticker"));
    expect(tickers).toEqual(["JPM", "MSFT", "NVDA"]);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Discover" })).toBeTruthy();
  });

  it("shows Most active rows with volume and sector chips call onSectorChange", () => {
    const onSectorChange = vi.fn();
    render(<DiscoveryPage {...props} onSectorChange={onSectorChange} />);
    fireEvent.click(screen.getAllByRole("button", { name: "See all" })[2]);
    expect(screen.getByRole("heading", { name: "Most active" })).toBeTruthy();
    expect(screen.getAllByText("Vol 0.0M")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Technology" }));
    expect(onSectorChange).toHaveBeenCalledWith("Technology");
  });
});
