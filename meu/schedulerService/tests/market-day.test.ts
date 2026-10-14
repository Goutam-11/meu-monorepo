import { expect, test } from 'bun:test';
import { validateCryptoStrategy } from '../src/algorithms/crypto/cryptoStrategyConfig';
import { marketDate, marketDayIndex, marketDayStart, exchangeMarketTimezone } from '../../../shared/trading/marketDay';
import { advancePaperState, initializePaperState } from '../../../shared/trading/paperTrading';
import { runPerpetualBacktest, type SimulationConfig } from '../../../shared/trading/perpetualBacktest';
import type { Candle } from '../../../shared/trading/emaCrossover';

const epoch = (date: string) => Date.parse(date) / 1000;
const contract = {symbol:'TEST',contractSize:1,minContracts:1,maintenanceMarginRate:.005,settlement:'USD' as const};
const strategy = {id:'ema' as const,fastPeriod:2,slowPeriod:3,lookback:3,atrPeriod:2,stopAtr:2,rewardRisk:2};
const simulation: SimulationConfig = {initialCapital:1000,leverage:2,riskPerTradePct:1,maxMarginPct:50,
 feeBps:5,slippageBps:2,fundingRatePct8h:.01,maxTradesPerDay:1,maxPositionsOpenedPerDay:1,maxDailyLossPct:5,direction:'both'};
const candle = (timestamp:number, close=100):Candle => ({timestamp,open:close,high:close+.5,low:close-.5,close,volume:1,closed:true});

for (const timezone of ['Asia/Kolkata','UTC'] as const) {
 const midnight = epoch(timezone === 'UTC' ? '2026-10-02T00:00:00Z' : '2026-10-01T18:30:00Z');
 test(`${timezone}: exact midnight date and ledger start agree`, () => {
  expect(marketDate(midnight-1,timezone)).toBe('2026-10-01');
  expect(marketDate(midnight,timezone)).toBe('2026-10-02');
  expect(marketDayStart(midnight,timezone)).toBe(midnight);
  expect(marketDayIndex(midnight,timezone)-marketDayIndex(midnight-1,timezone)).toBe(1);
 });
 for (const enhanced of [false,true]) {
  const config = enhanced ? {...strategy,executionRules:{version:1 as const}} : strategy;
  function seeded(at:number) {
   const state = initializePaperState(1000,at,timezone);
   state.history=[candle(at-1800),candle(at-900),candle(at)];
   state.entries=state.entryOrders=1;
   state.pending='long';state.pendingAtr=1;
   if (enhanced) state.pendingEntryProposal={id:'setup',side:'long',level:99,originTimestamp:at-900,confirmedTimestamp:at,expiresTimestamp:at+1800};
   return state;
  }
  test(`${timezone}: ${enhanced?'enhanced':'legacy'} consumed entry limits reset only at midnight`, () => {
   const settings={...simulation,dailyTimezone:timezone};
   const before=advancePaperState(seeded(midnight-1800),[candle(midnight-900)],contract,config,settings,900).state;
   expect(before.position).toBeNull();expect(before.entries).toBe(1);
   const after=advancePaperState(seeded(midnight-900),[candle(midnight)],contract,config,settings,900).state;
   expect(after.position).not.toBeNull();expect(after.position!.timestamp).toBe(midnight);
   expect(after.entries).toBe(1);
  });
 }
 test(`${timezone}: serialized historical and paper executions match with a binding daily cap`, () => {
  const closes=[100,100,100,110,112,90,88,110,112,90,88,110,112,90,88,110,112,90,88,100];
  const bars=closes.map((close,i)=>candle(midnight-8*900+i*900,close));
  const settings={...simulation,dailyTimezone:timezone};
  const smallContract={...contract,contractSize:.01};
  let paper=initializePaperState(1000,bars[0]!.timestamp-900,timezone);
  for(const b of bars)paper=advancePaperState(JSON.parse(JSON.stringify(paper)),[b],smallContract,strategy,settings,900).state;
  const historical=runPerpetualBacktest(bars,smallContract,strategy,settings);
  expect(historical.tradeCount).toBe(2); // One on each side of the local midnight.
  expect(paper.position).toBeNull();
  expect(paper.trades).toEqual(historical.trades);
  expect(paper.cash).toBe(historical.finalEquity);
 });
}

