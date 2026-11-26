import { describe, expect, test } from "bun:test";
import { resolveStrategyDefinition, STRATEGY_DEFINITIONS, type StrategyConfig } from "../../../shared/trading/strategies";

const base: StrategyConfig = {
  id: "ema", fastPeriod: 12, slowPeriod: 26, lookback: 20, atrPeriod: 14, stopAtr: 2, rewardRisk: 2,
};

describe("explicit strategy definitions", () => {
  test("maps legacy, adaptive-v1 and adaptive-v2 configurations without changing the saved shape", () => {
    expect(resolveStrategyDefinition(base)).toMatchObject({ adaptive: false, regime: false, emaEntry: "combined" });
    expect(resolveStrategyDefinition({ ...base, executionRules: { version: 1 } })).toMatchObject({ adaptive: true, regime: false, emaEntry: "combined" });
    expect(resolveStrategyDefinition({ ...base, executionRules: { version: 2, emaEntry: "crossover" } })).toMatchObject({ adaptive: true, regime: true, emaEntry: "crossover" });
    expect(resolveStrategyDefinition({ ...base, executionRules: { version: 2, emaEntry: "trend" } })).toMatchObject({ adaptive: true, regime: true, emaEntry: "trend" });
    expect(resolveStrategyDefinition({ ...base, executionRules: { version: 2, emaEntry: "combined" } })).toMatchObject({ adaptive: true, regime: true, emaEntry: "combined" });
  });

  test("each ruleset owns a callable prepare function", () => {
    for (const definition of Object.values(STRATEGY_DEFINITIONS)) {
      expect(definition.id).toBeTruthy();
      expect(definition.version).toBeTruthy();
      const prepared = definition.prepare([], base);
      expect(Array.isArray(prepared.signals)).toBe(true);
      expect(Array.isArray(prepared.entryProposals)).toBe(true);
    }
  });
});
