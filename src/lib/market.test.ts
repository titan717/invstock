import { describe, expect, it } from "vitest";
import { advanceMarket, createMarket } from "@/lib/market";

describe("simulated market engine", () => {
  it("produces deterministic quote movement for the same seed", () => {
    const market=createMarket();
    expect(advanceMarket(market,12345,"Bull")).toEqual(advanceMarket(market,12345,"Bull"));
  });
  it("changes market movement under different regimes", () => {
    const market=createMarket();
    const bull=advanceMarket(market,12345,"Bull");
    const panic=advanceMarket(market,12345,"Panic");
    expect(bull.some((stock,index)=>stock.price!==panic[index].price)).toBe(true);
  });
});
