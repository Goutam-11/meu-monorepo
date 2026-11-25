import {test,expect,mock,beforeEach} from 'bun:test';
import { COLLECTIONS } from "../../shared/persistence/collections";
const id='a'.repeat(24),exchangeId='b'.repeat(24),version=new Date('2026-10-07T00:00:00Z');
const config={symbol:'XRPUSD',timeframe:'1h' as const,strategy:{id:'ema' as const,fastPeriod:12,slowPeriod:26,lookback:20,atrPeriod:14,stopAtr:2,rewardRisk:2},simulation:{dailyTimezone:'Asia/Kolkata' as const,initialCapital:100,leverage:2,riskPerTradePct:0.5,maxMarginPct:10,feeBps:10,slippageBps:5,fundingRatePct8h:0,maxTradesPerDay:1,maxPositionsOpenedPerDay:1,maxDailyLossPct:1,direction:'both' as const}};
let agent:any,foreign=false,busy=false,exposure=false,owner=false,unfinished=false,stale=false,releaseFailure=false;
const commands:any[]=[],writes:any[]=[],brokerWrites:any[]=[];
const contract={symbol:'XRPUSD',contractSize:1,minContracts:1,maintenanceMarginRate:0.005,settlement:'USD'};
mock.module('server-only',()=>({}));
mock.module('@/features/backtests/server/delta-data',()=>({loadDeltaBacktestData:async()=>({contract})}));
mock.module('@/features/exchange/server/execution-account',()=>({
 executionConnection:async()=>({exchange:{id:'delta',loadMarkets:async()=>{},market:()=>({symbol:'XRP/USD:USD',active:true,contract:true,swap:true,linear:true,inverse:false,quote:'USD',settle:'USD',contractSize:1}),fetchPositions:async()=>exposure?[{symbol:'XRP/USD:USD',contracts:1,info:{size:1}}]:[],request:async(_path:string,_api:string,method:string)=>{expect(method).toBe('GET');return{success:true,result:[],meta:{after:null}};},createOrder:()=>brokerWrites.push('order')}}),
 registerExecutionAccount:async()=>({accountKey:'physical'}),
}));
mock.module('@/lib/db',()=>({default:{
 agent:{findFirst:async({where}:any)=>{expect(where.userId).toBe('owner');return foreign?null:agent;},update:async({where,data}:any)=>{
  expect(where).toEqual({id,userId:'owner',status:'PAUSED',updatedAt:version});if(stale)throw new Error('CAS failed');writes.push(data);return{...agent,...data};
 }},
 $runCommandRaw:async(command:any)=>{
  commands.push(command);
  if(command.insert)return busy?{ok:1,n:0,writeErrors:[{code:11000}]}:{ok:1,n:1};
  if(command.delete)return{ok:releaseFailure?0:1,n:command.deletes.length};
  if(command.find)return{ok:1,cursor:{id:0,firstBatch:((command.find===COLLECTIONS.CryptoPositionOwners&&owner)||(command.find===COLLECTIONS.AgentExecutions&&unfinished))?[{_id:'unresolved'}]:[]}};
  throw new Error('Unexpected mutation');
 },
}}));
const {editCryptoAgent,editCryptoAgentSchema}=await import('../src/features/agents/server/edit-crypto-agent');
const request=()=>editCryptoAgentSchema.parse({id,name:'Renamed',exchangeId,mode:agent.executionMode,agentCycles:60,risk:{maxRiskPerTradePct:0.5,maxDailyLossPct:1,maxOpenPositions:1,maxTradesPerDay:1,maxPositionsOpenedPerDay:1},capital:{allocated:100,currency:'USD'},config,expectedUpdatedAt:version.toISOString()});
beforeEach(()=>{
 foreign=busy=exposure=owner=unfinished=stale=releaseFailure=false;commands.length=writes.length=brokerWrites.length=0;
 agent={id,userId:'owner',name:'Original',status:'PAUSED',type:'CRYPTO',strategy:'ALGO_TRADING',executionMode:'PAPER',updatedAt:version,exchangeId,market:{symbols:['XRPUSD'],agentCycles:60},strategyConfig:{...config.strategy,timeframe:config.timeframe,simulation:config.simulation,contract,backtestRunId:'old'},capital:{allocated:100,currency:'USD'},risk:{}};
});
test('rename and cadence changes preserve strategy state and original backtest reference',async()=>{
 const input=request();input.agentCycles=300;await editCryptoAgent('owner',input);
 expect(writes[0]).toEqual({name:'Renamed',market:{symbols:['XRPUSD'],agentCycles:300}});
 expect(commands.filter(c=>c.insert)).toHaveLength(1);expect(commands.every(c=>!c.update)).toBe(true);
});
test('saves the canonical agent policy and projects it into the strategy revision',async()=>{
 const input=request();
 input.risk={...input.risk,maxRiskPerTradePct:0.75} as typeof input.risk;
 input.config={...config,simulation:{...config.simulation,riskPerTradePct:0.75}};
 input.restartPaper=true;
 await editCryptoAgent('owner',input);
 expect(writes[0].risk).toEqual(input.risk);
 expect(writes[0].capital).toEqual(input.capital);
 expect(writes[0].strategyConfig.simulation).toMatchObject({initialCapital:100,riskPerTradePct:0.75,maxDailyLossPct:1,maxTradesPerDay:1,maxPositionsOpenedPerDay:1});
});

