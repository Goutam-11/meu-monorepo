import { expect, test } from 'bun:test';
import { decideSimulationEntry, evaluateMeanReversionEntry, runPerpetualBacktest, type SimulationConfig } from '../../../shared/trading/perpetualBacktest';
import { advancePaperState, initializePaperState, type PaperState } from '../../../shared/trading/paperTrading';
import { prepareStrategy, type StrategyConfig, type EntryProposal } from '../../../shared/trading/strategies';
import type { Candle } from '../../../shared/trading/emaCrossover';

const contract = { symbol: 'TEST', contractSize: 1, minContracts: 1, maintenanceMarginRate: 0.005, settlement: 'USD' as const };
const config: SimulationConfig = { initialCapital: 10000, leverage: 2, leverageMode: 'FIXED', riskPerTradePct: 1,
  maxMarginPct: 50, feeBps: 0, slippageBps: 0, fundingRatePct8h: 0, maxTradesPerDay: 100,
  maxPositionsOpenedPerDay: 100, maxDailyLossPct: 100, direction: 'both' };
const strategy: StrategyConfig = { id: 'ema', fastPeriod: 2, slowPeriod: 3, lookback: 3, atrPeriod: 2,
  stopAtr: 1, rewardRisk: 2, entryTiming: { mode: 'confirm', confirmationBars: 1, maxWaitBars: 8, cooldownBars: 2 }, executionRules: { version: 1 } };
const bars = (closes: number[]): Candle[] => closes.map((close, i) => ({ timestamp: (i + 1) * 60,
  open: close, close, high: close + 1, low: close - 1, volume: 1, closed: true }));
const proposal: EntryProposal = { id: 'ema:long:60', side: 'long', level: 95, originTimestamp: 60, confirmedTimestamp: 120, expiresTimestamp: 600 };
const decision = (overrides: Partial<Parameters<typeof decideSimulationEntry>[0]> = {}) => decideSimulationEntry({proposal,
  timestamp: 180, usedIds: [], occupied: false, cooldown: false, cash: 10000, dayStart: 10000, dailyGrossLoss: 0,
  entries: 0, orders: 0, atr: 2, open: 100, contract, strategy, config, ...overrides});
const seeded = (): PaperState => {
  const state = initializePaperState(10000, 120);
  state.history = bars([100, 100]); state.pendingAtr = 2; state.pendingEntryProposal = proposal; state.processedBars = 2;
  return state;
};

test('cooldown retains one confirmed proposal until next eligible open, across a restart', () => {
  const data = bars([100, 100, 100, 110, 112, 113, 114, 115, 116, 117]);
  const prefix = advancePaperState(initializePaperState(10000, 0), data.slice(0, 5), contract, strategy, config, 60).state;
  expect(prefix.pendingEntryProposal).toBeDefined();
  prefix.lastExitBar = prefix.processedBars - 1;
  const waiting = advancePaperState(prefix, [data[5]!], contract, strategy, config, 60).state;
  expect(waiting.position).toBeNull(); expect(waiting.executionDiagnostics?.skips.cooldown).toBe(1);
  expect(waiting.pendingEntryProposal?.id).toBe(prefix.pendingEntryProposal!.id);
  const ready = advancePaperState(JSON.parse(JSON.stringify(waiting)), data.slice(6), contract, strategy, config, 60).state;
  expect(ready.position?.timestamp).toBe(data[7]!.timestamp);
  expect(ready.usedEntryProposalIds).toEqual([prefix.pendingEntryProposal!.id]);
  expect(ready.executionDiagnostics?.skips.duplicate).toBeGreaterThan(0);
});

