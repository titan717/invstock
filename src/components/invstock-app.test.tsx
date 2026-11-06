import { within, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    await screen.findAllByRole("button", { name: "Discover" });
    fireEvent.click(screen.getAllByRole("button", { name: "Discover" }).find((button) => button.classList.contains("nav-item"))!);

    expect(screen.getByRole("heading", { name: "Discover" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Search companies or tickers")).toBeTruthy();

    const nvdaRow = container.querySelector('[data-stock-ticker="NVDA"]');
    expect(nvdaRow).not.toBeNull();
    expect(nvdaRow?.querySelector(".stock-row-logo")).not.toBeNull();
    expect(nvdaRow?.querySelector(".stock-row-sparkline")).not.toBeNull();
  });
  it("keeps the Home watchlist identical to game.watchlist after a simulator reset", async () => {
    const { container } = render(<InvStockApp />);
    await screen.findAllByRole("button", { name: "Discover" });

    fireEvent.click(screen.getAllByRole("button", { name: "Discover" }).find(button => button.classList.contains("nav-item"))!);
    fireEvent.click(await screen.findByRole("button", { name: "All symbols" }));
    const aaplRow = await screen.findByText("AAPL");
    fireEvent.click(aaplRow.closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "Save stock" }));
    await waitFor(() => {
      const savedGame = JSON.parse(localStorage.getItem("invstock-game-v2") ?? "null");
      expect(savedGame?.watchlist).toContain("AAPL");
    });
    fireEvent.click(screen.getByRole("button", { name: /Back to/ }));

    fireEvent.click(screen.getAllByRole("button", { name: "Account" }).find(button => button.classList.contains("nav-item"))!);
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset account" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Reset your account?" })).getByRole("button", { name: "Reset" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to account" }));

    await waitFor(() => {
      const persisted = JSON.parse(localStorage.getItem("invstock-game-v2") ?? "null");
      const legacyMirror = JSON.parse(localStorage.getItem("invstock-v2") ?? "null");
      expect(legacyMirror?.saved).toEqual(persisted?.watchlist);
      expect(persisted?.watchlist).toEqual(["MSFT", "META", "GOOGL", "COIN", "SHOP"]);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Home" }).find(button => button.classList.contains("nav-item"))!);
    const watchlistRows = Array.from(container.querySelectorAll("[data-home-list] [data-stock-ticker]")).map(row => row.getAttribute("data-stock-ticker"));
    expect(watchlistRows).toEqual(["MSFT", "META", "GOOGL", "COIN", "SHOP"]);
  });
});
