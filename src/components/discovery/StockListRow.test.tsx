import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StockListRow } from "@/components/discovery/StockListRow";
import { createMarket } from "@/lib/market";
import { formatMoney } from "@/lib/currency";

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

describe("StockListRow position presentation", () => {
  afterEach(cleanup);

  it("shows company identity, owned shares, market value, and position return when supplied", () => {
    const stock = createMarket(731991)[0];
    render(
      <StockListRow
        stock={stock}
        currency="USD"
        quantity={2.5}
        value={stock.price * 2.5}
        changePercent={4.2}
        onClick={() => undefined}
      />
    );

    expect(screen.getByText(stock.name)).toBeTruthy();
    expect(screen.getByText("2.500 shares")).toBeTruthy();
    expect(screen.getByRole("button").getAttribute("aria-label")).toContain(formatMoney(stock.price * 2.5, "USD"));
    expect(screen.getByText("+4.20%")).toBeTruthy();
  });
});
