import { expect, test } from 'bun:test';
import type { Exchange, OHLCV } from 'ccxt';
import { analysisTimeframe, formatMarketAnalysis, getCompletedHistory, getIntradayIndicators, LlmMarketDataError } from '../src/agentFunctions/cmFunctions';
import { rsi } from '../src/agentFunctions/mIndicators';

const asOf = Date.UTC(2026, 9, 10, 12, 0, 20);
function candles(step = 60_000, count = 250): OHLCV[] {
  const boundary = Math.floor(asOf / step) * step;
  return Array.from({ length: count + 1 }, (_, i) => [boundary - (count - i) * step, 100, 102, 99, 101, 20]);
}
function fixture(rows: OHLCV[], maxPage = 200) {
  const calls: { timeframe: string; since: number; limit: number }[] = [];
  const exchange = { timeframes: { '1m': '1m', '15m': '15m', '4h': '4h', '1d': '1d' },
    fetchOHLCV: async (_symbol: string, timeframe: string, since: number, limit: number) => {
      calls.push({ timeframe, since, limit });
      return rows.filter(row => row[0]! >= since).slice(0, Math.min(limit, maxPage));
    },
  } as unknown as Exchange;
  return { exchange, calls };
}

test('analysis timeframe preserves missing legacy configuration and validates explicit choices', () => {
  expect(analysisTimeframe(undefined)).toBe('1m');
  for (const value of ['1m', '5m', '15m', '1h', '4h'] as const) expect(analysisTimeframe(value)).toBe(value);
  for (const value of [null, '', '1d', 300]) expect(() => analysisTimeframe(value)).toThrow('timeframe');
});

test('pagination requests recent bounded history, advances since, and excludes the forming candle', async () => {
  const rows = candles(); const { exchange, calls } = fixture(rows, 80);
  const history = await getCompletedHistory('1m', 'BTC/USD:USD', exchange, asOf);
  expect(history).toHaveLength(250);
  expect(history.at(-1)![0]).toBe(rows.at(-2)![0]);
  expect(calls).toHaveLength(4);
  expect(calls[0]).toEqual({ timeframe: '1m', since: rows[0]![0]!, limit: 200 });
  expect(calls[1]!.since).toBe(rows[80]![0]!);
  expect(calls.every(call => call.limit <= 200)).toBe(true);
  expect(history.some(row => row[0]! + 60_000 > asOf)).toBe(false);
});

test('selected timeframe defines since, completion time and aligned timestamped indicator rows', async () => {
  for (const [timeframe, step] of [['15m', 900_000], ['4h', 14_400_000], ['1d', 86_400_000]] as const) {
    const rows = candles(step); const { exchange, calls } = fixture(rows);
    const data = formatMarketAnalysis(await getIntradayIndicators(timeframe, 'BTC/USD:USD', 30, exchange, asOf));
    expect(calls[0]!.since).toBe(Math.floor(asOf / step) * step - 250 * step);
    expect(calls.every(call => call.timeframe === timeframe)).toBe(true);
    expect(data.timeframe).toBe(timeframe); expect(data.asOf).toBe(new Date(asOf).toISOString());
    expect(data.historyBars).toBe(250); expect(data.warmupBars).toBe(220); expect(data.candles).toHaveLength(30);
    expect(data.candles[0]!.openedAt).toBe(new Date(rows[220]![0]!).toISOString());
    expect(data.candles.at(-1)!.closedAt).toBe(data.completedThrough);
    expect(data.candles.every(row => Object.values(row.indicators).every(value => value !== null && Number.isFinite(value)))).toBe(true);
    expect(data.candles[0]).toMatchObject({ open: 100, high: 102, low: 99, close: 101, volume: 20 });
  }
});

test('fresh shorter venue histories have a disclosed warmup; below100 bars fail explicitly', async () => {
  const minimum = fixture(candles(60_000, 100));
  const data = formatMarketAnalysis(await getIntradayIndicators('1m', 'BTC', 30, minimum.exchange, asOf));
  expect(data.historyBars).toBe(100); expect(data.warmupBars).toBe(70); expect(data.historyNote).toContain('shorter');
  const insufficient = fixture(candles(60_000, 99));
  await expect(getCompletedHistory('1m', 'BTC', insufficient.exchange, asOf)).rejects.toMatchObject({ code: 'LLM_MARKET_DATA_INSUFFICIENT' });
});

test('stale, gaps, unordered, malformed OHLCV and bounded truncated pages cannot reach indicators', async () => {
  const stale = fixture(candles().slice(0, -2));
  await expect(getCompletedHistory('1m', 'BTC', stale.exchange, asOf)).rejects.toMatchObject({ code: 'LLM_MARKET_DATA_STALE' });
  for (const mutate of [
    (rows: OHLCV[]) => { rows.splice(200, 1); },
    (rows: OHLCV[]) => { [rows[0], rows[1]] = [rows[1]!, rows[0]!]; },
    (rows: OHLCV[]) => { rows[10]![2] = 98; },
    (rows: OHLCV[]) => { rows[10]![5] = NaN; },
    (rows: OHLCV[]) => { rows[10]![0] = rows[9]![0]; },
  ]) {
    const rows = candles(); mutate(rows); const { exchange } = fixture(rows);
    await expect(getCompletedHistory('1m', 'BTC', exchange, asOf)).rejects.toBeInstanceOf(LlmMarketDataError);
  }
  const truncated = fixture(candles(), 20);
  await expect(getCompletedHistory('1m', 'BTC', truncated.exchange, asOf)).rejects.toMatchObject({ code: 'LLM_MARKET_DATA_STALE' });
  expect(truncated.calls).toHaveLength(4);
});

test('transport errors have safe retryable data details and unsupported intervals fail configuration', async () => {
  const { exchange } = fixture(candles());
  exchange.fetchOHLCV = async () => { throw new Error('private URL with credentials'); };
  try { await getCompletedHistory('1m', 'BTC', exchange, asOf); throw new Error('must fail'); }
  catch (error) { expect(error).toBeInstanceOf(LlmMarketDataError); expect(String(error)).not.toContain('credentials'); }
  await expect(getCompletedHistory('5m', 'BTC', exchange, asOf)).rejects.toThrow('does not support');
});

test('Wilder RSI is neutral for flat prices and preserves unavailable warmup values', () => {
  expect(rsi(Array(40).fill(100), 14, 30).slice(-26)).toEqual(Array(26).fill(50));
  expect(rsi(candles(), 14, 30)).toEqual(Array(30).fill(50));
  expect(rsi([1, 1], 14, 1)).toEqual([null]);
  expect(rsi(Array.from({ length: 40 }, (_, i) => i + 1)).at(-1)).toBe(100);
  expect(rsi(Array.from({ length: 40 }, (_, i) => 40 - i)).at(-1)).toBe(0);
});


test('later pages cannot change the fixed snapshot when a new interval begins during fetching', async () => {
  const rows = candles(60_000, 100); const baseline = fixture(rows);
  const expected = formatMarketAnalysis(await getIntradayIndicators('1m', 'BTC', 30, baseline.exchange, asOf));
  rows.at(-1)![4] = 100_000; rows.at(-1)![2] = 100_000;
  rows.push([rows.at(-1)![0]! + 60_000, 100_000, 200_000, 99, 200_000, 100]);
  const changed = fixture(rows);
  const actual = formatMarketAnalysis(await getIntradayIndicators('1m', 'BTC', 30, changed.exchange, asOf));
  expect(actual).toEqual(expected);
});
