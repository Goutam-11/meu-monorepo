import type { ChartCandle } from './types';
export type ChartPoint = { time: number; value: number };

export function chartEma(candles: ChartCandle[], period: number): ChartPoint[] {
  if (!Number.isInteger(period) || period < 1 || candles.length < period) return [];
  let value = candles.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) / period;
  const result = [{ time: candles[period - 1].time, value }];
  for (let i = period; i < candles.length; i++) {
    value += 2 / (period + 1) * (candles[i].close - value);
    result.push({ time: candles[i].time, value });
  }
  return result;
}

export function chartRsi(candles: ChartCandle[], period = 14): ChartPoint[] {
  if (candles.length <= period) return [];
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = candles[i].close - candles[i - 1].close;
    gain += Math.max(delta, 0) / period;
    loss += Math.max(-delta, 0) / period;
  }
  const rsi = () => loss === 0 ? gain === 0 ? 50 : 100 : 100 - 100 / (1 + gain / loss);
  const result = [{ time: candles[period].time, value: rsi() }];
  for (let i = period + 1; i < candles.length; i++) {
    const delta = candles[i].close - candles[i - 1].close;
    gain = (gain * (period - 1) + Math.max(delta, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-delta, 0)) / period;
    result.push({ time: candles[i].time, value: rsi() });
  }
  return result;
}

export function chartBollinger(candles: ChartCandle[], period = 20) {
  const middle: ChartPoint[] = [], upper: ChartPoint[] = [], lower: ChartPoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const values = candles.slice(i - period + 1, i + 1).map(c => c.close);
    const mean = values.reduce((sum, value) => sum + value, 0) / period;
    const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / period);
    middle.push({ time: candles[i].time, value: mean });
    upper.push({ time: candles[i].time, value: mean + 2 * sd });
    lower.push({ time: candles[i].time, value: mean - 2 * sd });
  }
  return { middle, upper, lower };
}