test('expired, consumed, wrong-direction and paused proposals report skips without entry', () => {
  expect(decision({timestamp: proposal.expiresTimestamp}).reason).toBe('expired');
  expect(decision({usedIds: [proposal.id]}).reason).toBe('duplicate');
  expect(decision({config: {...config, direction: 'short'}}).reason).toBe('direction');
  expect(decision({activeAfter: 61}).reason).toBe('inactive');
  const state = seeded(); state.pendingEntryProposal = {...proposal, expiresTimestamp: 180};
  const expired = advancePaperState(state, [bars([100, 100, 100])[2]!], contract, strategy, config, 60).state;
  expect(expired.position).toBeNull(); expect(expired.executionDiagnostics?.skips.expired).toBe(1);
  const paused = advancePaperState(seeded(), [bars([100, 100, 100])[2]!], contract, strategy, config, 60, 150).state;
  expect(paused.position).toBeNull(); expect(paused.executionDiagnostics?.skips.inactive).toBe(1);
});

test('mean targets must be favorable and cover risk and conservative roundtrip costs', () => {
  const entry = {side: 'long' as const, entryPrice: 100, stopPrice: 98, meanPrice: 104, feeRate: .001, slippageRate: .001};
  expect(evaluateMeanReversionEntry(entry)).toEqual({ok:true, targetPrice:104});
  expect(evaluateMeanReversionEntry({...entry, meanPrice:100} ).ok).toBe(false);
  expect(evaluateMeanReversionEntry({...entry, meanPrice:101} ).ok).toBe(false);
  expect(evaluateMeanReversionEntry({...entry, stopPrice:99.9, meanPrice:100.5} ).ok).toBe(false);
  expect(evaluateMeanReversionEntry({...entry, side:'short',stopPrice:102,meanPrice:96} ).ok).toBe(true);
  const state=seeded(); state.pendingMean=105;
  const result=advancePaperState(state,[bars([100,100,100])[2]!],contract,{...strategy,id:'meanReversion'},config,60).state;
  expect(result.position?.target).toBe(105);
  expect(result.position?.target).not.toBe(100+2*strategy.rewardRisk);
});

test('FIXED uses conservative shared budgets and AUTO liquidation buffer', () => {
  const result=decision({cash:100,dayStart:100,config:{...config,riskPerTradePct:10,maxMarginPct:100,feeBps:100,slippageBps:100}});
  expect(result.entry).toBeDefined();
  const p=result.entry!, costs=(p.entry+Math.max(p.entry,p.stop))*.02;
  expect(p.contracts*(Math.abs(p.entry-p.stop)+costs)).toBeLessThanOrEqual(10);
  expect(p.contracts*(p.entry/config.leverage+costs)).toBeLessThanOrEqual(100);
  expect(decision({atr:40,config:{...config,leverage:5}}).reason).toBe('liquidation_distance');
  expect(decision({contract:{...contract,minContracts:100000}}).reason).toBe('budget_minimum');
});

test('paper batches and serial restarts match backtest decisions and closed trades', () => {
  const data=bars([100,100,100,110,112,113,90,88,87,110,112,113,114,115,90]);
  const full=advancePaperState(initializePaperState(10000,0),data,contract,strategy,config,60).state;
  let rolling=initializePaperState(10000,0);
  for(const bar of data)rolling=advancePaperState(JSON.parse(JSON.stringify(rolling)),[bar],contract,strategy,config,60).state;
  expect(rolling).toEqual(full);
  const backtest=runPerpetualBacktest(data,contract,strategy,config);
  expect(full.position).toBeNull(); expect(full.trades).toEqual(backtest.trades);
  expect(full.cash).toBe(backtest.finalEquity); expect(full.executionDiagnostics).toEqual(backtest.executionDiagnostics);
});

test('gross daily losses are never replenished by profitable closes; exits survive blocks', () => {
  const state=seeded(); state.dailyGrossLoss=100; state.position={sign:1,entry:90,timestamp:60,contracts:1,units:1,
    stop:80,target:99,margin:45,fee:0,funding:0,liquidation:45};
  const settings={...config,maxDailyLossPct:1};
  const won=advancePaperState(state,[bars([100,100,100])[2]!],contract,strategy,settings,60).state;
  expect(won.trades[0]?.netPnl).toBeGreaterThan(0); expect(won.dailyGrossLoss).toBe(100);
  expect(decision({cash:won.cash,dailyGrossLoss:won.dailyGrossLoss!,config:settings}).reason).toBe('daily_loss');
});

