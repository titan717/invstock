import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import InvStockApp from "@/components/invstock-app";

describe("InvStock save restoration", () => {
  beforeEach(() => {
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
});
