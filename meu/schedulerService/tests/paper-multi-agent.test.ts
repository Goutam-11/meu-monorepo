import {test,expect} from 'bun:test';
import type {Db} from 'mongodb';
import {initializePaperState,type PaperState} from '../../../shared/trading/paperTrading';
import {runPaperStrategy} from '../src/agent/runCryptoStrategy';
import type {ExecutionSafety} from '../src/agent/tradeGuard';
const interval=3600,end=Math.floor(Date.now()/1000/interval)*interval;
const config={id:'ema' as const,fastPeriod:2,slowPeriod:3,lookback:3,atrPeriod:2,stopAtr:2,rewardRisk:1.5,timeframe:'1h' as const,simulation:{initialCapital:1000,leverage:2,riskPerTradePct:1,maxMarginPct:25,feeBps:5,slippageBps:2,fundingRatePct8h:0,maxTradesPerDay:1,maxPositionsOpenedPerDay:1,maxDailyLossPct:5,direction:'both' as const},contract:{symbol:'BTCUSD',contractSize:1,minContracts:1,maintenanceMarginRate:0.005,settlement:'USD' as const}};

test('two paper agents advance independent portfolios and counters without private exchange calls or entry replay',async()=>{
 const records=new Map<string,{_id:string;userId:string;state:PaperState;contract:unknown}>();
 const bar=(timestamp:number)=>({timestamp,open:100,close:100,high:101,low:99,volume:10,closed:true});
 for(const [id,capital,symbol] of [['paper-btc',1000,'BTCUSD'],['paper-xrp',2000,'XRPUSD']] as const){
  const state=initializePaperState(capital,end-2*interval);state.history=Array.from({length:20},(_,i)=>bar(end-(21-i)*interval));state.pending='long';state.pendingAtr=1;
  records.set(id,{_id:id,userId:'owner',state,contract:{...config.contract,symbol}});
 }
 const db={collection:(name:string)=>{
  expect(name).toBe('PaperTradingState');return{
   findOne:async(filter:{_id:string;userId:string})=>{const record=records.get(filter._id);return record?.userId===filter.userId?record:null;},
   replaceOne:async(filter:{_id:string;userId:string;'state.lastCandle':number},record:{_id:string;userId:string;state:PaperState;contract:unknown})=>{
    const previous=records.get(filter._id);if(previous?.userId!==filter.userId||previous.state.lastCandle!==filter['state.lastCandle'])return{modifiedCount:0};records.set(filter._id,record);return{modifiedCount:1};
   },insertOne:async(record:{_id:string;userId:string;state:PaperState;contract:unknown})=>{if(records.has(record._id))throw new Error("Duplicate revision");records.set(record._id,record);return{insertedId:record._id};},
  };
 }} as unknown as Db;
 const previous=globalThis.fetch;let publicReads=0,activeChecks=0;
 globalThis.fetch=(async(input)=>{
  const url=new URL(String(input));expect(url.hostname).toBe('api.india.delta.exchange');publicReads++;
  let result:unknown;
  if(url.pathname.includes('/products/')){
   const symbol=url.pathname.split('/').at(-1);result={symbol,contract_type:'perpetual_futures',notional_type:'vanilla',is_quanto:false,contract_value:'1',maintenance_margin:'0.5',initial_margin:'1',max_leverage_notional:'100000',initial_margin_scaling_factor:'0.000001',maintenance_margin_scaling_factor:'0.000001',settling_asset:{symbol:'USD'}};
  }else{
   expect(url.pathname).toContain('history/candles');const bars=[];
   for(let t=Number(url.searchParams.get('start'));t<Number(url.searchParams.get('end'));t+=interval)bars.push({time:t,open:100,close:100,high:101,low:99,volume:10});result=bars;
  }
  return Response.json({success:true,result});
 }) as typeof fetch;
 const run=(id:string,symbol:string,capital:number,stateId?:string)=>{
  const localConfig={...config,...(stateId?{stateId}:{}),simulation:{...config.simulation,initialCapital:capital},contract:{...config.contract,symbol}};
  const safety={agentId:id,assertActive:async()=>{activeChecks++;},executeOrder:()=>{throw new Error('Paper must not call private order tools');},reserveDailyEntry:()=>{throw new Error('Paper counters must stay in its simulated state');}} as unknown as ExecutionSafety;
  return runPaperStrategy({db,agentId:id,userId:'owner',symbol,config:localConfig,safety});
 };
 try{
  await Promise.all([run('paper-btc','BTCUSD',1000),run('paper-xrp','XRPUSD',2000)]);
  const btc=records.get('paper-btc')!.state,xrp=records.get('paper-xrp')!.state;
  expect(btc.position).not.toBeNull();expect(xrp.position).not.toBeNull();expect(xrp.position!.contracts).toBeGreaterThan(btc.position!.contracts);
  expect(btc.initialCapital).toBe(1000);expect(xrp.initialCapital).toBe(2000);expect(btc.entryOrders).toBe(1);expect(xrp.entryOrders).toBe(1);
  expect(records.get('paper-btc')!.contract).toMatchObject({symbol:'BTCUSD'});expect(records.get('paper-xrp')!.contract).toMatchObject({symbol:'XRPUSD'});
  const before=JSON.stringify([...records]);await Promise.all([run('paper-btc','BTCUSD',1000),run('paper-xrp','XRPUSD',2000)]);
  expect(JSON.stringify([...records])).toBe(before);expect(activeChecks).toBe(2);expect(publicReads).toBeGreaterThanOrEqual(4);
  const originalPortfolio=JSON.stringify(records.get('paper-btc'));
  const revision='paper-btc:12345678-1234-1234-1234-123456789abc';
  await run('paper-btc','BTCUSD',1500,revision);
  expect(JSON.stringify(records.get('paper-btc'))).toBe(originalPortfolio);
  expect(records.get(revision)?.state.initialCapital).toBe(1500);
  expect(records.get(revision)?.state.position).toBeNull();
  expect(records.get(revision)?.state.entryOrders).toBe(0);
 }finally{globalThis.fetch=previous;}
});
