import { expect, test } from 'bun:test';
import { evaluateStrategy, prepareStrategy, STRATEGY_VERSION, validateStrategy, type StrategyConfig } from '../../../shared/trading/strategies';
import type { Candle } from '../../../shared/trading/emaCrossover';

const config: StrategyConfig = {
    id: 'ema', fastPeriod: 2, slowPeriod: 8, lookback: 5, atrPeriod: 3, stopAtr: 2, rewardRisk: 2,
    executionRules: { version: 1 },
    entryTiming: { mode: 'confirm', confirmationBars: 2, maxWaitBars: 4, cooldownBars: 0 },
};
const candles = (closes: number[], wick = 0.3): Candle[] => closes.map((close, i) => ({
    timestamp: 1_000 + i * 60, open: close, high: close + wick, low: close - wick, close, volume: 1, closed: true,
}));
const uptrend = [...Array<number>(9).fill(100), 102, 104, 106, 108, 110, 112, 114, 116, 115, 116, 118, 120, 122, 124];

test('legacy EMA confirmation retains exact arrays and strategy version', () => {
    const legacy: StrategyConfig = { ...config, executionRules: undefined, slowPeriod: 3, lookback: 3, atrPeriod: 2,
        entryTiming: { mode: 'confirm', confirmationBars: 1, maxWaitBars: 3, cooldownBars: 0 } };
    const prepared = prepareStrategy(candles([100, 100, 100, 110, 111, 112, 113, 114, 115], 1), legacy);
    expect(STRATEGY_VERSION).toBe('1.1.0');
    expect(prepared.signals).toEqual(['hold', 'hold', 'hold', 'hold', 'long', 'hold', 'hold', 'hold', 'hold']);
    expect(prepared.rawSignals).toEqual(['hold', 'hold', 'hold', 'long', 'hold', 'hold', 'hold', 'hold', 'hold']);
    expect(prepared.decisions).toEqual(['No new setup', 'No new setup', 'No new setup', 'Setup found; waiting for confirmation',
        'Closed-candle follow-through confirmed', 'No new setup', 'No new setup', 'No new setup', 'No new setup']);
    expect(prepared.atr).toEqual([undefined, 2, 2, 6.5, 4.25, 3.125, 2.5625, 2.28125, 2.140625]);
    expect(prepared.entryProposals.every(p => p === undefined)).toBe(true);
    expect(prepareStrategy(candles([100, 100, 100, 110, 111], 1), { ...legacy, entryTiming: undefined }).signals)
        .toEqual(['hold', 'hold', 'hold', 'long', 'hold']);
});

test('legacy Donchian retains repeated breakout signals and mean reversion retains generic exits', () => {
    const bars = candles([100, 100, 100, 102, 104, 106, 108]);
    expect(prepareStrategy(bars, { ...config, id: 'donchian', lookback: 3, executionRules: undefined, entryTiming: undefined }).signals)
        .toEqual(['hold', 'hold', 'hold', 'long', 'long', 'long', 'long']);
    const ranging = candles([...Array<number>(40).fill(100), 90, 95, 96, 97, 101, 98], 1);
    const mean = prepareStrategy(ranging, { ...config, id: 'meanReversion', lookback: 20, executionRules: undefined, entryTiming: undefined });
    expect(mean.signals.slice(40)).toEqual(['hold', 'long', 'hold', 'hold', 'exit', 'exit']);
});

test('all adaptive outputs equal evaluation of each causal prefix', () => {
    const bars = candles(Array.from({ length: 130 }, (_, i) => 100 + Math.sin(i * 0.4) * 4 + i * 0.05));
    for (const id of ['ema', 'donchian', 'meanReversion'] as const) {
        for (const mode of ['immediate', 'confirm', 'retest'] as const) {
            const c = { ...config, id, entryTiming: { ...config.entryTiming!, mode } };
            const full = prepareStrategy(bars, c);
            for (let length = 1; length <= bars.length; length++) {
                const prefix = prepareStrategy(bars.slice(0, length), c);
                for (const key of ['signals', 'rawSignals', 'decisions', 'atr', 'entryProposals', 'exitSignals', 'means'] as const)
                    expect(prefix[key]).toEqual(full[key].slice(0, length));
            }
        }
    }
});

test('a fresh EMA pullback reclaim creates a setup after its crossover has expired', () => {
    const bars = candles(uptrend);
    const c = { ...config, entryTiming: { ...config.entryTiming!, maxWaitBars: 2 } };
    const prepared = prepareStrategy(bars, c);
    expect(prepared.rawSignals[9]).toBe('long');
    expect(prepared.entryProposals[11]?.originTimestamp).toBe(bars[9]!.timestamp);
    expect(prepared.entryProposals.slice(12, 18).every(p => p === undefined)).toBe(true);
    // Fast remains above slow: this entry comes from a return above fast EMA.
    expect(prepared.rawSignals[18]).toBe('long');
    expect(prepared.entryProposals[20]?.originTimestamp).toBe(bars[18]!.timestamp);
    expect(prepared.entryProposals[20]?.id).not.toBe(prepared.entryProposals[11]?.id);
});

test('confirmed EMA proposal repeats with fixed ID and original exclusive expiry, then expires', () => {
    const bars = candles(uptrend);
    const prepared = prepareStrategy(bars, config);
    const proposal = prepared.entryProposals[11]!;
    expect(proposal).toMatchObject({ originTimestamp: bars[9]!.timestamp, confirmedTimestamp: bars[11]!.timestamp,
        expiresTimestamp: bars[9]!.timestamp + 5 * 60 });
    expect(prepared.entryProposals[12]).toEqual(proposal);
    expect(prepared.entryProposals[13]).toEqual(proposal);
    expect(prepared.entryProposals[14]).toBeUndefined();
    expect(prepared.entryProposals.slice(14, 18).every(p => p === undefined)).toBe(true);
});

