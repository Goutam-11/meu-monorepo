import { describe, expect, test } from 'bun:test';
import { advancePaperState, initializePaperState } from '../../../shared/trading/paperTrading';
import type { Candle } from '../../../shared/trading/emaCrossover';
import type { Contract, SimulationConfig } from '../../../shared/trading/perpetualBacktest';
import type { StrategyConfig } from '../../../shared/trading/strategies';

const contract: Contract = { symbol: 'TEST', contractSize: 1, minContracts: 1, maintenanceMarginRate: 0.005, settlement: 'USD' };
const simulation: SimulationConfig = { initialCapital: 10_000, leverage: 5, riskPerTradePct: 1, maxMarginPct: 50,
  feeBps: 0, slippageBps: 0, fundingRatePct8h: 0.01, maxTradesPerDay: 20,
  maxPositionsOpenedPerDay: 20, maxDailyLossPct: 5, direction: 'both' };
const strategy: StrategyConfig = { id: 'ema', fastPeriod: 2, slowPeriod: 3, lookback: 2, atrPeriod: 2, stopAtr: 2, rewardRisk: 3 };
const candle = (timestamp: number, open: number, high: number, low: number, close: number): Candle =>
  ({ timestamp, open, high, low, close, volume: 10, closed: true });

describe('durable paper trading', () => {
  test('signals at a close fill on the following open and repeated candles are idempotent', () => {
    const seed = [candle(60, 10, 11, 9, 10), candle(120, 10, 11, 9, 10), candle(180, 9, 10, 8, 9),
      candle(240, 8, 9, 7, 8), candle(300, 7, 8, 6, 7), candle(360, 10, 12, 9, 11)];
    const init = initializePaperState(10_000, 0);
    const first = advancePaperState(init, seed, contract, strategy, simulation, 60);
    expect(first.processed).toBe(seed.length);
    expect(first.state.pending).toBe('long');
    const fill = candle(420, 12, 13, 11, 12);
    const second = advancePaperState(first.state, [fill], contract, strategy, simulation, 60);
    expect(second.state.position?.timestamp).toBe(420);
    expect(second.state.position?.entry).toBe(12);
    expect(advancePaperState(second.state, [fill], contract, strategy, simulation, 60).processed).toBe(0);
  });

  test('does not close at the latest candle close and retains monetary position balance', () => {
    const state = initializePaperState(10_000, 60);
    state.history = [candle(60, 10, 11, 9, 10), candle(120, 10, 11, 9, 10), candle(180, 9, 10, 8, 9),
      candle(240, 8, 9, 7, 8), candle(300, 7, 8, 6, 7), candle(360, 10, 12, 9, 11)];
    state.lastCandle = 360; state.pending = 'long'; state.pendingAtr = 1;
    const result = advancePaperState(state, [candle(420, 12, 13, 11, 12)], contract, strategy, simulation, 60).state;
    expect(result.position).not.toBeNull();
    expect(result.trades).toHaveLength(0);
    expect(result.cash).toBe(10_000);
    expect(result.position!.contracts).toBeGreaterThanOrEqual(1);
  });

  test('funding debit for long and credit for short follow the rate sign convention', () => {
    const base = initializePaperState(10_000, 28_800 - 60);
    base.history = [candle(28_800 - 60, 100, 101, 99, 100)];
    base.position = { sign: 1, entry: 100, timestamp: 28_800 - 60, contracts: 1, units: 1, stop: 1, target: 1000,
      margin: 20, fee: 0, funding: 0, liquidation: 1 };
    const bar = candle(28_800, 100, 101, 99, 100);
    const long = advancePaperState(base, [bar], contract, strategy, simulation, 60).state;
    expect(long.cash).toBeCloseTo(9_999.99);
    expect(base.position!.funding).toBe(0);
    const shortState = { ...base, cash: 10_000, position: { ...base.position, sign: -1 as const, stop: 1000, target: 1, liquidation: 1000 } };
    const short = advancePaperState(shortState, [bar], contract, strategy, simulation, 60).state;
    expect(short.cash).toBeCloseTo(10_000.01);
  });

  test('risk and margin caps block an oversized entry and gap checks reject missing bars', () => {
    const state = initializePaperState(10_000, 360);
    state.history = [candle(60, 10, 11, 9, 10), candle(120, 10, 11, 9, 10), candle(180, 9, 10, 8, 9),
      candle(240, 8, 9, 7, 8), candle(300, 7, 8, 6, 7), candle(360, 10, 12, 9, 11)];
    state.pending = 'long'; state.pendingAtr = 100_000;
    const noFill = advancePaperState(state, [candle(420, 12, 13, 11, 12)], contract, strategy, simulation, 60).state;
    expect(noFill.position).toBeNull();
    expect(() => advancePaperState(initializePaperState(10_000, 60), [candle(180, 10, 11, 9, 10)], contract, strategy, simulation, 60)).toThrow('Candle gap');
  });
});

