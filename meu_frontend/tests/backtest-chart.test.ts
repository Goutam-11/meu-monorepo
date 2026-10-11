import { expect, test } from 'bun:test';
import { analyzeBacktest, backtestMarkers, tradeProtection } from '../src/features/backtests/chart/analysis';
import type { Candle } from '../../shared/trading/emaCrossover';
import type { SimTrade } from '../../shared/trading/perpetualBacktest';
const strategy = { id: 'donchian' as const, fastPeriod: 2, slowPeriod: 3, lookback: 2, atrPeriod: 2, stopAtr: 2, rewardRisk: 1.5 };
const candles: Candle[] = [10, 11, 20, 22].map((value, i) => ({ timestamp: 100 + i * 60, open: value, high: value + 1, low: value - 1, close: value, volume: 1, closed: true }));
const trade: SimTrade = { side: 'long', entryTimestamp: 220, exitTimestamp: 220, entryPrice: 20, exitPrice: 18, contracts: 1, fees: 0.1, funding: 0, netPnl: -2.1, reason: 'stop' };
test('Donchian overlays exclude the current candle and remain prefix causal', () => {
  const full = analyzeBacktest(candles, strategy), prefix = analyzeBacktest(candles.slice(0, 3), strategy);
  expect(full.overlays[0].points[0]).toEqual({ time: 220, value: 12 });
  expect(full.overlays[0].points.slice(0, 1)).toEqual(prefix.overlays[0].points);
});
test('protection uses signal-candle ATR, never entry-candle or future range', () => {
  const analysis = analyzeBacktest(candles, strategy);
  expect(tradeProtection(trade, candles, analysis.atr, strategy)).toEqual({ stop: 16, target: 26, signalTimestamp: 160 });
  expect(tradeProtection({ ...trade, side: 'short' }, candles, analysis.atr, strategy)).toMatchObject({ stop: 24, target: 14 });
  expect(tradeProtection({ ...trade, entryTimestamp: 99 }, candles, analysis.atr, strategy)).toBeNull();
});
test('same-candle entries and exits retain distinct marker identities and chronological order', () => {
  const markers = backtestMarkers([trade, { ...trade, side: 'short', entryTimestamp: 100, exitTimestamp: 280 }]);
  expect(markers.map(m => m.time)).toEqual([100, 220, 220, 280]);
  expect(new Set(markers.map(m => m.id)).size).toBe(4);
  expect(markers.find(m => m.id === 'entry:1')?.text).toBe('SELL 2');
});

test('enhanced charts use recorded native protection instead of generic reward-risk reconstruction',()=>{
 const analysis=analyzeBacktest(candles,strategy);
 expect(tradeProtection({...trade,stopPrice:17,targetPrice:21},candles,analysis.atr,{...strategy,executionRules:{version:1}})).toEqual({stop:17,target:21,signalTimestamp:160});
});

test('trend entries are explained without claiming a new crossover',async()=>{
 const {entryExplanation}=await import('../src/features/backtests/chart/analysis');
 const config={...strategy,id:'ema' as const,executionRules:{version:2 as const,emaEntry:'trend' as const}};
 expect(entryExplanation(config,{id:'setup',side:'long',level:10,originTimestamp:100,confirmedTimestamp:160,expiresTimestamp:280,source:'trend'})).toContain('established EMA trend');
 expect(entryExplanation(config,{id:'setup',side:'long',level:10,originTimestamp:100,confirmedTimestamp:160,expiresTimestamp:280,source:'crossover'})).toContain('crossed the slow');
});

test('protection timeline shows next-candle stop changes and removes the target only at activation',async()=>{
 const {tradeProtectionPaths}=await import('../src/features/backtests/chart/analysis');
 const dynamic={...trade,entryTimestamp:100,exitTimestamp:280,protectionTimeline:[
  {effectiveFrom:100,stopPrice:18,targetEnabled:true,trailingActive:false},
  {effectiveFrom:220,stopPrice:21,targetEnabled:false,trailingActive:true},
  {effectiveFrom:280,stopPrice:23,targetEnabled:false,trailingActive:true},
  {effectiveFrom:340,stopPrice:25,targetEnabled:false,trailingActive:true},
 ]};
 expect(tradeProtectionPaths(dynamic,{stop:18,target:25})).toEqual({
  stop:[{time:100,value:18},{time:220,value:21},{time:280,value:23}],
  targets:[[{time:100,value:25},{time:220,value:25}]],
 });
 expect(dynamic.protectionTimeline).toHaveLength(4);
});
test('legacy protection remains static and same-candle trades do not create duplicate timestamps',async()=>{
 const {tradeProtectionPaths}=await import('../src/features/backtests/chart/analysis');
 expect(tradeProtectionPaths(trade,{stop:18,target:25})).toEqual({stop:[{time:220,value:18}],targets:[[{time:220,value:25}]]});
 expect(tradeProtectionPaths({...trade,exitTimestamp:280},{stop:18,target:25})).toEqual({stop:[{time:220,value:18},{time:280,value:18}],targets:[[{time:220,value:25},{time:280,value:25}]]});
 expect(tradeProtectionPaths(trade,null)).toEqual({stop:[],targets:[]});
});
