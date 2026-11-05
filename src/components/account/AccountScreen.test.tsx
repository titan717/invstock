import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountScreen, buildMonthlyStatements, rankProgress } from "@/components/account/AccountScreen";
import { ACHIEVEMENTS, createGameState } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const stocks = createMarket(731991);

function setup(mutate?: (state: ReturnType<typeof createGameState>) => void) {
  const state = createGameState();
  mutate?.(state);
  const handlers = { onOpenStock: vi.fn(), onClaimMission: vi.fn(), onJoinChallenge: vi.fn(), onClaimChallenge: vi.fn(), onOpenSettings: vi.fn(), onAddCash: vi.fn(), onUnavailable: vi.fn() };
  render(<AccountScreen state={state} stocks={stocks} totalValue={10000} currency={state.settings.currency} empirePanels={<div>Empire panels</div>} {...handlers} />);
  return { state, handlers };
}

afterEach(cleanup);

describe("rankProgress", () => {
  it("follows the engine thresholds", () => {
    expect(rankProgress(0)).toMatchObject({ rank: "Apprentice", next: "Trader", nextXp: 150, ratio: 0 });
    expect(rankProgress(300)).toMatchObject({ rank: "Trader", next: "Analyst", nextXp: 450 });
    expect(rankProgress(5000)).toMatchObject({ rank: "Market Legend", next: null, ratio: 1 });
  });
});

describe("buildMonthlyStatements", () => {
  it("splits the game into 30-day months using daily history", () => {
    const state = createGameState();
    state.market.day = 45;
    state.dailyHistory = [{ v: 10000, t: 0 }, { v: 11000, t: 30 }];
    const [current, first] = buildMonthlyStatements(state, 12100);
    expect(first).toMatchObject({ month: 1, inProgress: false, startingValue: 10000, endingValue: 11000, deposits: 10000 });
    expect(first.returnPct).toBeCloseTo(10);
    expect(current).toMatchObject({ month: 2, inProgress: true, startingValue: 11000, endingValue: 12100 });
  });
});

describe("AccountScreen", () => {
  it("renders rank, portfolio and progress from game state", () => {
    const { state } = setup(s => { s.xp = 40; s.cash = 4321; s.missions[0].progress = s.missions[0].target; s.missions[0].claimed = false; });
    expect(screen.getByText(`40 / 150 XP to Trader`)).toBeTruthy();
    expect(within(screen.getByText("Cash").parentElement!).getByText(/4,321/)).toBeTruthy();
    expect(screen.getByText(/Ready to claim: 1/)).toBeTruthy();
    expect(screen.getByText(`${state.achievements.length} / ${ACHIEVEMENTS.length}`)).toBeTruthy();
  });

  it("navigates to sub-views and back, and routes settings", () => {
    const { handlers } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Open settings" }));
    expect(handlers.onOpenSettings).toHaveBeenCalled();
    fireEvent.click(screen.getByText("History"));
    expect(screen.getByText("No transactions yet.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to account" }));
    fireEvent.click(screen.getByText("Bank & empire"));
    expect(screen.getByText("Empire panels")).toBeTruthy();
  });
});
