import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { ChartCandle, ChartSource, ChartSymbol } from '../types';

export const chartInputSchema = z.object({
  source: z.enum(['YAHOO', 'DELTA', 'BINANCE']),
  symbol: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9^.&=_-]+$/).transform(value => value.toUpperCase()),
  interval: z.enum(['5m', '15m', '1h', '1d']),
});
const seconds = { '5m': 300, '15m': 900, '1h': 3600, '1d': 86400 };
type ChartInput = z.infer<typeof chartInputSchema>;
const MAX_BYTES = 2 * 1024 * 1024;
const rawCandle = z.object({ time: z.number().int().positive(), open: z.number().positive(), high: z.number().positive(), low: z.number().positive(), close: z.number().positive(), volume: z.number().nonnegative() });

/** Provider payloads are untrusted. Reject impossible OHLC, future timestamps and duplicate bars. */
export function normalizeChartCandles(rows: unknown[], now = Date.now()): ChartCandle[] {
  const candles = new Map<number, ChartCandle>();
  if (rows.length > 20_000) throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Market provider returned too many candles.' });
  for (const row of rows) {
    const parsed = rawCandle.safeParse(row);
    if (!parsed.success) continue;
    const candle = parsed.data;
    if (candle.time > Math.floor(now / 1000) + 60 || candle.high < Math.max(candle.open, candle.close, candle.low) || candle.low > Math.min(candle.open, candle.close, candle.high)) continue;
    candles.set(candle.time, candle);
  }
  return [...candles.values()].sort((a, b) => a.time - b.time).slice(-750);
}

async function providerJson(url: URL, provider: string, request: typeof fetch): Promise<unknown> {
  try {
    const response = await request(url, { signal: AbortSignal.timeout(12_000), cache: 'no-store', redirect: 'error', headers: { Accept: 'application/json', 'User-Agent': 'Meu/1.0' } });
    if (!response.ok) throw new TRPCError({ code: response.status === 429 ? 'TOO_MANY_REQUESTS' : 'BAD_GATEWAY', message: `${provider} market data ${response.status === 429 ? 'is rate limited' : `request failed (HTTP ${response.status})`}. Wait and retry; no orders were requested.` });
    if (!response.body) throw new Error('Empty response');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = '', size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new Error('Oversized response');
        text += decoder.decode(value, { stream: true });
      }
      return JSON.parse(text + decoder.decode());
    } finally { await reader.cancel(); }
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: 'BAD_GATEWAY', message: `${provider} market data timed out, could not connect or returned invalid data. Retry shortly. No orders were requested.` });
  }
}

const yahooEnvelope = z.object({ chart: z.object({ result: z.array(z.object({
  meta: z.object({ currency: z.string().optional(), regularMarketTime: z.number().optional(), exchangeTimezoneName: z.string().optional() }).passthrough(),
  timestamp: z.array(z.number()).optional(),
  indicators: z.object({ quote: z.array(z.object({ open: z.array(z.number().nullable()), high: z.array(z.number().nullable()), low: z.array(z.number().nullable()), close: z.array(z.number().nullable()), volume: z.array(z.number().nullable()).optional() })) }),
})).nullable() }) });
const numeric = (value: unknown) => typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;

