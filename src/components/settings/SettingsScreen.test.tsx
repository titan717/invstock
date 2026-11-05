import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsScreen, speedLabel } from "@/components/settings/SettingsScreen";
import { createGameState } from "@/lib/game-engine";

afterEach(cleanup);

function setup() {
  const settings = createGameState().settings;
  const handlers = { onBack: vi.fn(), onSpeed: vi.fn(), onSetting: vi.fn(), onAddCash: vi.fn(), onUnavailable: vi.fn(), onExport: vi.fn(), onImport: vi.fn(), onReset: vi.fn() };
  render(<SettingsScreen settings={settings} startingValue={10000} {...handlers} />);
  return handlers;
}

describe("SettingsScreen", () => {
  it("labels speeds", () => {
    expect(speedLabel(0)).toBe("Paused");
    expect(speedLabel(390)).toBe("390x");
  });

  it("toggles haptics, sound and live data from game settings", () => {
    const handlers = setup();
    expect(screen.getByRole("switch", { name: "Haptics" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("switch", { name: "Haptics" }));
    expect(handlers.onSetting).toHaveBeenCalledWith("haptics", false);
    fireEvent.click(screen.getByRole("switch", { name: "Sound effects" }));
    expect(handlers.onSetting).toHaveBeenCalledWith("sound", false);
    fireEvent.click(screen.getByRole("switch", { name: "Music" }));
    expect(handlers.onSetting).toHaveBeenCalledWith("music", true);
  });

  it("picks a market speed from the sheet", () => {
    const handlers = setup();
    fireEvent.click(screen.getByText("Market speed"));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Market speed" })).getByText("Turbo"));
    expect(handlers.onSpeed).toHaveBeenCalledWith(390);
  });

  it("confirms before resetting the account", () => {
    const handlers = setup();
    fireEvent.click(screen.getByRole("button", { name: "Reset account" }));
    const dialog = screen.getByRole("dialog", { name: "Reset your account?" });
    expect(within(dialog).getByText(/\$10,000/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset" }));
    expect(handlers.onReset).toHaveBeenCalled();
  });
});
