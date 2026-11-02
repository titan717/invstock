import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountGamePanels } from "@/components/account/AccountGamePanels";
import { createGameState } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

describe("full simulator account panels", () => {
  it("submits bank actions using the entered amount", () => {
    const state=createGameState();state.cash=1000;state.savings=250;
    const onBank=vi.fn();
    render(<AccountGamePanels state={state} stocks={createMarket()} onBank={onBank} onBuilding={vi.fn()} onSpeed={vi.fn()} onSetting={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} onReset={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Bank"}));
    fireEvent.change(screen.getByLabelText("Amount in USD"),{target:{value:"125"}});
    fireEvent.click(screen.getByRole("button",{name:"Deposit"}));
    expect(onBank).toHaveBeenCalledWith("deposit",125);
  });

  it("exposes buy, upgrade and sell actions for the property catalog and owned assets", () => {
    const state=createGameState();state.cash=5000;
    state.buildings=[{id:"cafe-1",name:"Coffee Cafe",icon:"☕",cost:1800,value:2200,income:1.35,level:2}];
    const onBuilding=vi.fn();
    render(<AccountGamePanels state={state} stocks={createMarket()} onBank={vi.fn()} onBuilding={onBuilding} onSpeed={vi.fn()} onSetting={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} onReset={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Buildings"}));
    fireEvent.click(screen.getByRole("button",{name:/Upgrade Coffee Cafe/}));
    expect(onBuilding).toHaveBeenCalledWith("upgrade","cafe-1");
    fireEvent.click(screen.getByRole("button",{name:/Buy Lemonade Stand/}));
    expect(onBuilding).toHaveBeenCalledWith("buy","Lemonade Stand");
  });

  it("shows achievement unlock status and sends simulator speed changes", () => {
    const state=createGameState();state.achievements=["First Profit"];
    const onSpeed=vi.fn();
    render(<AccountGamePanels state={state} stocks={createMarket()} onBank={vi.fn()} onBuilding={vi.fn()} onSpeed={onSpeed} onSetting={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} onReset={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Achievements"}));
    expect(screen.getByText("First Profit")).toBeTruthy();
    expect(screen.getByText("Unlocked")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"5×"}));
    expect(onSpeed).toHaveBeenCalledWith(4);
  });

  it("requires an explicit in-app confirmation before resetting progress", () => {
    const onReset=vi.fn();
    render(<AccountGamePanels state={createGameState()} stocks={createMarket()} onBank={vi.fn()} onBuilding={vi.fn()} onSpeed={vi.fn()} onSetting={vi.fn()} onImport={vi.fn()} onExport={vi.fn()} onReset={onReset}/>);
    fireEvent.click(screen.getByRole("button",{name:"Settings"}));
    fireEvent.click(screen.getByRole("button",{name:"Reset simulator"}));
    expect(onReset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Cancel"}));
    expect(onReset).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Reset simulator"}));
    fireEvent.click(screen.getByRole("button",{name:"Yes, reset everything"}));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
