import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import InvStockApp from "@/components/invstock-app";

describe("InvStock save restoration", () => {
  beforeEach(() => {
    cleanup();
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        matches: false,
        media: "",
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return false; }
      })
    });
    localStorage.clear();
    localStorage.setItem("invstock-v2", JSON.stringify({
      portfolio: { cash: 1200, holdings: {}, realizedPnl: 0, trades: 0 },
      saved: ["NVDA", "COIN"]
    }));
  });

  it("preserves the legacy saved-ticker list when restoring the portfolio fallback", async () => {
    render(<InvStockApp />);

    await waitFor(() => {
      const restored = JSON.parse(localStorage.getItem("invstock-game-v2") ?? "null");
      expect(restored?.watchlist).toEqual(["NVDA", "COIN"]);
    });
  });
  it("renders the Discover title and the specified compact stock-row structure", async () => {
    const { container } = render(<InvStockApp />);

    const nameInput = await screen.findByLabelText("Your name");
    fireEvent.change(nameInput, { target: { value: "Demo Investor" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Discovery" }));

    expect(screen.getByRole("heading", { name: "Discover" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Search companies or tickers")).toBeTruthy();

    const nvdaRow = container.querySelector('[data-stock-ticker="NVDA"]');
    expect(nvdaRow).not.toBeNull();
    expect(nvdaRow?.querySelector(".stock-row-logo")).not.toBeNull();
    expect(nvdaRow?.querySelector(".stock-row-sparkline")).not.toBeNull();
  });
  it("shows an honest empty state when the simulator has no news events", async () => {
    render(<InvStockApp />);

    const nameInput = await screen.findByLabelText("Your name");
    fireEvent.change(nameInput, { target: { value: "Demo Investor" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: "News" }));

    expect(screen.getByText("No market updates yet.")).toBeTruthy();
  });
  it("opens the stock detail hub with overview tabs and a real trading action", async () => {
    render(<InvStockApp />);

    const nameInput = await screen.findByLabelText("Your name");
    fireEvent.change(nameInput, { target: { value: "Demo Investor" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Discovery" }));
    fireEvent.click(await screen.findByRole("button", { name: /NVDA,/ }));

    expect(screen.getByRole("tab", { name: "Overview" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "News" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Events" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Buy NVDA" })).toBeTruthy();
  });

  it("shows net worth and asset allocation in Account", async () => {
    render(<InvStockApp />);

    const nameInput = await screen.findByLabelText("Your name");
    fireEvent.change(nameInput, { target: { value: "Demo Investor" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    fireEvent.click(screen.getByRole("button", { name: "Account" }));

    expect(screen.getByText("Net worth")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Asset allocation" })).toBeTruthy();
    expect(screen.getByText("Holdings")).toBeTruthy();
  });
});
