import { test, expect } from 'bun:test';
import { runPerpetualBacktest } from '../../../shared/trading/perpetualBacktest';
import { prepareStrategy, evaluateStrategy } from '../../../shared/trading/strategies';
import type { Candle } from '../../../shared/trading/emaCrossover';
const strategy = { id: 'ema' as const, fastPeriod: 2, slowPeriod: 3, lookback: 3, atrPeriod: 2, stopAtr: 2, rewardRisk: 2 };
const contract = { symbol: 'BTCUSD', contractSize: 0.001, minContracts: 1, maintenanceMarginRate: 0.005, settlement: 'USD' as const };
const config = { initialCapital: 1000, leverage: 2, riskPerTradePct: 1, maxMarginPct: 25, feeBps: 5, slippageBps: 2, fundingRatePct8h: 0.01, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5, maxDailyLossPct: 5, direction: 'both' as const };
function bars(closes: number[], opens = closes): Candle[] { return closes.map((close, i) => ({ timestamp: 1700000000 + i * 3600, open: opens[i]!, close, high: Math.max(close, opens[i]!) + 1, low: Math.min(close, opens[i]!) - 1, volume: 100, closed: true })); }
test('signals use only historical prefix and ignore forming candle', () => {
    const data = bars([100, 100, 100, 110, 112, 108, 90]);
    const all = prepareStrategy(data, strategy);
    for (let i = 0; i < data.length; i++)
        expect(evaluateStrategy(data.slice(0, i + 1), strategy).signal).toBe(all.signals[i]!);
    const forming = { ...data.at(-1)!, timestamp: 1800000000, close: 200, closed: false };
    expect(evaluateStrategy([...data, forming], strategy)).toEqual(evaluateStrategy(data, strategy));
});
test('fills at next open, integers size contracts, balances fees and funding', () => {
    const data = bars([100, 100, 100, 110, 112, 111, 108, 95], [100, 100, 100, 110, 113, 112, 109, 96]);
    const r = runPerpetualBacktest(data, contract, strategy, config);
    expect(r.tradeCount).toBeGreaterThan(0);
    expect(r.trades[0]!.entryTimestamp).toBe(data[4]!.timestamp);
    expect(r.trades[0]!.entryPrice).toBeCloseTo(113 * 1.0002);
    expect(Number.isInteger(r.trades[0]!.contracts)).toBe(true);
    expect(r.finalEquity).toBeCloseTo(config.initialCapital + r.trades.reduce((a, t) => a + t.netPnl, 0));
    expect(r.totalFees).toBeGreaterThan(0);
});
test('both sides execute and closed candles invalid data fail', () => {
    const data = bars([100, 100, 100, 110, 105, 90, 88, 85, 100, 110, 112]);
    const r = runPerpetualBacktest(data, contract, strategy, { ...config, direction: 'short' });
    expect(r.trades.every(t => t.side === 'short')).toBe(true);
    expect(r.tradeCount).toBeGreaterThan(0);
    expect(() => runPerpetualBacktest([...data, data[0]!], contract, strategy, config)).toThrow('Invalid closed');
    expect(() => runPerpetualBacktest(data, contract, strategy, { ...config, leverage: 0 })).toThrow('Invalid simulation');
});
test('liquidation takes precedence when intrabar path is unknowable', () => {
    const data = bars([100, 100, 100, 110, 111, 110]);
    data[4]!.low = 1;
    data[4]!.high = 1000;
    const r = runPerpetualBacktest(data, contract, strategy, { ...config, fundingRatePct8h: 0 });
    expect(r.trades[0]!.reason).toBe('liquidation');
    expect(r.liquidations).toBe(1);
    expect(r.finalEquity).toBeCloseTo(config.initialCapital + r.trades.reduce((a, t) => a + t.netPnl, 0));
});
test('entry limits still permit risk reducing exits', () => {
    const data = bars([100, 100, 100, 110, 105, 90, 88, 110, 112, 90, 85]);
    const r = runPerpetualBacktest(data, contract, strategy, { ...config, maxPositionsOpenedPerDay: 1, maxTradesPerDay: 1 });
    expect(r.tradeCount).toBe(1);
    expect(r.trades[0]!.exitTimestamp).toBeGreaterThanOrEqual(r.trades[0]!.entryTimestamp);
});
test('Donchian never includes current bar in breakout threshold', () => {
    const data = bars([100, 101, 102, 120]);
    expect(prepareStrategy(data, { ...strategy, id: 'donchian' }).signals.at(-1)).toBe('long');
});
test('insufficient affordable contract size produces no entries', () => {
    const r = runPerpetualBacktest(bars([100, 100, 100, 110, 112]), { ...contract, contractSize: 10000 }, strategy, config);
    expect(r.tradeCount).toBe(0);
    expect(r.finalEquity).toBe(1000);
});
test('positive funding debits longs and negative funding credits them', () => {
    const data = bars([100, 100, 100, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122]);
    const positive = runPerpetualBacktest(data, contract, strategy, { ...config, direction: 'long', fundingRatePct8h: 0.1 });
    const negative = runPerpetualBacktest(data, contract, strategy, { ...config, direction: 'long', fundingRatePct8h: -0.1 });
    expect(positive.totalFunding).toBeGreaterThan(0);
    expect(negative.totalFunding).toBeLessThan(0);
    expect(negative.finalEquity).toBeGreaterThan(positive.finalEquity);
});
test('mean-reversion warmup produces no entries on flat prices', () => {
    const data = bars(Array(60).fill(100));
    const out = prepareStrategy(data, { ...strategy, id: 'meanReversion', lookback: 20 });
    expect(out.signals.every(s => s === 'hold')).toBe(true);
});
test('closing orders do not consume the entry order counter', () => {
 const data=bars([100,100,100,110,105,90,88,110,112,90,85,110,112,90,80]);
 data.forEach((b,i)=>{b.timestamp=1704067200+i*3600;});
 const result=runPerpetualBacktest(data,contract,strategy,{...config,maxTradesPerDay:2,maxPositionsOpenedPerDay:10,maxDailyLossPct:100});
 expect(result.tradeCount).toBe(2);
});

