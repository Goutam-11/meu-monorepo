import {expect,test} from 'bun:test';
import {prepareStrategy,type StrategyConfig} from '../../../shared/trading/strategies';
import {runPerpetualBacktest} from '../../../shared/trading/perpetualBacktest';
import {advancePaperState,initializePaperState} from '../../../shared/trading/paperTrading';
const bars=(closes:number[])=>closes.map((close,i)=>({timestamp:1000+i*60,open:close,high:close+1,low:close-1,close,volume:1,closed:true}));
const config:StrategyConfig={id:'ema',fastPeriod:3,slowPeriod:8,lookback:10,atrPeriod:3,stopAtr:2,rewardRisk:1.5,executionRules:{version:2,emaEntry:'combined'},entryTiming:{mode:'confirm',confirmationBars:1,maxWaitBars:2,cooldownBars:2}};
const trend=bars([...Array<number>(20).fill(100),104,102,101,102,103,104,106,108,110,112,114,116,118,120,122,124]);
test('trend-state entry catches movement after crossover expiry without repeated pullback entries',()=>{
 const cross=prepareStrategy(trend,{...config,executionRules:{version:2,emaEntry:'crossover'}}),established=prepareStrategy(trend,{...config,executionRules:{version:2,emaEntry:'trend'}});
 expect(cross.entryProposals.every(p=>!p)).toBe(true);
 expect(established.entryProposals[26]).toMatchObject({side:'long',originTimestamp:trend[25]!.timestamp});
 expect(new Set(established.entryProposals.filter(Boolean).map(p=>p!.id)).size).toBe(1);
 expect(established.decisions.at(-1)).toContain('already confirmed');
});
test('sideways alternating closes do not qualify EMA or Donchian entries',()=>{
 const sideways=bars(Array.from({length:100},(_,i)=>100+(i%2?1:-1)));
 for(const id of ['ema','donchian'] as const){const p=prepareStrategy(sideways,{...config,id});expect(p.entryProposals.every(v=>!v)).toBe(true);expect(p.decisions.at(-1)).toContain('Sideways');}
});
test('regime modes and decisions remain prefix causal and symmetric',()=>{
 for(const mode of ['crossover','trend','combined'] as const){const c={...config,executionRules:{version:2 as const,emaEntry:mode}},all=prepareStrategy(trend,c);
 for(let n=1;n<=trend.length;n++){const prefix=prepareStrategy(trend.slice(0,n),c);expect(prefix.signals).toEqual(all.signals.slice(0,n));expect(prefix.entryProposals).toEqual(all.entryProposals.slice(0,n));expect(prefix.decisions).toEqual(all.decisions.slice(0,n));}}
 expect(prepareStrategy(bars(trend.map(b=>200-b.close)),config).entryProposals[26]?.side).toBe('short');
});
test('activation in a qualified trend creates only a fresh post-activation setup',()=>{
 const rising=bars(Array.from({length:60},(_,i)=>100+i)),activeAfter=rising[40]!.timestamp,p=prepareStrategy(rising,config,activeAfter);
 expect(p.entryProposals.slice(0,40).every(v=>!v)).toBe(true);expect(p.entryProposals[41]?.originTimestamp).toBe(activeAfter);
});
test('opposing raw crossover remains available to exits when entry quality is rejected',()=>{
 const p=prepareStrategy(bars([...Array<number>(25).fill(100),102,104,106,105,104,103,99,98]),{...config,executionRules:{version:2,emaEntry:'trend'}});
 expect(p.rawSignals).toContain('short');
});
test('v2 paper full and rolling replay agree and historical simulation accepts the same entry',()=>{
 const simulation={initialCapital:1000,leverage:2,riskPerTradePct:1,maxMarginPct:25,feeBps:10,slippageBps:5,fundingRatePct8h:0,maxTradesPerDay:10,maxPositionsOpenedPerDay:5,maxDailyLossPct:3,direction:'both' as const};
 const contract={symbol:'BTCUSD',contractSize:0.001,minContracts:1,maintenanceMarginRate:0.0025,settlement:'USD' as const},initial=initializePaperState(1000,trend[0]!.timestamp);
 const full=advancePaperState(initial,trend,contract,config,simulation,60,0).state;let rolling=initial;for(const bar of trend)rolling=advancePaperState(rolling,[bar],contract,config,simulation,60,0).state;
 expect(rolling).toEqual(full);const historical=runPerpetualBacktest(trend,contract,config,simulation);expect(historical.executionDiagnostics?.entries).toBe(full.executionDiagnostics?.entries);expect(historical.tradeCount).toBeGreaterThan(0);
});

test('Donchian does not depend on unused slow-EMA warmup',()=>{
 const data=bars([...Array<number>(30).fill(100),102,103,104]);
 const p=prepareStrategy(data,{...config,id:'donchian',slowPeriod:200,lookback:3});
 expect(p.entryProposals[31]?.source).toBe('breakout');
});
test('early crossover can confirm before mature-trend slope warmup',()=>{
 const data=bars([...Array<number>(50).fill(100),102,103,104]);
 const p=prepareStrategy(data,{...config,fastPeriod:20,slowPeriod:50,atrPeriod:14,executionRules:{version:2,emaEntry:'crossover'}});
 expect(p.entryProposals[51]?.source).toBe('crossover');
});
