import { test, expect } from 'bun:test';
import { backtestInputSchema, cryptoStrategySettingsSchema } from '../src/features/backtests/validation';

const strategy = { id: 'ema', fastPeriod: 20, slowPeriod: 50, lookback: 20, atrPeriod: 14, stopAtr: 2, rewardRisk: 1.5 } as const;
const simulation = { initialCapital: 1000, leverage: 2, riskPerTradePct: 1, maxMarginPct: 25, feeBps: 5, slippageBps: 2, fundingRatePct8h: 0, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5, maxDailyLossPct: 5, direction: 'both' } as const;
const backtest = { symbol: 'BTCUSD', timeframe: '1h', start: 1700000000, end: 1700864000, strategy, simulation };
const agentConfig = { symbol: 'BTCUSD', timeframe: '1h', strategy, simulation };

test('adaptive execution rules are optional for legacy configs and accept version 1', () => {
  expect(backtestInputSchema.parse(backtest).strategy.executionRules).toBeUndefined();
  expect(cryptoStrategySettingsSchema.parse(agentConfig).strategy.executionRules).toBeUndefined();

  const enabledStrategy = { ...strategy, executionRules: { version: 1 as const } };
  expect(backtestInputSchema.parse({ ...backtest, strategy: enabledStrategy }).strategy.executionRules).toEqual({ version: 1 });
  expect(cryptoStrategySettingsSchema.parse({ ...agentConfig, strategy: enabledStrategy }).strategy.executionRules).toEqual({ version: 1 });
});

test('adaptive execution rules reject unsupported versions and extra properties', () => {
  for (const executionRules of [{ version: 2 }, { version: 1, experimental: true }]) {
    expect(backtestInputSchema.safeParse({ ...backtest, strategy: { ...strategy, executionRules } }).success).toBe(false);
    expect(cryptoStrategySettingsSchema.safeParse({ ...agentConfig, strategy: { ...strategy, executionRules } }).success).toBe(false);
  }
});

test('v2 requires an explicit valid EMA entry source and round trips on edit',()=>{
 for(const emaEntry of ['crossover','trend','combined'] as const){
  const executionRules={version:2 as const,emaEntry};
  expect(cryptoStrategySettingsSchema.parse({...agentConfig,strategy:{...strategy,executionRules}}).strategy.executionRules).toEqual(executionRules);
 }
 expect(backtestInputSchema.safeParse({...backtest,strategy:{...strategy,executionRules:{version:2,emaEntry:'always'}}}).success).toBe(false);
 expect(backtestInputSchema.safeParse({...backtest,strategy:{...strategy,executionRules:{version:3,emaEntry:'trend'}}}).success).toBe(false);
});
