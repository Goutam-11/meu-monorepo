import {expect,test} from 'bun:test';
import {advanceExitProtection,validateExitPolicy,type ExitPolicy,type ProtectionState} from '../../../shared/trading/exitPolicy';
import {runPerpetualBacktest,type SimulationConfig} from '../../../shared/trading/perpetualBacktest';
import type {Candle} from '../../../shared/trading/emaCrossover';
const policy:ExitPolicy={version:1,mode:'atr-trailing',activationR:1,atrMultiple:2};
const state:ProtectionState={initialStop:98,stop:98,targetEnabled:true,trailingActive:false};
const advance=(close:number,atr=1,current=state)=>advanceExitProtection({side:'long',entryPrice:100,close,atr,state:current,policy});
const strategy={id:'ema' as const,fastPeriod:2,slowPeriod:3,lookback:3,atrPeriod:2,stopAtr:2,rewardRisk:4};
const contract={symbol:'TEST',contractSize:.001,minContracts:1,maintenanceMarginRate:.005,settlement:'USD' as const};
const config:SimulationConfig={initialCapital:1000,leverage:2,riskPerTradePct:1,maxMarginPct:25,feeBps:0,slippageBps:0,fundingRatePct8h:0,maxTradesPerDay:10,maxPositionsOpenedPerDay:5,maxDailyLossPct:5,direction:'long'};
const bars=(closes:number[]):Candle[]=>closes.map((close,i)=>({timestamp:(i+1)*3600,open:close,close,high:close+.5,low:close-.5,volume:1,closed:true}));
const data=bars([100,100,100,110,112,114,116,120,124,128,132,128,124,120]);

test('completed close activates at original R without mutating state or loosening protection',()=>{
 expect(advance(101.99)).toEqual(state);
 const active=advance(102);
 expect(active).toEqual({initialStop:98,stop:100,targetEnabled:false,trailingActive:true});
 expect(state).toEqual({initialStop:98,stop:98,targetEnabled:true,trailingActive:false});
 expect(advance(103,4,active).stop).toBe(100);
 expect(advance(108,1,active).stop).toBe(106);
});
test('short trailing is symmetric and survives retracement without loosening',()=>{
 const initial={...state,initialStop:102,stop:102};
 const active=advanceExitProtection({side:'short',entryPrice:100,close:98,atr:1,state:initial,policy});
 expect(active).toEqual({initialStop:102,stop:100,targetEnabled:false,trailingActive:true});
 expect(advanceExitProtection({side:'short',entryPrice:100,close:99,atr:5,state:active,policy}).stop).toBe(100);
 expect(advanceExitProtection({side:'short',entryPrice:100,close:94,atr:1,state:active,policy}).stop).toBe(96);
});
test('invalid settings and unsupported mean-reversion policy fail explicitly',()=>{
 for(const invalid of [null,{}, {...policy,version:2},{...policy,activationR:0},{...policy,atrMultiple:Infinity},{...policy,atrMultiple:11}])expect(()=>validateExitPolicy(invalid)).toThrow();
 expect(()=>validateExitPolicy(policy,'meanReversion')).toThrow('trend strategies');
 expect(()=>advance(103,NaN)).toThrow();
 expect(()=>advance(103,1,{...state,stop:97})).toThrow();
 expect(()=>runPerpetualBacktest(data,contract,{...strategy,id:'meanReversion'},{...config,exitPolicy:policy})).toThrow('trend strategies');
});
test('historical updates apply next candle and preserve initial chart protection',()=>{
 const r=runPerpetualBacktest(data,contract,strategy,{...config,exitPolicy:policy});
 expect(r.trades).toHaveLength(1);
 const trade=r.trades[0]!,timeline=trade.protectionTimeline!;
 expect(trade.stopPrice).toBe(100.5);expect(trade.targetPrice).toBe(158);
 expect(timeline[0]).toEqual({effectiveFrom:18000,stopPrice:100.5,targetEnabled:true,trailingActive:false});
 expect(timeline[1]!.effectiveFrom).toBe(36000); // close124 at32400 activates for next bar
 expect(timeline[1]!.targetEnabled).toBe(false);
 for(let i=1;i<timeline.length;i++)expect(timeline[i]!.stopPrice).toBeGreaterThanOrEqual(timeline[i-1]!.stopPrice);
 expect(JSON.parse(JSON.stringify(r))).toEqual(r);
 const prefix=runPerpetualBacktest(data.slice(0,11),contract,strategy,{...config,exitPolicy:policy});
 expect(timeline.filter(x=>x.effectiveFrom<=data[10]!.timestamp)).toEqual(prefix.trades[0]!.protectionTimeline!);
});
test('new close-derived stop cannot retrospectively hit the candle that calculated it',()=>{
 const r=runPerpetualBacktest(data,contract,strategy,{...config,exitPolicy:{...policy,atrMultiple:.1}});
 const trade=r.trades[0]!,activation=trade.protectionTimeline![1]!;
 expect(data[8]!.low).toBeLessThan(activation.stopPrice);
 expect(activation.effectiveFrom).toBe(data[9]!.timestamp);
 expect(trade.exitTimestamp).toBeGreaterThan(data[8]!.timestamp);
 expect(trade.reason).toBe('stop');
});
test('fixed target executes before close activation and missing policy preserves legacy shape',()=>{
 const fixed=runPerpetualBacktest(data,contract,strategy,config);
 expect(fixed.trades[0]?.stopPrice).toBeUndefined();expect(fixed.trades[0]?.protectionTimeline).toBeUndefined();
 const smallTarget={...strategy,rewardRisk:.5};
 const original=runPerpetualBacktest(data,contract,smallTarget,config);
 const adaptive=runPerpetualBacktest(data,contract,smallTarget,{...config,exitPolicy:policy});
 expect(adaptive.trades.map(({protectionTimeline,stopPrice,targetPrice,...t})=>t)).toEqual(original.trades);
 expect(adaptive.trades[0]?.reason).toBe('target');
 expect(adaptive.trades[0]?.protectionTimeline).toHaveLength(1);
});
