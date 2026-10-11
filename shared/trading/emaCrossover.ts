/** A normalized OHLCV bar. `closed` must be false for a still-forming candle. */
export type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closed: boolean;
};

export type EmaCrossoverParams = {
  fastPeriod: number;
  slowPeriod: number;
};

export type StrategyDecision =
  | { action: "hold" }
  | { action: "enter"; reason: "bullish_ema_crossover" }
  | { action: "exit"; reason: "bearish_ema_crossover" };

export function validateEmaCrossoverParams(params: EmaCrossoverParams): void {
  if (!Number.isSafeInteger(params.fastPeriod) || !Number.isSafeInteger(params.slowPeriod) ||
      params.fastPeriod < 1 || params.slowPeriod < 2 || params.fastPeriod >= params.slowPeriod) {
    throw new Error("EMA periods must be positive integers with fastPeriod < slowPeriod");
  }
}

function completedCandles(candles: readonly Candle[]): Candle[] {
  const closed = candles.filter(candle => candle.closed);
  for (let i = 0; i < closed.length; i++) {
    const candle = closed[i]!;
    if (![candle.timestamp, candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite) ||
        candle.timestamp < 0 || candle.open <= 0 || candle.high <= 0 || candle.low <= 0 || candle.close <= 0 || candle.volume < 0 ||
        candle.high < Math.max(candle.open, candle.close, candle.low) || candle.low > Math.min(candle.open, candle.close, candle.high) ||
        (i > 0 && candle.timestamp <= closed[i - 1]!.timestamp)) {
      throw new Error("Completed candles must contain valid, chronologically ordered OHLCV data");
    }
  }
  return closed;
}

function ema(values: readonly number[], period: number): Array<number | undefined> {
  const output: Array<number | undefined> = Array(values.length).fill(undefined);
  if (values.length < period) return output;
  const alpha = 2 / (period + 1);
  let previous = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  output[period - 1] = previous;
  for (let i = period; i < values.length; i++) {
    previous = values[i]! * alpha + previous * (1 - alpha);
    output[i] = previous;
  }
  return output;
}

function crossoverEvents(bars: readonly Candle[], params: EmaCrossoverParams): Array<"bullish" | "bearish" | undefined> {
  const closes = bars.map(candle => candle.close);
  const fast = ema(closes, params.fastPeriod);
  const slow = ema(closes, params.slowPeriod);
  return bars.map((_, i) => {
    if (i < 1 || fast[i] === undefined || fast[i - 1] === undefined || slow[i] === undefined || slow[i - 1] === undefined) {
      return undefined;
    }
    if (fast[i - 1]! <= slow[i - 1]! && fast[i]! > slow[i]!) return "bullish";
    if (fast[i - 1]! >= slow[i - 1]! && fast[i]! < slow[i]!) return "bearish";
    return undefined;
  });
}

/**
 * Evaluates the latest closed candle against its predecessor. The caller supplies
 * current position state; this function never places orders or reads future bars.
 */
export function evaluateEmaCrossover(
  candles: readonly Candle[],
  params: EmaCrossoverParams,
  isLong: boolean,
): StrategyDecision {
  validateEmaCrossoverParams(params);
  const bars = completedCandles(candles);
  const event = crossoverEvents(bars, params).at(-1);
  if (!isLong && event === "bullish") return { action: "enter", reason: "bullish_ema_crossover" };
  if (isLong && event === "bearish") return { action: "exit", reason: "bearish_ema_crossover" };
  return { action: "hold" };
}

/** Internal normalization shared by evaluator and backtest. */
export type BacktestConfig = EmaCrossoverParams & {
  initialCapital: number;
  quantity: number;
  feeBps: number;
  slippageBps: number;
};

export type BacktestTrade = {
  entryTimestamp: number;
  exitTimestamp: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  fees: number;
  netPnl: number;
};

export type EquityPoint = { timestamp: number; equity: number };

export type BacktestResult = {
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  finalEquity: number;
  netReturnPct: number;
  maxDrawdownPct: number;
  tradeCount: number;
  winRatePct: number;
};

/**
 * Runs the EMA evaluator over closed candles. Decisions made at a candle close
 * can only fill at the following candle's open. Any final open position is
 * liquidated at the last close to produce a realized terminal equity value.
 *
 * This is a research simulator: it does not model spread, partial fills,
 * funding, borrow, taxes, lot sizes, margin, broker rules, or live data quality.
 */
export function runBacktest(candles: readonly Candle[], config: BacktestConfig): BacktestResult {
  validateEmaCrossoverParams(config);
  if (![config.initialCapital, config.quantity].every(Number.isFinite) || config.initialCapital <= 0 || config.quantity <= 0 ||
      ![config.feeBps, config.slippageBps].every(Number.isFinite) || config.feeBps < 0 || config.slippageBps < 0 ||
      config.feeBps >= 10_000 || config.slippageBps >= 10_000) {
    throw new Error("Backtest capital and quantity must be positive; fees and slippage must be between 0 and 10000 bps");
  }

  const bars = completedCandles(candles);
  const events = crossoverEvents(bars, config);
  let cash = config.initialCapital;
  let position: { entryTimestamp: number; entryPrice: number; entryFee: number } | undefined;
  let pending: "enter" | "exit" | undefined;
  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];
  const feeRate = config.feeBps / 10_000;
  const slippageRate = config.slippageBps / 10_000;

  const enter = (bar: Candle) => {
    const price = bar.open * (1 + slippageRate);
    const fee = config.quantity * price * feeRate;
    if (cash < config.quantity * price + fee) return;
    cash -= config.quantity * price + fee;
    position = { entryTimestamp: bar.timestamp, entryPrice: price, entryFee: fee };
  };

  const exit = (bar: Candle, rawPrice: number) => {
    if (!position) return;
    const price = rawPrice * (1 - slippageRate);
    const exitFee = config.quantity * price * feeRate;
    cash += config.quantity * price - exitFee;
    trades.push({
      entryTimestamp: position.entryTimestamp,
      exitTimestamp: bar.timestamp,
      entryPrice: position.entryPrice,
      exitPrice: price,
      quantity: config.quantity,
      fees: position.entryFee + exitFee,
      netPnl: config.quantity * (price - position.entryPrice) - position.entryFee - exitFee,
    });
    position = undefined;
  };

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    if (pending === "enter" && !position) enter(bar);
    if (pending === "exit" && position) exit(bar, bar.open);
    pending = undefined;

    // This event uses bar i only and is executable no earlier than bar i + 1.
    if (!position && events[i] === "bullish") pending = "enter";
    if (position && events[i] === "bearish") pending = "exit";

    if (i === bars.length - 1 && position) exit(bar, bar.close);
    const liquidationPrice = bar.close * (1 - slippageRate);
    const unrealized = position
      ? config.quantity * liquidationPrice * (1 - feeRate)
      : 0;
    equityCurve.push({ timestamp: bar.timestamp, equity: cash + unrealized });
  }

  let peak = config.initialCapital;
  let maxDrawdownPct = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    if (peak > 0) maxDrawdownPct = Math.max(maxDrawdownPct, (peak - point.equity) / peak * 100);
  }
  const finalEquity = equityCurve.at(-1)?.equity ?? config.initialCapital;
  return {
    trades,
    equityCurve,
    finalEquity,
    netReturnPct: (finalEquity / config.initialCapital - 1) * 100,
    maxDrawdownPct,
    tradeCount: trades.length,
    winRatePct: trades.length ? trades.filter(trade => trade.netPnl > 0).length / trades.length * 100 : 0,
  };
}
