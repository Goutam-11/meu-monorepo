import type { Candle } from '../../../../../shared/trading/emaCrossover';
import { prepareStrategy, type StrategyConfig, type EntryProposal } from '../../../../../shared/trading/strategies';
import type { SimTrade } from '../../../../../shared/trading/perpetualBacktest';
import { chartEma, chartBollinger, type ChartPoint } from '../../charts/indicators';

export const exitExplanation: Record<SimTrade['reason'], string> = {
  stop: 'The protective stop was reached. A gap or simulated slippage can make the fill worse than the stop.',
  target: 'Price reached the take-profit target.',
  signal: 'A new strategy signal closed the position before its stop or target.',
  liquidation: 'The isolated-margin liquidation estimate was reached; the simulated position was forcibly closed.',
  end: 'The test period ended, so the remaining position was closed.',
};
export function entryExplanation(strategy: StrategyConfig, proposal?: EntryProposal) {
  if (strategy.id === 'donchian') return 'Price closed beyond the previous high/low range.';
  if (strategy.id === 'meanReversion') return 'Price returned inside its Bollinger band after an extreme RSI reading.';
  if (proposal?.source === 'trend') return 'An established EMA trend became eligible: directional movement, slope and price extension passed the saved research policy. A new crossover was not required.';
  if (strategy.executionRules?.version === 1) return 'A completed-candle EMA crossover or pullback/reclaim setup qualified under experimental v1 rules.';
  return 'Fast EMA crossed the slow EMA in the trade direction.';
}
export function analyzeBacktest(candles: Candle[], strategy: StrategyConfig) {
  const prepared = prepareStrategy(candles, strategy);
  const chartCandles = candles.map(c => ({ ...c, time: c.timestamp }));
  let overlays: { name: string; points: ChartPoint[] }[];
  if (strategy.id === 'ema') overlays = [
    { name: `Fast EMA ${strategy.fastPeriod}`, points: chartEma(chartCandles, strategy.fastPeriod) },
    { name: `Slow EMA ${strategy.slowPeriod}`, points: chartEma(chartCandles, strategy.slowPeriod) },
  ];
  else if (strategy.id === 'meanReversion') {
    const bands = chartBollinger(chartCandles, strategy.lookback);
    overlays = [{ name: 'Band middle', points: bands.middle }, { name: 'Upper band', points: bands.upper }, { name: 'Lower band', points: bands.lower }];
  } else {
    const upper: ChartPoint[] = [], lower: ChartPoint[] = [];
    for (let i = strategy.lookback; i < candles.length; i++) {
      const prior = candles.slice(i - strategy.lookback, i);
      upper.push({ time: candles[i].timestamp, value: Math.max(...prior.map(c => c.high)) });
      lower.push({ time: candles[i].timestamp, value: Math.min(...prior.map(c => c.low)) });
    }
    overlays = [{ name: 'Prior range high', points: upper }, { name: 'Prior range low', points: lower }];
  }
  return { ...prepared, overlays };
}
export function tradeProtection(trade: SimTrade, candles: Candle[], atr: (number | undefined)[], strategy: StrategyConfig) {
  const index = candles.findIndex(c => c.timestamp === trade.entryTimestamp);
  const priorAtr = index > 0 ? atr[index - 1] : undefined;
  if (priorAtr === undefined) return null;
  const sign = trade.side === 'long' ? 1 : -1, distance = priorAtr * strategy.stopAtr;
  return { stop: trade.stopPrice ?? trade.entryPrice - sign * distance, target: trade.targetPrice ?? trade.entryPrice + sign * distance * strategy.rewardRisk, signalTimestamp: candles[index - 1].timestamp };
}
/** Protection changes take effect at their recorded candle, never retroactively. */
export function tradeProtectionPaths(
  trade: SimTrade,
  initial: {stop:number;target:number} | null,
) {
  if (!initial) return {stop: [] as ChartPoint[], targets: [] as ChartPoint[][]};
  const timeline = trade.protectionTimeline?.filter(point => point.effectiveFrom >= trade.entryTimestamp && point.effectiveFrom <= trade.exitTimestamp);
  if (!timeline?.length) return {
    stop: [{time:trade.entryTimestamp,value:initial.stop}, ...(trade.exitTimestamp > trade.entryTimestamp ? [{time:trade.exitTimestamp,value:initial.stop}] : [])],
    targets: [[{time:trade.entryTimestamp,value:initial.target}, ...(trade.exitTimestamp > trade.entryTimestamp ? [{time:trade.exitTimestamp,value:initial.target}] : [])]],
  };
  const stop: ChartPoint[] = [];
  const targets: ChartPoint[][] = [];
  for (let i = 0; i < timeline.length; i++) {
    const point = timeline[i];
    const end = timeline[i + 1]?.effectiveFrom ?? trade.exitTimestamp;
    stop.push({time:point.effectiveFrom,value:point.stopPrice});
    if (point.targetEnabled) targets.push([
      {time:point.effectiveFrom,value:initial.target},
      ...(end > point.effectiveFrom ? [{time:end,value:initial.target}] : []),
    ]);
  }
  const last = stop.at(-1)!;
  if (last.time < trade.exitTimestamp) stop.push({time:trade.exitTimestamp,value:last.value});
  return {stop,targets};
}
export function backtestMarkers(trades: SimTrade[]) {
  return trades.flatMap((trade, index) => [
    { time: trade.entryTimestamp, id: `entry:${index}`, position: trade.side === 'long' ? 'belowBar' as const : 'aboveBar' as const, shape: trade.side === 'long' ? 'arrowUp' as const : 'arrowDown' as const, color: trade.side === 'long' ? '#237555' : '#b13648', text: `${trade.side === 'long' ? 'BUY' : 'SELL'} ${index + 1}` },
    { time: trade.exitTimestamp, id: `exit:${index}`, position: 'inBar' as const, shape: 'circle' as const, color: '#b38a30', text: `EXIT ${index + 1}` },
  ]).sort((a, b) => a.time - b.time);
}