test('paper execution changes require acknowledgement and retain old state through a new revision key',async()=>{
 const input=request();input.config={...config,strategy:{...config.strategy,id:'donchian'}} as typeof input.config;
 await expect(editCryptoAgent('owner',input)).rejects.toMatchObject({code:'PRECONDITION_FAILED'});expect(writes).toHaveLength(0);
 input.restartPaper=true;await editCryptoAgent('owner',input);
 expect(writes[0].strategyConfig.stateId).toStartWith(`${id}:`);expect(writes[0].strategyConfig).not.toHaveProperty('backtestRunId');
 expect(writes[0].strategyStartedAt).toBeNull();expect(writes[0].nextRunAt).toBeNull();
 expect(commands.filter(c=>c.delete).every(c=>c.delete===COLLECTIONS.ExecutionLocks)).toBe(true);
});
test('ownership, running status, stale versions and identity changes fail before taking locks',async()=>{
 const input=request();foreign=true;await expect(editCryptoAgent('owner',input)).rejects.toMatchObject({code:'NOT_FOUND'});foreign=false;
 agent.status='RUNNING';await expect(editCryptoAgent('owner',input)).rejects.toMatchObject({code:'CONFLICT'});agent.status='PAUSED';
 await expect(editCryptoAgent('owner',{...input,expectedUpdatedAt:new Date(0).toISOString()})).rejects.toMatchObject({code:'CONFLICT'});
 await expect(editCryptoAgent('owner',{...input,mode:'LIVE'})).rejects.toMatchObject({code:'BAD_REQUEST'});
 await expect(editCryptoAgent('owner',{...input,config:{...config,symbol:'BTCUSD'}})).rejects.toMatchObject({code:'BAD_REQUEST'});
 expect(commands).toHaveLength(0);
});
test('retained locks and unfinished execution cannot be bypassed by editing',async()=>{
 busy=true;await expect(editCryptoAgent('owner',request())).rejects.toMatchObject({code:'CONFLICT'});expect(writes).toHaveLength(0);
 busy=false;unfinished=true;await expect(editCryptoAgent('owner',request())).rejects.toMatchObject({code:'PRECONDITION_FAILED'});expect(writes).toHaveLength(0);
});
test('live revision requires flat broker ticker and reconciled ownership, without broker writes or resetting counters',async()=>{
 agent.executionMode='LIVE';const input=request();input.config={...config,simulation:{...config.simulation,leverage:3}};
 exposure=true;await expect(editCryptoAgent('owner',input)).rejects.toMatchObject({code:'PRECONDITION_FAILED'});expect(writes).toHaveLength(0);
 exposure=false;owner=true;await expect(editCryptoAgent('owner',input)).rejects.toMatchObject({code:'PRECONDITION_FAILED'});expect(writes).toHaveLength(0);
 owner=false;await editCryptoAgent('owner',input);expect(writes[0].strategyConfig.simulation.leverage).toBe(3);
 expect(brokerWrites).toHaveLength(0);expect(commands.some(c=>c.delete==='AgentDailyRisk'||c.update==='AgentDailyRisk')).toBe(false);
 expect(commands.filter(c=>c.insert).slice(-3).map(c=>c.documents[0]._id)).toEqual([`agent:${id}`,`exchange:${exchangeId}`,'account:physical']);
});
test('lost final CAS never saves configuration; failed release reports the saved result honestly',async()=>{
 stale=true;await expect(editCryptoAgent('owner',request())).rejects.toMatchObject({code:'CONFLICT'});expect(writes).toHaveLength(0);
 stale=false;releaseFailure=true;await expect(editCryptoAgent('owner',request())).rejects.toMatchObject({code:'CONFLICT',message:expect.stringContaining('Settings were saved')});
});
