import { describe, expect, test } from "bun:test";
import { evaluateEmaCrossover, runBacktest, type Candle } from "../src/algorithms/emaCrossover";

const config = { fastPeriod: 2, slowPeriod: 3, initialCapital: 1_000, quantity: 1, feeBps: 0, slippageBps: 0 };

function candles(closes: number[], opens: number[] = closes): Candle[] {
  return closes.map((close, i) => ({
    timestamp: i + 1,
    open: opens[i] ?? close,
    high: Math.max(opens[i] ?? close, close),
    low: Math.min(opens[i] ?? close, close),
    close,
    volume: 100,
    closed: true,
  }));
}

describe("EMA crossover evaluator", () => {
  test("holds during warmup and when there is no crossover", () => {
    expect(evaluateEmaCrossover(candles([10, 10, 10]), config, false)).toEqual({ action: "hold" });
    expect(evaluateEmaCrossover(candles([10, 10, 10, 10]), config, false)).toEqual({ action: "hold" });
  });

  test("emits long-only entry and exit on closed-candle crossovers", () => {
    const bars = candles([10, 10, 10, 12, 10]);
    expect(evaluateEmaCrossover(bars.slice(0, 4), config, false)).toEqual({ action: "enter", reason: "bullish_ema_crossover" });
    expect(evaluateEmaCrossover(bars, config, true)).toEqual({ action: "exit", reason: "bearish_ema_crossover" });
    expect(evaluateEmaCrossover(bars, config, false)).toEqual({ action: "hold" });
  });

  test("ignores an unfinished candle", () => {
    const bars = candles([10, 10, 10, 12]);
    bars.push({ ...bars[3]!, timestamp: 5, close: 1, low: 1, closed: false });
    expect(evaluateEmaCrossover(bars, config, false)).toEqual({ action: "enter", reason: "bullish_ema_crossover" });
  });
});

describe("EMA crossover backtest", () => {
  test("fills next open, uses no future bar to decide, and closes terminal position", () => {
    const bars = candles([10, 10, 10, 12, 10, 9], [10, 10, 10, 12, 13, 9]);
    const result = runBacktest(bars, config);
    expect(result.tradeCount).toBe(1);
    expect(result.trades[0]!.entryTimestamp).toBe(bars[4]!.timestamp);
    expect(result.trades[0]!.entryPrice).toBe(13);
    expect(result.trades[0]!.exitTimestamp).toBe(bars[5]!.timestamp);
    expect(result.trades[0]!.exitPrice).toBe(9);

    // Changing the next bar's open changes only the fill, not the signal made at bar 4's close.
    const changedFutureOpen = candles([10, 10, 10, 12, 10, 9], [10, 10, 10, 12, 20, 9]);
    expect(evaluateEmaCrossover(changedFutureOpen.slice(0, 4), config, false))
      .toEqual({ action: "enter", reason: "bullish_ema_crossover" });
    expect(runBacktest(changedFutureOpen, config).trades[0]!.entryPrice).toBe(20);
  });

  test("charges entry and exit fees and adverse slippage", () => {
    const bars = candles([10, 10, 10, 12, 10, 9], [10, 10, 10, 12, 13, 9]);
    const result = runBacktest(bars, { ...config, feeBps: 100, slippageBps: 100 });
    const entry = 13 * 1.01;
    const exit = 9 * 0.99;
    const fees = (entry + exit) * 0.01;
    expect(result.trades[0]!.entryPrice).toBeCloseTo(entry);
    expect(result.trades[0]!.exitPrice).toBeCloseTo(exit);
    expect(result.trades[0]!.fees).toBeCloseTo(fees);
    expect(result.trades[0]!.netPnl).toBeCloseTo(exit - entry - fees);
    expect(result.finalEquity).toBeCloseTo(config.initialCapital + result.trades[0]!.netPnl);
    expect(result.netReturnPct).toBeLessThan(0);
  });

  test("returns empty results for no completed candles", () => {
    const incomplete: Candle = { timestamp: 1, open: 10, high: 10, low: 10, close: 10, volume: 100, closed: false };
    const result = runBacktest([incomplete], config);
    expect(result.tradeCount).toBe(0);
    expect(result.finalEquity).toBe(config.initialCapital);
    expect(result.netReturnPct).toBe(0);
    expect(result.maxDrawdownPct).toBe(0);
    expect(result.winRatePct).toBe(0);
  });

  test("rejects invalid periods and cost configuration", () => {
    expect(() => evaluateEmaCrossover([], { fastPeriod: 3, slowPeriod: 3 }, false)).toThrow("fastPeriod < slowPeriod");
    expect(() => runBacktest([], { ...config, fastPeriod: 0 })).toThrow("fastPeriod < slowPeriod");
    expect(() => runBacktest([], { ...config, feeBps: -1 })).toThrow("fees and slippage");
  });
});
