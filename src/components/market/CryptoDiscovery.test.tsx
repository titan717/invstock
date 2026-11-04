import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CryptoDiscovery } from "@/components/market/CryptoDiscovery";
import { createGameState } from "@/lib/game-engine";

afterEach(cleanup);

describe("crypto discovery", () => {
  it("shows crypto markets and sends fractional buy orders", () => {
    const state = createGameState();
    state.cash = 1_000_000;
    const onTrade = vi.fn();
    render(<CryptoDiscovery state={state} onTrade={onTrade} />);
    expect(screen.getByRole("heading", { name: "Explore crypto" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Crypto order quantity"), { target: { value: "0.025" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Buy" })[0]);
    expect(onTrade).toHaveBeenCalledWith("BTC", "buy", 0.025);
  });

  it("filters to owned assets and prevents selling more than the available holding", () => {
    const state = createGameState();
    state.cryptoHoldings.ETH = { quantity: 0.5, staked: 0.1, averageCost: 3000 };
    const onTrade = vi.fn();
    render(<CryptoDiscovery state={state} onTrade={onTrade} />);
    fireEvent.click(screen.getByRole("button", { name: "My assets" }));
    expect(screen.getByText("Ethereum")).toBeTruthy();
    expect(screen.queryByText("Bitcoin")).toBeNull();
    fireEvent.change(screen.getByLabelText("Crypto order quantity"), { target: { value: "0.41" } });
    expect(screen.getByRole("button", { name: "Sell" })).toHaveProperty("disabled", true);
  });
});
