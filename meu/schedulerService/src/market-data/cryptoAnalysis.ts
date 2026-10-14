import type { Exchange, OHLCV } from "ccxt";
import { macd, rsi } from "./indicators";

export const ANALYSIS_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h"] as const;
export type AnalysisTimeframe = typeof ANALYSIS_TIMEFRAMES[number];
const intervalMs: Record<string, number> = { "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 };
const HISTORY_BARS = 250;
const MIN_HISTORY_BARS = 100;
const REQUEST_TIMEOUT_MS = 15_000;

export function analysisTimeframe(value: unknown): AnalysisTimeframe {
  if (value === undefined) return "1m"; // Preserve the horizon of existing saved agents.
  if (!ANALYSIS_TIMEFRAMES.includes(value as AnalysisTimeframe)) throw new Error("Invalid LLM analysis timeframe");
  return value as AnalysisTimeframe;
}

export class LlmMarketDataError extends Error {
  constructor(readonly code: "LLM_MARKET_DATA_UNAVAILABLE" | "LLM_MARKET_DATA_INVALID" | "LLM_MARKET_DATA_INSUFFICIENT" | "LLM_MARKET_DATA_STALE", readonly timeframe: string) {
    const reasons = {
      LLM_MARKET_DATA_UNAVAILABLE: "The public candle request failed or timed out",
      LLM_MARKET_DATA_INVALID: "Candle history contains invalid, unordered or discontinuous bars",
      LLM_MARKET_DATA_INSUFFICIENT: "Recent completed candle history is insufficient for indicator warmup",
      LLM_MARKET_DATA_STALE: "Candle history does not include the latest completed interval",
    };
    super(`${reasons[code]} (${timeframe}); wait for fresh market data.`);
    this.name = "LlmMarketDataError";
  }
}

export async function getOHLCV(timeframe: string, symbol: string, since: number, limit = 1000, exchange: Exchange) {
  return exchange.fetchOHLCV(symbol, timeframe, since, limit);
}

/** Fixed asOf prevents forming bars and later pages from introducing lookahead. */
export async function getCompletedHistory(timeframe: string, symbol: string, exchange: Exchange, asOf = Date.now()): Promise<OHLCV[]> {
  const step = intervalMs[timeframe];
  if (!step || !exchange.timeframes?.[timeframe]) throw new Error(`Exchange does not support the configured ${timeframe} candle interval`);
  const boundary = Math.floor(asOf / step) * step;
  const since = boundary - HISTORY_BARS * step;
  let cursor = since;
  const history: OHLCV[] = [];
  for (let page = 0; page < 4 && cursor < boundary; page++) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rows: OHLCV[];
    try {
      rows = await Promise.race([
        exchange.fetchOHLCV(symbol, timeframe, cursor, Math.min(200, Math.ceil((boundary - cursor) / step) + 1)),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new LlmMarketDataError("LLM_MARKET_DATA_UNAVAILABLE", timeframe)), REQUEST_TIMEOUT_MS); }),
      ]);
    } catch {
      throw new LlmMarketDataError("LLM_MARKET_DATA_UNAVAILABLE", timeframe);
    } finally {
      clearTimeout(timer);
    }
    if (!Array.isArray(rows) || rows.length > 200) throw new LlmMarketDataError("LLM_MARKET_DATA_INVALID", timeframe);
    if (!rows.length) break;
    let previous = -Infinity;
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 6) throw new LlmMarketDataError("LLM_MARKET_DATA_INVALID", timeframe);
      const [time, open, high, low, close, volume] = row;
      if (![time, open, high, low, close, volume].every(value => typeof value === "number" && Number.isFinite(value)) ||
          !Number.isSafeInteger(time) || time! % step !== 0 || time! <= previous ||
          Math.min(open!, high!, low!, close!) <= 0 || volume! < 0 || high! < Math.max(open!, close!, low!) || low! > Math.min(open!, close!)) {
        throw new LlmMarketDataError("LLM_MARKET_DATA_INVALID", timeframe);
      }
      previous = time!;
      // Ignore an inclusive pagination overlap and all bars outside the fixed completed snapshot.
      if (time! >= cursor && time! < boundary) history.push(row);
    }
    const last = rows.at(-1)![0]!;
    if (last < cursor) break;
    cursor = last + step;
  }
  if (history.at(-1)?.[0] !== boundary - step) throw new LlmMarketDataError("LLM_MARKET_DATA_STALE", timeframe);
  for (let i = 1; i < history.length; i++) {
    if (history[i]![0]! - history[i - 1]![0]! !== step) throw new LlmMarketDataError("LLM_MARKET_DATA_INVALID", timeframe);
  }
  if (history.length < MIN_HISTORY_BARS) throw new LlmMarketDataError("LLM_MARKET_DATA_INSUFFICIENT", timeframe);
  return history;
}