test('mean exits close only their side even when entries are paused or loss blocked', () => {
  const state=seeded(); state.pendingExit='exit'; state.pendingExitSide='short'; state.dailyGrossLoss=100;
  state.position={sign:1,entry:100,timestamp:60,contracts:1,units:1,stop:80,target:120,margin:50,fee:0,funding:0,liquidation:45};
  const data=[bars([100,100,100])[2]!], mean={...strategy,id:'meanReversion' as const};
  const held=advancePaperState(state,data,contract,mean,{...config,maxDailyLossPct:1},60,500).state;
  expect(held.position).not.toBeNull();
  const closed=advancePaperState({...state,pendingExitSide:'long'},data,contract,mean,{...config,maxDailyLossPct:1},60,500).state;
  expect(closed.position).toBeNull(); expect(closed.trades[0]?.reason).toBe('signal');
  expect(closed.executionDiagnostics?.entries).toBe(0);
});

test('gross daily loss resets at UTC midnight consistently in both simulators', () => {
  const data=bars([100,100,100,110,112,113,90,88,87,110,112,113,114,115,90]);
  data.forEach((bar,i)=>{bar.timestamp=86040+i*60;});
  const settings={...config,feeBps:5,slippageBps:2,fundingRatePct8h:.01};
  const paper=advancePaperState(initializePaperState(10000,85980),data,contract,strategy,settings,60).state;
  const backtest=runPerpetualBacktest(data,contract,strategy,settings);
  expect(paper.day).toBe(1); expect(paper.trades).toEqual(backtest.trades);
  expect(paper.cash).toBe(backtest.finalEquity); expect(paper.executionDiagnostics).toEqual(backtest.executionDiagnostics);
});

test('restart validation rejects malformed proposal and dedupe state', () => {
  const state=seeded(), data=[bars([100,100,100])[2]!];
  expect(()=>advancePaperState({...state,pendingEntryProposal:{...proposal,expiresTimestamp:NaN}},data,contract,strategy,config,60)).toThrow('Invalid paper entry proposal');
  expect(()=>advancePaperState({...state,usedEntryProposalIds:[proposal.id,proposal.id]},data,contract,strategy,config,60)).toThrow('Invalid enhanced paper execution state');
});

test('legacy replay retains numeric fills and omits optional diagnostics/protection fields', () => {
  const data=bars([100,100,100,110,112,111,108,95]);
  const old={...strategy,executionRules:undefined,entryTiming:undefined,stopAtr:2};
  const result=runPerpetualBacktest(data,contract,old,config);
  expect(result.trades[0]).toMatchObject({entryTimestamp:300,entryPrice:112,contracts:7});
  expect(result.executionDiagnostics).toBeUndefined(); expect(result.trades[0]!.stopPrice).toBeUndefined();
  const paper=advancePaperState(initializePaperState(10000,0),data,contract,old,config,60).state;
  expect(paper.executionDiagnostics).toBeUndefined(); expect(paper.usedEntryProposalIds).toBeUndefined();
});

test('entry extension bounds reject a gap or slippage beyond the completed-candle bound',()=>{
 expect(decision({proposal:{...proposal,priceLimit:99}}).reason).toBe('price_extension');
 expect(decision({proposal:{...proposal,priceLimit:100},config:{...config,slippageBps:5}}).reason).toBe('price_extension');
 expect(decision({proposal:{...proposal,priceLimit:101}}).entry).toBeDefined();
 expect(decision({proposal:{...proposal,side:'short',level:105,priceLimit:101}}).reason).toBe('price_extension');
});
