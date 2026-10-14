import { KiteConnect } from "kiteconnect";
import { evaluateEmaCrossover, type Candle, type EmaCrossoverParams, type StrategyDecision } from "@/algorithms/emaCrossover";
import { getNseInstrumentMap } from "../../agents/llm/zerodhaAgent";

type Kite = InstanceType<typeof KiteConnect>;
type KiteCandle = { date: string | Date; open: number; high: number; low: number; close: number; volume: number };

export type KiteEmaSignal = {
  symbol: string;
  decision: StrategyDecision;
  positionQuantity: number;
};

/** Pulls the same closed 15-minute bars used by the live EMA evaluator. */
export async function getKiteEmaSignals(
  kc: Kite,
  symbols: string[],
  params: EmaCrossoverParams,
  now = new Date(),
): Promise<KiteEmaSignal[]> {
  const instruments = await getNseInstrumentMap(kc);
  const tokenBySymbol = new Map(instruments.map(item => [item.tradingsymbol, item.instrument_token]));
  const positions = await kc.getPositions();
  const from = new Date(now.getTime() - 45 * 86_400_000).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  const results: KiteEmaSignal[] = [];

  for (const symbol of symbols) {
    const token = tokenBySymbol.get(symbol);
    if (!token) throw new Error(`NSE instrument not found: ${symbol}`);
    const raw = await kc.getHistoricalData(token, "15minute", from, to) as KiteCandle[];
    const candles: Candle[] = raw.map(candle => ({
      timestamp: new Date(candle.date).getTime(),
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
      volume: Number(candle.volume),
      closed: new Date(candle.date).getTime() + 15 * 60_000 <= now.getTime(),
    }));
    const position = positions.net.find(item => item.tradingsymbol === symbol && item.product === "MIS");
    const positionQuantity = Number(position?.quantity ?? 0);
    results.push({
      symbol,
      positionQuantity,
      decision: evaluateEmaCrossover(candles, params, positionQuantity > 0),
    });
  }
  return results;
}
