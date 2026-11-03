import { describe, expect, it } from "vitest";
import { createGameState, migrateLegacySave, calculateNetWorth, bankAction, buildingAction, cryptoTradeAction, advanceGameDay, restoreMarketSnapshot, hydrateGameState } from "@/lib/game-engine";
import { createMarket } from "@/lib/market";

describe("full simulator game engine", () => {
  const market = createMarket();

  it("migrates the original Ticker save without losing game progress", () => {
    const legacy = {
      profileName:"Sam",cash: 1200, holdings: { MSFT: 2.5, GOOGL: 3 }, costs: { MSFT: 900, GOOGL: 420 },
      savings: 500, loan: 200, buildings: [{name:"Coffee Cafe",icon:"☕",cost:1800,value:2200,income:1.35,level:2}],
      achievements: ["First Profit", "Landlord"], watch: ["MSFT", "NVDA"],
      settings: {speed:2,sound:false,haptics:true,theme:"dark"}, best:15000,start:10000,
      history:[{v:12000,t:1}], dailyHistory:[{v:13000,t:1}], activity:[{type:"buy",ticker:"MSFT",qty:2.5,price:360,fee:0.45,day:4}],
      marketSnapshot:{regime:"Bull",day:9,minute:615,stocks:{}}, prngSeed:1234, eventsNextAt:98765,
      news:[{id:1,headline:"Test",body:"Body",tickers:["MSFT"],sentiment:1,day:9,type:"earnings"}],
      pendingNews:[{id:2,headline:"Rumour",body:"Pending",tickers:["MSFT"],sentiment:1,day:9,type:"rumor",after:4000,truth:true}]
    };
    const state = migrateLegacySave(legacy, market);
    expect(state.version).toBeGreaterThan(0);
    expect(state.profileName).toBe("Sam");
    expect(state.holdings.MSFT.quantity).toBe(2.5);
    expect(state.holdings.MSFT.averageCost).toBeCloseTo(360);
    expect(state.savings).toBe(500);
    expect(state.loan).toBe(200);
    expect(state.buildings[0].level).toBe(2);
    expect(state.achievements).toContain("Landlord");
    expect(state.watchlist).toEqual(["MSFT", "NVDA"]);
    expect(state.settings.speed).toBe(2);
    expect(state.history).toEqual([{v:12000,t:1}]);
    expect(state.market.regime).toBe("Bull");
    expect(state.prngSeed).toBe(1234);
    expect(state.pendingNews).toHaveLength(1);
  });

  it("values the complete portfolio including property and debt", () => {
    const state = createGameState();
    state.cash = 1000;
    state.savings = 250;
    state.loan = 100;
    state.holdings.MSFT = {quantity:2,averageCost:300};
    state.buildings = [{id:"cafe-1",name:"Coffee Cafe",icon:"☕",cost:1800,value:2000,income:1.35,level:1}];
    const msft = market.find(stock => stock.ticker === "MSFT")!;
    expect(calculateNetWorth(state, market)).toBeCloseTo(1000+250-100+2000+2*msft.price);
  });

  it("supports bank deposit, withdrawal, borrowing and repayment with atomic validation", () => {
    const state = createGameState();
    state.cash = 1000;
    expect(bankAction(state, market, "deposit", 300).ok).toBe(true);
    expect(state.cash).toBe(700);
    expect(state.savings).toBe(300);
    expect(bankAction(state, market, "withdraw", 500).ok).toBe(false);
    expect(state.savings).toBe(300);
    expect(bankAction(state, market, "withdraw", 100).ok).toBe(true);
    expect(state.cash).toBe(800);
    expect(state.savings).toBe(200);
    expect(bankAction(state, market, "borrow", 100).ok).toBe(true);
    expect(state.loan).toBe(100);
    expect(bankAction(state, market, "repay", 50).ok).toBe(true);
    expect(state.loan).toBe(50);
    expect(state.cash).toBe(850);
  });

  it("buys, upgrades and sells properties using the original simulator economics", () => {
    const state = createGameState();
    state.cash = 5000;
    expect(buildingAction(state, market, "buy", "Coffee Cafe").ok).toBe(true);
    expect(state.cash).toBe(3200);
    expect(state.buildings[0].value).toBe(1800);
    expect(buildingAction(state, market, "upgrade", state.buildings[0].id).ok).toBe(true);
    expect(state.buildings[0].level).toBe(2);
    expect(state.buildings[0].income).toBeCloseTo(1.35*1.55);
    expect(buildingAction(state, market, "sell", state.buildings[0].id).ok).toBe(true);
    expect(state.buildings).toHaveLength(0);
    expect(state.cash).toBeGreaterThan(3200);
  });

  it("credits daily savings interest and accrues loan interest and minimum repayment once per day", () => {
    const state = createGameState();
    state.cash = 1000;
    state.savings = 3650;
    state.loan = 3650;
    state.lastBankDay = 1;
    const result = advanceGameDay(state, market);
    expect(result.state.savings).toBeCloseTo(3650*(1+.035/365));
    expect(result.state.loan).toBeCloseTo(3650*(1+.12/365)-3650*(1+.12/365)*.02);
    const again = advanceGameDay(result.state, result.market);
    expect(again.state.savings).toBeCloseTo(result.state.savings);
  });
  it("uses the current market price when a legacy save has no usable cost basis", () => {
    const state = migrateLegacySave({ cash: 1000, holdings: { MSFT: 2 }, costs: {} }, market);
    expect(state.holdings.MSFT.averageCost).toBe(market.find(stock => stock.ticker === "MSFT")!.price);
  });

  it("repairs missing cost basis when hydrating a version-two save", () => {
    const state = hydrateGameState({ version: 2, holdings: { MSFT: { quantity: 2 } } }, market);
    expect(state.holdings.MSFT.averageCost).toBe(market.find(stock => stock.ticker === "MSFT")!.price);
  });

});