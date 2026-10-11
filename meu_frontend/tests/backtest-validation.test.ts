import { test, expect } from 'bun:test';
import { backtestInputSchema } from '../src/features/backtests/validation';
import { resolveDailyLossLimitPct } from '../src/features/backtests/daily-loss';
const input = { symbol: 'BTCUSD', timeframe: '1h', start: 1700000000, end: 1700864000, strategy: { id: 'ema', fastPeriod: 20, slowPeriod: 50, lookback: 20, atrPeriod: 14, stopAtr: 2, rewardRisk: 1.5 }, simulation: { initialCapital: 1000, leverage: 2, riskPerTradePct: 1, maxMarginPct: 25, feeBps: 5, slippageBps: 2, fundingRatePct8h: 0, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5, maxDailyLossPct: 5, direction: 'both' } };
test('backtest rejects excessive date range and unbounded execution settings', () => {
    expect(backtestInputSchema.safeParse(input).success).toBe(true);
    for (const simulation of [{ ...input.simulation, leverage: 100 }, { ...input.simulation, initialCapital: -1 }, { ...input.simulation, maxTradesPerDay: 0 }, { ...input.simulation, fundingRatePct8h: NaN }])
        expect(backtestInputSchema.safeParse({ ...input, simulation }).success).toBe(false);
    expect(backtestInputSchema.safeParse({ ...input, end: input.start + 10001 * 3600 }).success).toBe(false);
    expect(backtestInputSchema.safeParse({ ...input, end: input.start + 3600 }).success).toBe(false);
});
test('market input does not accept URLs or illegal strategy periods', () => {
    expect(backtestInputSchema.safeParse({ ...input, symbol: 'https://localhost' }).success).toBe(false);
    expect(backtestInputSchema.safeParse({ ...input, strategy: { ...input.strategy, fastPeriod: 50 } }).success).toBe(false);
    expect(backtestInputSchema.parse(input).periodRole).toBe('research');
});

test('optional entry timing preserves old configs and validates confirmation windows', () => {
    const legacy = backtestInputSchema.parse(input);
    expect(legacy.strategy.entryTiming).toBeUndefined();
    const strategy = {...input.strategy, entryTiming:{mode:'confirm' as const,confirmationBars:1,maxWaitBars:3,cooldownBars:2}};
    expect(backtestInputSchema.parse({...input,strategy}).strategy.entryTiming).toEqual(strategy.entryTiming);
    for (const entryTiming of [
        {...strategy.entryTiming,mode:'unknown'},
        {...strategy.entryTiming,confirmationBars:0},
        {...strategy.entryTiming,maxWaitBars:21},
        {...strategy.entryTiming,cooldownBars:-1},
        {...strategy.entryTiming,confirmationBars:4,maxWaitBars:3},
    ]) expect(backtestInputSchema.safeParse({...input,strategy:{...strategy,entryTiming}}).success).toBe(false);
});

test('automatic daily loss follows risk independently from disclosure; custom limits stay explicit', () => {
    expect(resolveDailyLossLimitPct(true, 1, 7)).toBe(3);
    expect(resolveDailyLossLimitPct(true, 4, 7)).toBe(12);
    expect(resolveDailyLossLimitPct(true, 40, 7)).toBe(100);
    expect(resolveDailyLossLimitPct(false, 1, 7)).toBe(7);
});

test('Delta settings automatically use India midnight and reject a mismatched zone', () => {
    expect(backtestInputSchema.parse(input).simulation.dailyTimezone).toBe('Asia/Kolkata');
    expect(backtestInputSchema.safeParse({...input,simulation:{...input.simulation,dailyTimezone:'UTC'}}).success).toBe(false);
});