test('resuming suppresses pending pre-activation entries while reconciling protective exits', () => {
  const state = initializePaperState(10000, 360);
  state.history = [candle(360, 10, 11, 9, 10)];
  state.pending = 'long'; state.pendingAtr = 1;
  const bar = candle(420, 10, 11, 9, 10);
  const resumed = advancePaperState(state, [bar], contract, strategy, simulation, 60, 400).state;
  expect(resumed.position).toBeNull();
  const occupied = { ...state, position: { sign: 1 as const, entry: 10, timestamp: 300, contracts: 1, units: 1, stop: 9.5, target: 20, margin: 2, fee: 0, funding: 0, liquidation: 8 } };
  const protectedState = advancePaperState(occupied, [bar], contract, strategy, simulation, 60, 500).state;
  expect(protectedState.position).toBeNull();
  expect(protectedState.trades[0]?.reason).toBe('stop');
});

test('confirmation and post-exit cooldown survive paper state serialization and batch boundaries', () => {
 const timing={...strategy,entryTiming:{mode:'confirm' as const,confirmationBars:1,maxWaitBars:3,cooldownBars:2}};
 const closes=[10,10,10,12,13,14,10,9,8,12,13,14,9,8,12,13,14];
 const bars=closes.map((v,i)=>candle((i+1)*60,v,v+0.2,v-0.2,v));
 const initial=initializePaperState(10000,0);
 const full=advancePaperState(initial,bars,contract,timing,simulation,60).state;
 let rolling=initial;
 for(const bar of bars){
  rolling=advancePaperState(JSON.parse(JSON.stringify(rolling)),[bar],contract,timing,simulation,60).state;
 }
 expect(rolling).toEqual(full);
 expect(full.totalTradeCount).toBeGreaterThan(0);
 expect(full.lastExitBar).toBeDefined();
});

test('paper target sizing retains funded-size diagnostics across a restart and protective exit',()=>{
  const state=initializePaperState(100,360);
  state.history=[candle(360,10,10.1,9.9,10)];state.pending='long';state.pendingAtr=0.25;
  const settings={...simulation,initialCapital:100,leverageMode:'AUTO' as const,autoSizing:'TARGET_RISK' as const,leverage:5,riskPerTradePct:10,maxMarginPct:100,maxExposureMultiple:5,feeBps:10,slippageBps:0,fundingRatePct8h:0,maxDailyLossPct:30};
  const entered=advancePaperState(state,[candle(420,10,10.1,9.9,10)],contract,strategy,settings,60).state;
  expect(entered.position).toMatchObject({contracts:19,leverage:2,sizing:{targetAmount:19,fundedAmount:19,targetFunded:true}});
  const closed=advancePaperState(JSON.parse(JSON.stringify(entered)),[candle(480,10,10.1,9.4,9.6)],contract,strategy,settings,60).state;
  expect(closed.position).toBeNull();expect(closed.trades[0]?.sizing).toEqual(entered.position!.sizing);
  const legacy=advancePaperState(state,[candle(420,10,10.1,9.9,10)],contract,strategy,{...settings,autoSizing:undefined},60).state;
  expect(legacy.position?.contracts).toBe(9);expect(legacy.position?.leverage).toBe(1);expect(legacy.position?.sizing).toBeUndefined();
});