export async function getIntradayIndicators(timeframe = "1m", symbol = "BTC/USD", slice = 30, exchange: Exchange, asOf = Date.now()) {
  if (!Number.isSafeInteger(slice) || slice < 1 || slice > 30) throw new Error("Indicator output must contain 1–30 candles");
  const ohlcv = await getCompletedHistory(timeframe, symbol, exchange, asOf);
  const { maCD, signal, histogram, emaFast, emaSlow } = macd(ohlcv, 12, 26, 9, slice);
  return {
    timeframe,
    asOf: new Date(asOf).toISOString(),
    completedThrough: new Date(ohlcv.at(-1)![0]! + intervalMs[timeframe]!).toISOString(),
    historyBars: ohlcv.length,
    warmupBars: ohlcv.length - slice,
    historyNote: ohlcv.length < HISTORY_BARS ? `Only ${ohlcv.length} recent contiguous completed candles are available; requested ${HISTORY_BARS}, minimum ${MIN_HISTORY_BARS}. Indicator warmup is shorter.` : null,
    ohlcv: ohlcv.slice(-slice),
    midPrices: ohlcv.slice(-slice).map(c => (c[1]! + c[4]!) / 2),
    maCD, signal, histogram, emaFast, emaSlow,
    rSI: rsi(ohlcv, 14, slice),
  };
}

export function getSwingIndicators(timeframe = "4h", symbol = "BTC/USD", slice = 30, exchange: Exchange, asOf = Date.now()) {
  return getIntradayIndicators(timeframe, symbol, slice, exchange, asOf);
}
export function getLongTermIndicators(timeframe = "1d", symbol = "BTC/USD", slice = 30, exchange: Exchange, asOf = Date.now()) {
  return getIntradayIndicators(timeframe, symbol, slice, exchange, asOf);
}

/** Align named indicator values with their candle; null explicitly means unavailable. */
export function formatMarketAnalysis(data: Awaited<ReturnType<typeof getIntradayIndicators>>) {
  return {
    timeframe: data.timeframe, asOf: data.asOf, completedThrough: data.completedThrough,
    historyBars: data.historyBars, warmupBars: data.warmupBars, unavailableValue: null,
    historyNote: data.historyNote,
    indicatorDefinitions: { ema12: "EMA(close,12)", ema26: "EMA(close,26)", macd: "EMA12-EMA26", signal: "EMA(MACD,9)", rsi14: "Wilder RSI(close,14)" },
    candles: data.ohlcv.map((row, index) => ({
      openedAt: new Date(row[0]!).toISOString(), closedAt: new Date(row[0]! + intervalMs[data.timeframe]!).toISOString(),
      open: row[1], high: row[2], low: row[3], close: row[4], volume: row[5],
      indicators: { ema12: data.emaFast[index] ?? null, ema26: data.emaSlow[index] ?? null, macd: data.maCD[index] ?? null, signal: data.signal[index] ?? null, histogram: data.histogram[index] ?? null, rsi14: data.rSI[index] ?? null },
    })),
  };
}
