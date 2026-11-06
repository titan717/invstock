import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TradeFlow from "@/components/trade/TradeFlow";

const base = { ticker: "VLTM", price: 100, bid: 99.97, ask: 100.03, buyingPower: 300, isMarketOpen: true, chartHistory: [98, 99, 100], onBack: vi.fn() };

describe("Trade flow", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: class { observe() {} unobserve() {} disconnect() {} } });
  });
  afterEach(cleanup);

  it("buys in dollars with quick amounts and shows the filled sheet", () => {
    const onExecuteTrade = vi.fn(() => true);
    render(<TradeFlow {...base} onExecuteTrade={onExecuteTrade} onQueueOrder={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "$250" }));
    expect(screen.getByTestId("trade-amount").textContent).toBe("$250");
    expect(screen.getByTestId("trade-estimate").textContent).toBe("2.5");
    expect(screen.getByText("$300.00 buying power available")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Review order" }));
    expect(onExecuteTrade).toHaveBeenCalledWith(expect.objectContaining({ side: "buy", shares: 2.5 }));
    const sheet = screen.getByRole("dialog", { name: "Order filled" });
    expect(sheet.textContent).toContain("Bought 2.5 shares of VLTM at $100.00");
  });

  it("blocks orders above buying power", () => {
    render(<TradeFlow {...base} onExecuteTrade={vi.fn()} onQueueOrder={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "$500" }));
    expect((screen.getByRole("button", { name: "Review order" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("places a limit order through the queue at the chosen price", () => {
    const onQueueOrder = vi.fn(() => true);
    render(<TradeFlow {...base} onExecuteTrade={vi.fn()} onQueueOrder={onQueueOrder} />);
    fireEvent.click(screen.getByRole("button", { name: "Order type" }));
    fireEvent.click(screen.getByRole("radio", { name: /Limit order/ }));
    for (const key of ["Backspace", "Backspace", "Backspace", "Backspace", "Backspace", "Backspace", "9", "5"]) fireEvent.click(screen.getByRole("button", { name: key }));
    expect(screen.getByTestId("limit-price").textContent).toBe("$95");
    fireEvent.click(screen.getByRole("button", { name: "Edit amount" }));
    fireEvent.click(screen.getByRole("tab", { name: "Shares" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "Place limit order" }));
    expect(onQueueOrder).toHaveBeenCalledWith({ side: "buy", shares: 2, targetPrice: 95 });
    expect(screen.getByRole("dialog", { name: "Limit order placed" }).textContent).toContain("Fills at $95.00 or lower");
  });

  it("caps sells at the shares held", () => {
    render(<TradeFlow {...base} tradeSide="sell" sharesAvailable={1} onExecuteTrade={vi.fn()} onQueueOrder={vi.fn()} />);
    expect(screen.getByText("1 share available")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Shares" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect((screen.getByRole("button", { name: "Review order" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
