import {expect,test} from 'bun:test';
import {advancePaperState,initializePaperState} from '../../../shared/trading/paperTrading';
import type {Candle} from '../../../shared/trading/emaCrossover';
import {runPerpetualBacktest,type SimulationConfig} from '../../../shared/trading/perpetualBacktest';
const contract={symbol:'TEST',contractSize:1,minContracts:1,maintenanceMarginRate:.005,settlement:'USD' as const};
const strategy={id:'ema' as const,fastPeriod:2,slowPeriod:3,lookback:2,atrPeriod:2,stopAtr:2,rewardRisk:4};
const simulation:SimulationConfig={initialCapital:1000,leverage:2,riskPerTradePct:1,maxMarginPct:50,feeBps:0,slippageBps:0,fundingRatePct8h:0,maxTradesPerDay:10,maxPositionsOpenedPerDay:5,maxDailyLossPct:5,direction:'both',exitPolicy:{version:1,mode:'atr-trailing',activationR:1,atrMultiple:1}};
const candle=(timestamp:number,open:number,high:number,low:number,close:number):Candle=>({timestamp,open,high,low,close,volume:1,closed:true});
function seed(){
 const state=initializePaperState(1000,180);
 state.history=[candle(60,100,101,99,100),candle(120,100,101,99,100),candle(180,100,101,99,100)];
 state.position={sign:1,entry:100,timestamp:180,contracts:1,units:1,margin:50,fee:0,funding:0,liquidation:50,stop:98,target:108,initialStop:98,targetEnabled:true,trailingActive:false,protectionTimeline:[{effectiveFrom:180,stopPrice:98,targetEnabled:true,trailingActive:false}]};
 return state;
}
test('adaptive paper protection survives JSON restart and applies only on next candle',()=>{
 const bars=[candle(240,100,105,99,104),candle(300,104,105,101,102),candle(360,102,103,99,100)];
 const batch=advancePaperState(seed(),bars,contract,strategy,simulation,60).state;
 const first=advancePaperState(seed(),bars.slice(0,1),contract,strategy,simulation,60).state;
 expect(first.position).not.toBeNull(); // 99 low precedes the new close-derived stop.
 expect(first.position!.trailingActive).toBe(true);
 expect(first.position!.stop).toBe(100);
 expect(first.position!.protectionTimeline!.at(-1)!.effectiveFrom).toBe(300);
 const resumed=advancePaperState(JSON.parse(JSON.stringify(first)),bars.slice(1),contract,strategy,simulation,60).state;
 expect(resumed).toEqual(batch);
 expect(seed().position!.protectionTimeline).toHaveLength(1);
 expect(batch.trades[0]!.exitTimestamp).toBe(360);
 expect(batch.trades[0]!.reason).toBe('stop');
 expect(batch.trades[0]!.stopPrice).toBe(98);
 expect(batch.trades[0]!.protectionTimeline!.at(-1)!.stopPrice).toBe(100);
});
test('paper rejects missing/corrupt adaptive protection and policy changes while open',()=>{
 for(const change of [{initialStop:NaN},{initialStop:101},{targetEnabled:true,trailingActive:true},{protectionTimeline:[]},{stop:99}]){
  const state=seed();Object.assign(state.position!,change);
  expect(()=>advancePaperState(state,[],contract,strategy,simulation,60)).toThrow('adaptive protection');
 }
 expect(()=>advancePaperState(seed(),[],contract,strategy,{...simulation,exitPolicy:undefined},60)).toThrow('policy changed');
 expect(()=>advancePaperState(seed(),[],contract,strategy,simulation)).toThrow('timeframe');
});

test('paper and historical trailing execute the same causal exit path',()=>{
 const bars=[100,100,100,110,112,114,116,120,124,128,132,128,124,120].map((close,i)=>candle((i+1)*60,close,close+.5,close-.5,close));
 const settings={...simulation,exitPolicy:{version:1 as const,mode:'atr-trailing' as const,activationR:1,atrMultiple:2},direction:'long' as const};
 const paper=advancePaperState(initializePaperState(1000,0),bars,contract,strategy,settings,60).state;
 const historical=runPerpetualBacktest(bars,contract,strategy,settings);
 expect(paper.position).toBeNull();
 expect(paper.trades).toEqual(historical.trades);
 expect(paper.cash).toBe(historical.finalEquity);
});