const confirmation = { mode: 'confirm' as const, confirmationBars: 1, maxWaitBars: 3, cooldownBars: 2 };
test('confirmation waits for a later close with follow-through, not the setup candle', () => {
 const data=bars([100,100,100,110,112,113]);
 const out=prepareStrategy(data,{...strategy,entryTiming:confirmation});
 expect(out.rawSignals[3]).toBe('long');expect(out.signals[3]).toBe('hold');expect(out.signals[4]).toBe('long');
 const result=runPerpetualBacktest(data,contract,{...strategy,entryTiming:confirmation},config);
 expect(result.trades[0]?.entryTimestamp).toBe(data[5]!.timestamp);
});
test('false crossover is invalidated; exits remain immediate raw signals', () => {
 const out=prepareStrategy(bars([100,100,100,110,90]),{...strategy,entryTiming:confirmation});
 expect(out.signals.every(s=>s==='hold')).toBe(true);
 expect(out.rawSignals.at(-1)).toBe('short');
});
test('retest waits for a later touch and close back beyond the original breakout', () => {
 const data=bars([100,101,102,120,121,105,110]);
 data[5]!.low=102;
 const out=prepareStrategy(data,{...strategy,id:'donchian',entryTiming:{...confirmation,mode:'retest'}});
 expect(out.signals[3]).toBe('hold');expect(out.signals[4]).toBe('hold');expect(out.signals[5]).toBe('long');
});
test('confirmed and retest signals use no future candles and ignore forming candles', () => {
 const data=bars([100,100,100,110,112,108,90,88,91,120,121]);
 for(const mode of ['confirm','retest'] as const){
  const c={...strategy,entryTiming:{...confirmation,mode}};
  const out=prepareStrategy(data,c);
  data.forEach((_,i)=>expect(evaluateStrategy(data.slice(0,i+1),c).signal).toBe(out.signals[i]!));
  expect(evaluateStrategy([...data,{...data.at(-1)!,timestamp:1800000000,close:200,high:201,closed:false}],c)).toEqual(evaluateStrategy(data,c));
 }
});
test('resume activation cannot confirm a setup formed while the agent was paused', () => {
 const data=bars([100,100,100,110,112]);
 const c={...strategy,entryTiming:confirmation};
 expect(evaluateStrategy(data,c).signal).toBe('long');
 expect(evaluateStrategy(data,c,data[4]!.timestamp).signal).toBe('hold');
});
test('cooldown suppresses entry after an actual close without suppressing exits', () => {
 const data=bars([100,100,100,110,105,90,88,110,112,90,85,110,112,90,80]);
 const immediate=runPerpetualBacktest(data,contract,strategy,{...config,maxDailyLossPct:100});
 const cooled=runPerpetualBacktest(data,contract,{...strategy,entryTiming:{...confirmation,mode:'immediate',cooldownBars:3}},{...config,maxDailyLossPct:100});
 expect(cooled.tradeCount).toBeLessThan(immediate.tradeCount);
 for(let i=1;i<cooled.trades.length;i++)expect(cooled.trades[i]!.entryTimestamp-cooled.trades[i-1]!.exitTimestamp).toBeGreaterThan(3*3600);
 expect(cooled.trades.some(t=>t.reason==='signal')).toBe(true);
});
test('entry timing validates bounded integer configuration', () => {
 const data=bars([100,100,100,110,112]);
 for(const entryTiming of [{...confirmation,confirmationBars:0},{...confirmation,maxWaitBars:0},{...confirmation,cooldownBars:-1},{...confirmation,cooldownBars:1.5}])
  expect(()=>prepareStrategy(data,{...strategy,entryTiming})).toThrow('Invalid entry timing');
});

test('backtest target objective persists the selected maximum size and lowest funding leverage',()=>{
  const data=bars([100,100,100,110,112,111,108,95],[100,100,100,110,113,112,109,96]);
  const settings={...config,leverageMode:'AUTO' as const,leverage:5,maxExposureMultiple:5,riskPerTradePct:10,maxMarginPct:1,maxDailyLossPct:30};
  const legacy=runPerpetualBacktest(data,contract,strategy,settings);
  const target=runPerpetualBacktest(data,contract,strategy,{...settings,autoSizing:'TARGET_RISK'});
  expect(target.tradeCount).toBeGreaterThan(0);
  expect(target.trades[0]!.contracts).toBeGreaterThan(legacy.trades[0]!.contracts);
  expect(target.trades[0]!.sizing?.fundedAmount).toBe(target.trades[0]!.contracts);
  expect(target.trades[0]!.sizing?.targetFunded).toBe(false);
  expect(legacy.trades[0]!.sizing).toBeUndefined();expect(legacy.trades[0]!.leverage).toBe(1);
});