test('legacy paper migration carries consumed counters, loss baseline and open exposure until the new midnight',()=>{
 const at=epoch('2026-10-01T20:00:00Z');
 const state=initializePaperState(1000,at,'UTC');delete state.dailyTimezone;
 state.history=[candle(at-1800),candle(at-900),candle(at)];
 state.cash=990;state.dayStart=1000;state.entries=state.entryOrders=1;state.dailyGrossLoss=10;
 state.position={sign:1,entry:100,timestamp:at,contracts:1,units:1,margin:50,fee:0,funding:0,liquidation:50,stop:90,target:120};
 const enhanced={...strategy,executionRules:{version:1 as const}};
 const settings={...simulation,fundingRatePct8h:0,dailyTimezone:'Asia/Kolkata' as const};
 const migrated=advancePaperState(state,[candle(at+900)],contract,enhanced,settings,900).state;
 expect(migrated.dailyTimezone).toBe('Asia/Kolkata');
 expect(migrated.day).toBe(marketDayIndex(at,'Asia/Kolkata'));
 expect(migrated.entries).toBe(1);expect(migrated.entryOrders).toBe(1);
 expect(migrated.dayStart).toBe(1000);expect(migrated.dailyGrossLoss).toBe(10);
 expect(migrated.position).toEqual(state.position);expect(migrated.cash).toBe(990);
 expect(state.dailyTimezone).toBeUndefined(); // Input remains untouched.
 const restarted=JSON.parse(JSON.stringify(migrated));
 const nextMidnight=epoch('2026-10-02T18:30:00Z');
 const reset=advancePaperState(restarted,[candle(nextMidnight)],contract,enhanced,settings).state;
 expect(reset.entries).toBe(0);expect(reset.entryOrders).toBe(0);expect(reset.dailyGrossLoss).toBe(0);
});

test('exchange policy and invalid timezone validation',()=>{
 for(const exchange of ['delta','DELTA','zerodha','kite'])expect(exchangeMarketTimezone(exchange)).toBe('Asia/Kolkata');
 expect(exchangeMarketTimezone('binance')).toBe('UTC');
 const saved={...strategy,timeframe:'1h' as const,simulation,contract};
 expect(validateCryptoStrategy(saved).simulation.dailyTimezone).toBe('Asia/Kolkata');
 expect(saved.simulation.dailyTimezone).toBeUndefined();
 expect(()=>validateCryptoStrategy({...saved,simulation:{...simulation,dailyTimezone:'UTC'}})).toThrow('Delta strategies');
 const invalid={...simulation,dailyTimezone:'Europe/London'} as unknown as SimulationConfig;
 expect(()=>runPerpetualBacktest([candle(60),candle(120)],contract,strategy,invalid)).toThrow('timezone');
 expect(()=>advancePaperState(initializePaperState(1000,0),[],contract,strategy,invalid)).toThrow('timezone');
});


test('migration cannot restore allowance erased by the old UTC midnight',()=>{
 const at=epoch('2026-10-02T02:00:00Z');
 const state=initializePaperState(1000,at,'UTC');delete state.dailyTimezone;
 state.processedBars=3;state.history=[candle(at-1800),candle(at-900),candle(at)];
 const config={...strategy,executionRules:{version:1 as const}};
 const settings={...simulation,fundingRatePct8h:0,dailyTimezone:'Asia/Kolkata' as const};
 const migrated=advancePaperState(state,[candle(at+900)],contract,config,settings,900).state;
 expect(migrated.entries).toBe(settings.maxPositionsOpenedPerDay);
 expect(migrated.entryOrders).toBe(settings.maxTradesPerDay);
 expect(migrated.dailyGrossLoss).toBe(50);
 const midnight=epoch('2026-10-02T18:30:00Z');
 const reset=advancePaperState(JSON.parse(JSON.stringify(migrated)),[candle(midnight)],contract,config,settings).state;
 expect(reset.entries).toBe(0);expect(reset.dailyGrossLoss).toBe(0);
});
