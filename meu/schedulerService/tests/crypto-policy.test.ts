import { describe, expect, test } from "bun:test";
import { cryptoPolicyMismatch } from "../src/workers/cryptoPolicy";

const agent = {
  market: { symbols: ["XRPUSD"] },
  capital: { allocated: 1000, currency: "USD" },
  risk: { maxRiskPerTradePct: 0.5, maxDailyLossPct: 3, maxOpenPositions: 1, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 },
};

describe("crypto strategy policy refusal", () => {
  test("accepts a matched allocation and risk policy", () => {
    expect(cryptoPolicyMismatch({ simulation: { initialCapital: 1000, riskPerTradePct: 0.5, maxDailyLossPct: 3, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 } }, agent)).toBeUndefined();
  });

  test("names unsupported symbol and settlement values", () => {
    const message = cryptoPolicyMismatch(
      { simulation: { initialCapital: 1000, riskPerTradePct: 0.5, maxDailyLossPct: 3, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 } },
      { ...agent, market: { symbols: ["XRPUSD", "BTCUSD"] }, capital: { allocated: 1000, currency: "EUR" } },
    );
    expect(message).toContain("market.symbols.length=2 vs expected=1");
    expect(message).toContain("capital.currency=EUR vs expected=USD");
  });

  test("names the mismatched field and both values", () => {
    const message = cryptoPolicyMismatch({ simulation: { initialCapital: 900, riskPerTradePct: 0.75, maxDailyLossPct: 3, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 } }, agent);
    expect(message).toContain("simulation.initialCapital=900");
    expect(message).toContain("capital.allocated=1000");
    expect(message).toContain("simulation.riskPerTradePct=0.75");
    expect(message).toContain("risk.maxRiskPerTradePct=0.5");
  });

  test("names mismatched daily loss and trade caps", () => {
    const message = cryptoPolicyMismatch(
      { simulation: { initialCapital: 1000, riskPerTradePct: 0.5, maxDailyLossPct: 4, maxTradesPerDay: 7, maxPositionsOpenedPerDay: 2 } },
      agent,
    );
    expect(message).toContain("simulation.maxDailyLossPct=4 vs risk.maxDailyLossPct=3");
    expect(message).toContain("simulation.maxTradesPerDay=7 vs risk.maxTradesPerDay=10");
    expect(message).toContain("simulation.maxPositionsOpenedPerDay=2 vs risk.maxPositionsOpenedPerDay=5");
  });
});