export async function loadChartCandles(raw: ChartInput, request: typeof fetch = fetch) {
  const input = chartInputSchema.parse(raw);
  const fetchedAt = Date.now();
  let rows: unknown[] = [], currency = input.source === 'YAHOO' ? '' : input.source === 'DELTA' ? 'USD' : 'USDT';
  let latestQuoteAt: number | null = null;
  let timezone = 'UTC';
  if (input.source === 'YAHOO') {
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(input.symbol)}`);
    url.searchParams.set('interval', input.interval === '1h' ? '60m' : input.interval);
    url.searchParams.set('range', { '5m': '5d', '15m': '1mo', '1h': '3mo', '1d': '2y' }[input.interval]);
    url.searchParams.set('includePrePost', 'false');
    const parsed = yahooEnvelope.safeParse(await providerJson(url, 'Yahoo', request));
    const data = parsed.success ? parsed.data.chart.result?.[0] : undefined;
    const quote = data?.indicators.quote[0];
    if (!data || !quote) throw new TRPCError({ code: 'NOT_FOUND', message: 'Yahoo has no candle history for this symbol and interval. Try a daily interval or another symbol.' });
    currency = data.meta.currency ?? '';
    timezone = data.meta.exchangeTimezoneName ?? 'UTC';
    latestQuoteAt = data.meta.regularMarketTime ? data.meta.regularMarketTime * 1000 : null;
    rows = (data.timestamp ?? []).map((time, i) => ({ time, open: quote.open[i], high: quote.high[i], low: quote.low[i], close: quote.close[i], volume: quote.volume?.[i] ?? 0 }));
  } else if (input.source === 'DELTA') {
    const url = new URL('https://api.india.delta.exchange/v2/history/candles');
    url.searchParams.set('symbol', input.symbol);
    url.searchParams.set('resolution', input.interval);
    url.searchParams.set('start', String(Math.floor(fetchedAt / 1000) - seconds[input.interval] * 750));
    url.searchParams.set('end', String(Math.floor(fetchedAt / 1000)));
    const parsed = z.object({ success: z.literal(true), result: z.array(z.object({ time: z.number(), open: z.unknown(), high: z.unknown(), low: z.unknown(), close: z.unknown(), volume: z.unknown() })) }).safeParse(await providerJson(url, 'Delta India', request));
    if (!parsed.success) throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Delta India returned invalid candle history. Check the perpetual symbol and retry.' });
    rows = parsed.data.result.map(c => ({ time: c.time, open: numeric(c.open), high: numeric(c.high), low: numeric(c.low), close: numeric(c.close), volume: numeric(c.volume) }));
  } else {
    const url = new URL('https://fapi.binance.com/fapi/v1/klines');
    url.searchParams.set('symbol', input.symbol);
    url.searchParams.set('interval', input.interval);
    url.searchParams.set('limit', '750');
    const parsed = z.array(z.array(z.unknown()).min(6)).safeParse(await providerJson(url, 'Binance USD-M', request));
    if (!parsed.success) throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Binance returned invalid candle history. Check the USD-M symbol and retry.' });
    rows = parsed.data.map(c => ({ time: numeric(c[0]) / 1000, open: numeric(c[1]), high: numeric(c[2]), low: numeric(c[3]), close: numeric(c[4]), volume: numeric(c[5]) }));
  }
  const candles = normalizeChartCandles(rows, fetchedAt);
  if (!candles.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'No valid candles are available. Try another symbol or interval.' });
  return { ...input, candles, currency, timezone, fetchedAt, latestQuoteAt, lastCandleAt: candles.at(-1)!.time * 1000,
    warning: input.source === 'YAHOO' ? 'Yahoo is an unofficial research feed; data may be delayed, incomplete or unavailable. It is not a live execution feed.' : 'Public production exchange candles. The latest candle may still be forming. Broker order execution can differ from chart prices.' };
}

const suggestions: ChartSymbol[] = [
  { symbol: '^NSEI', name: 'Nifty 50', currency: 'INR' }, { symbol: '^NSEBANK', name: 'Nifty Bank', currency: 'INR' },
  { symbol: '^BSESN', name: 'BSE Sensex', currency: 'INR' }, { symbol: 'RELIANCE.NS', name: 'Reliance Industries', currency: 'INR' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', currency: 'INR' }, { symbol: 'INFY.NS', name: 'Infosys', currency: 'INR' },
];
const cryptoCatalogs = new Map<ChartSource, { markets: ChartSymbol[]; expires: number }>();
export async function searchChartSymbols(source: ChartSource, query: string, request: typeof fetch = fetch): Promise<ChartSymbol[]> {
  if (source === 'YAHOO') {
    if (!query) return suggestions;
    const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
    url.searchParams.set('q', query); url.searchParams.set('quotesCount', '20'); url.searchParams.set('newsCount', '0');
    const data = z.object({ quotes: z.array(z.object({ symbol: z.string(), shortname: z.string().optional(), longname: z.string().optional(), quoteType: z.string().optional() }).passthrough()) }).safeParse(await providerJson(url, 'Yahoo search', request));
    if (!data.success) throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Yahoo symbol search returned invalid data. Retry or enter a known Yahoo ticker.' });
    return data.data.quotes.filter(q => /^[A-Za-z0-9^.&=_-]{1,40}$/.test(q.symbol) && ['EQUITY', 'INDEX', 'ETF', 'FUTURE', 'CURRENCY', 'CRYPTOCURRENCY'].includes(q.quoteType ?? '')).map(q => ({ symbol: q.symbol, name: q.longname ?? q.shortname ?? q.symbol, currency: q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO') || ['^NSEI', '^NSEBANK', '^BSESN'].includes(q.symbol) ? 'INR' : '' }));
  }
  const needle = query.toLowerCase();
  const matches = (markets: ChartSymbol[]) => markets.filter(m => `${m.symbol} ${m.name}`.toLowerCase().includes(needle)).sort((a, b) => (a.symbol === query.toUpperCase() ? -1 : b.symbol === query.toUpperCase() ? 1 : a.symbol.localeCompare(b.symbol))).slice(0, 30);
  const cached = request === fetch ? cryptoCatalogs.get(source) : undefined;
  if (cached && cached.expires > Date.now()) return matches(cached.markets);
  const url = new URL(source === 'DELTA' ? 'https://api.india.delta.exchange/v2/products' : 'https://fapi.binance.com/fapi/v1/exchangeInfo');
  if (source === 'DELTA') { url.searchParams.set('contract_types', 'perpetual_futures'); url.searchParams.set('page_size', '500'); }
  const data = await providerJson(url, source === 'DELTA' ? 'Delta India' : 'Binance USD-M', request);
  let markets: ChartSymbol[];
  if (source === 'DELTA') {
    const parsed = z.object({ success: z.literal(true), meta: z.object({ after: z.string().nullable().optional() }).optional(), result: z.array(z.object({ symbol: z.string(), contract_type: z.string(), state: z.string().optional(), settling_asset: z.object({ symbol: z.string() }).optional(), underlying_asset: z.object({ name: z.string().optional() }).optional() })) }).safeParse(data);
    if (!parsed.success) throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Delta market catalog is unavailable.' });
    if (parsed.data.meta?.after) throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Delta catalog exceeds this chart search limit. Enter a known perpetual ticker directly.' });
    markets = parsed.data.result.filter(m => m.contract_type === 'perpetual_futures' && m.state === 'live' && m.settling_asset?.symbol === 'USD').map(m => ({ symbol: m.symbol, name: m.underlying_asset?.name ?? m.symbol, currency: 'USD' }));
  } else {
    const parsed = z.object({ symbols: z.array(z.object({ symbol: z.string(), baseAsset: z.string(), quoteAsset: z.string(), contractType: z.string(), status: z.string() })) }).safeParse(data);
    if (!parsed.success) throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Binance USD-M market catalog is unavailable.' });
    markets = parsed.data.symbols.filter(m => m.contractType === 'PERPETUAL' && m.status === 'TRADING' && m.quoteAsset === 'USDT').map(m => ({ symbol: m.symbol, name: `${m.baseAsset} perpetual`, currency: 'USDT' }));
  }
  if (request === fetch) cryptoCatalogs.set(source, { markets, expires: Date.now() + 5 * 60_000 });
  return matches(markets);
}