test('EMA does not enter a tiny trend or an excessively extended crossover', () => {
    const immediate = { ...config, entryTiming: { ...config.entryTiming!, mode: 'immediate' as const } };
    const tiny = prepareStrategy(candles([...Array<number>(9).fill(100), 100.001], 1), immediate);
    expect(tiny.rawSignals.at(-1)).toBe('long');
    expect(tiny.entryProposals.at(-1)).toBeUndefined();
    // A very long slow EMA leaves price far from fast EMA on this shock.
    const shock = prepareStrategy(candles([...Array<number>(21).fill(100), 130], 0.01), { ...immediate, fastPeriod: 10, slowPeriod: 20, atrPeriod: 14 });
    expect(shock.rawSignals.at(-1)).toBe('long');
    expect(shock.entryProposals.at(-1)).toBeUndefined();
});

test('Donchian retains confirmation, never renews a continuing breakout, and rearms after reset', () => {
    const bars = candles([100, 100, 100, 102, 103, 104, 105, 106, 107, 100, 100, 100, 103, 104, 105]);
    const c = { ...config, id: 'donchian' as const, lookback: 3, entryTiming: { ...config.entryTiming!, confirmationBars: 1, maxWaitBars: 3 } };
    const prepared = prepareStrategy(bars, c);
    expect(prepared.entryProposals[4]?.originTimestamp).toBe(bars[3]!.timestamp);
    expect(prepared.entryProposals[5]).toEqual(prepared.entryProposals[4]);
    expect(prepared.entryProposals[6]).toEqual(prepared.entryProposals[4]);
    expect(prepared.entryProposals.slice(7, 13).every(p => p === undefined)).toBe(true);
    expect(prepared.rawSignals.slice(4, 9)).toEqual(Array(5).fill('hold'));
    expect(prepared.entryProposals[13]?.originTimestamp).toBe(bars[12]!.timestamp);
});

test('Donchian retest confirms on a wick reclaim without extending the setup expiry', () => {
    const bars = candles([100, 100, 100, 102, 102.5, 103, 104, 105]);
    bars[4]!.low = 100.2;
    const prepared = prepareStrategy(bars, { ...config, id: 'donchian', lookback: 3,
        entryTiming: { mode: 'retest', confirmationBars: 1, maxWaitBars: 3, cooldownBars: 0 } });
    expect(prepared.entryProposals[3]).toBeUndefined();
    expect(prepared.entryProposals[4]).toMatchObject({ originTimestamp: bars[3]!.timestamp,
        confirmedTimestamp: bars[4]!.timestamp, expiresTimestamp: bars[3]!.timestamp + 4 * 60 });
    expect(prepared.entryProposals[6]).toEqual(prepared.entryProposals[4]);
    expect(prepared.entryProposals[7]).toBeUndefined();
});

test('level failure invalidates a confirmed proposal immediately', () => {
    const bars = candles([100, 100, 100, 102, 103, 100]);
    const prepared = prepareStrategy(bars, { ...config, id: 'donchian', lookback: 3,
        entryTiming: { mode: 'immediate', confirmationBars: 1, maxWaitBars: 4, cooldownBars: 0 } });
    expect(prepared.entryProposals[3]).toBeDefined();
    expect(prepared.entryProposals[5]).toBeUndefined();
});

test('mean reversion qualifies the pre-excursion range and provides favorable side-specific mean exits', () => {
    const c = { ...config, id: 'meanReversion' as const, lookback: 20, entryTiming: undefined };
    const bars = candles([...Array<number>(40).fill(100), 90, 95, 96, 97, 101, 98], 1);
    const prepared = prepareStrategy(bars, c);
    expect(prepared.entryProposals[41]?.side).toBe('long');
    expect(prepared.exitSignals[44]).toBe('long');
    expect(prepared.exitSignals[45]).toBe('short');
    expect(prepared.entryProposals[44]).toBeUndefined();
    const rising = candles([...Array<number>(40).fill(100), 110, 105, 104, 103, 99, 102], 1);
    const mirrored = prepareStrategy(rising, c);
    expect(mirrored.entryProposals[41]?.side).toBe('short');
    expect(mirrored.exitSignals[44]).toBe('short');
    expect(mirrored.exitSignals[45]).toBe('long');
    const trend = candles([...Array.from({ length: 40 }, (_, i) => 180 - i * 2), 70, 90], 1);
    expect(prepareStrategy(trend, { ...c, executionRules: undefined }).rawSignals.at(-1)).toBe('long');
    expect(prepareStrategy(trend, c).entryProposals.at(-1)).toBeUndefined();
});

test('evaluation forwards the latest completed proposal and excludes forming candles and pre-activation setups', () => {
    const bars = candles(uptrend.slice(0, 13));
    bars.push({ ...bars.at(-1)!, timestamp: bars.at(-1)!.timestamp + 60, close: 10, low: 10, closed: false });
    const evaluated = evaluateStrategy(bars, config);
    expect(evaluated.entryProposal).toEqual(prepareStrategy(bars.slice(0, -1), config).entryProposals.at(-1));
    expect(evaluated.mean).toBe(prepareStrategy(bars.slice(0, -1), config).means.at(-1));
    expect(evaluateStrategy(bars, config, bars[10]!.timestamp).entryProposal).toBeUndefined();
    expect(() => validateStrategy({ ...config, executionRules: { version: 2 } } as unknown as StrategyConfig)).toThrow('execution rules');
});
