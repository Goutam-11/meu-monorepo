import { describe, expect, test } from 'bun:test';
import { chartInputSchema, loadChartCandles, normalizeChartCandles, searchChartSymbols } from '../src/features/charts/server/data';
import { agentChartSymbol, type ChartCandle } from '../src/features/charts/types';
import { chartEma, chartRsi, chartBollinger } from '../src/features/charts/indicators';

const bar = (time: number, close = 10): ChartCandle => ({ time, open: close, high: close + 1, low: close - 1, close, volume: 20 });
const response = (json: unknown) => (async () => Response.json(json)) as unknown as typeof fetch;

describe('chart data boundary', () => {
  test('rejects URL-like symbols, invalid intervals and impossible candle payloads', () => {
    expect(chartInputSchema.safeParse({ source: 'YAHOO', symbol: 'https://private/', interval: '15m' }).success).toBe(false);
    expect(chartInputSchema.safeParse({ source: 'DELTA', symbol: 'BTCUSD', interval: '1s' }).success).toBe(false);
    expect(normalizeChartCandles([bar(100, 11), bar(50), bar(100, 12), { ...bar(60), high: 1 }, { ...bar(70), volume: -1 }, { ...bar(80), close: NaN }, bar(500)], 200_000)).toEqual([bar(50), bar(100, 12)]);
  });
  test('Yahoo maps nullable candles, real currency and provider timestamps without inventing data', async () => {
    let requested = '';
    const fake = (async (url: URL) => {
      requested = url.toString();
      return Response.json({ chart: { result: [{ meta: { currency: 'INR', regularMarketTime: 200, exchangeTimezoneName: 'Asia/Kolkata' }, timestamp: [100, 200], indicators: { quote: [{ open: [10, null], high: [12, null], low: [9, null], close: [11, null], volume: [0, null] }] } }] } });
    }) as unknown as typeof fetch;
    const data = await loadChartCandles({ source: 'YAHOO', symbol: '^NSEI', interval: '1h' }, fake);
    expect(new URL(requested).hostname).toBe('query1.finance.yahoo.com');
    expect(new URL(requested).searchParams.get('interval')).toBe('60m');
    expect(data.currency).toBe('INR'); expect(data.latestQuoteAt).toBe(200_000);
    expect(data.candles).toHaveLength(1); expect(data.candles[0].close).toBe(11);
  });
  test('Delta and Binance use their own price feeds and normalize timestamp units', async () => {
    const delta = await loadChartCandles({ source: 'DELTA', symbol: 'BTCUSD', interval: '15m' }, response({ success: true, result: [{ time: 100, open: '10', high: '12', low: '9', close: '11', volume: '3' }] }));
    const binance = await loadChartCandles({ source: 'BINANCE', symbol: 'BTCUSDT', interval: '15m' }, response([[100_000, '10', '12', '9', '11', '3']]));
    expect(delta.candles).toEqual(binance.candles); expect(delta.currency).toBe('USD'); expect(binance.currency).toBe('USDT');
  });
  test('rate limits and invalid/empty responses produce useful sanitized errors', async () => {
    const input = { source: 'YAHOO' as const, symbol: '^NSEI', interval: '15m' as const };
    await expect(loadChartCandles(input, (async () => new Response('private upstream token', { status: 429 })) as unknown as typeof fetch)).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
    await expect(loadChartCandles(input, response({ chart: { result: null } }))).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(loadChartCandles(input, (async () => { throw new Error('sensitive upstream details'); }) as unknown as typeof fetch)).rejects.toThrow('Yahoo market data timed out');
  });
  test('Delta catalog filters live USD perpetuals and requests a bounded perpetual catalog', async () => {
    const fake = (async (url: URL) => {
      expect(url.searchParams.get('contract_types')).toBe('perpetual_futures');
      return Response.json({ success: true, meta: { after: null }, result: [
        { symbol: 'BTCUSD', contract_type: 'perpetual_futures', state: 'live', settling_asset: { symbol: 'USD' } },
        { symbol: 'BTCOPTION', contract_type: 'call_options', state: 'live', settling_asset: { symbol: 'USD' } },
        { symbol: 'OLDUSD', contract_type: 'perpetual_futures', state: 'expired', settling_asset: { symbol: 'USD' } },
      ] });
    }) as unknown as typeof fetch;
    expect((await searchChartSymbols('DELTA', 'BTC', fake)).map(m => m.symbol)).toEqual(['BTCUSD']);
  });
  test('agent symbols retain the correct venue and settlement', () => {
    expect(agentChartSymbol('DELTA', 'BTC/USD:USD')).toEqual({ source: 'DELTA', symbol: 'BTCUSD' });
    expect(agentChartSymbol('BINANCE', 'SOL/USDT:USDT')).toEqual({ source: 'BINANCE', symbol: 'SOLUSDT' });
    expect(agentChartSymbol('ZERODHA', 'RELIANCE')).toEqual({ source: 'YAHOO', symbol: 'RELIANCE.NS' });
    expect(agentChartSymbol('ZERODHA', 'NIFTY 50')).toEqual({ source: 'YAHOO', symbol: '^NSEI' });
    expect(agentChartSymbol('UNKNOWN', 'BTC')).toBeNull();
  });
});

test('indicators handle warmup, monotonic moves and flat prices', () => {
  const rising = Array.from({ length: 60 }, (_, i) => bar(i + 1, i + 10));
  const flat = Array.from({ length: 60 }, (_, i) => bar(i + 1));
  expect(chartEma(rising.slice(0, 10), 20)).toEqual([]);
  expect(chartEma(rising, 20)[0].value).toBeCloseTo(19.5);
  expect(chartRsi(rising).at(-1)?.value).toBe(100);
  expect(chartRsi([...rising].map((c, i) => ({ ...c, close: 100 - i }))).at(-1)?.value).toBe(0);
  expect(chartRsi(flat).at(-1)?.value).toBe(50);
  expect(chartBollinger(flat).upper.at(-1)?.value).toBe(10);
  expect(chartBollinger(flat).lower.at(-1)?.value).toBe(10);
});
