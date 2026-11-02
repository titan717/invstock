import { describe, expect, it } from "vitest";
import { generateOptionChain } from "@/lib/options-engine";
import { createMarket } from "@/lib/market";

describe("simulated options chain", () => {
  const nvda=createMarket().find(stock=>stock.ticker==="NVDA")!;
  it("builds strikes around the actual underlying price with positive bid and ask quotes", () => {
    const chain=generateOptionChain(nvda,14,"call");
    expect(chain.length).toBeGreaterThanOrEqual(11);
    expect(chain[0].strike).toBeLessThan(nvda.price);
    expect(chain.at(-1)!.strike).toBeGreaterThan(nvda.price);
    expect(chain.every(option=>option.bid>0&&option.ask>=option.bid&&option.mark>0)).toBe(true);
  });
  it("returns put deltas below zero and call deltas above zero", () => {
    const calls=generateOptionChain(nvda,30,"call");
    const puts=generateOptionChain(nvda,30,"put");
    expect(calls.every(option=>option.delta>=0&&option.delta<=1)).toBe(true);
    expect(puts.every(option=>option.delta<=0&&option.delta>=-1)).toBe(true);
  });
  it("increases time value when the expiry is extended", () => {
    const short=generateOptionChain(nvda,7,"call");
    const long=generateOptionChain(nvda,45,"call");
    const atTheMoneyShort=short.reduce((best,item)=>Math.abs(item.strike-nvda.price)<Math.abs(best.strike-nvda.price)?item:best);
    const atTheMoneyLong=long.reduce((best,item)=>Math.abs(item.strike-nvda.price)<Math.abs(best.strike-nvda.price)?item:best);
    expect(atTheMoneyLong.mark).toBeGreaterThan(atTheMoneyShort.mark);
  });
});
