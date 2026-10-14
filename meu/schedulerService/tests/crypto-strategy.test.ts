import {test,expect} from 'bun:test';
import ccxt, {type MarketInterface,type Order,type Position} from 'ccxt';
import type {Db} from 'mongodb';
import {runLiveCryptoStrategy,runPaperStrategy} from '../src/algorithms/crypto/runCryptoStrategy';
import type {ExecutionSafety} from '../src/execution/tradeGuard';
import {createHash} from 'node:crypto';
const interval=3600,end=Math.floor(Date.now()/1000/interval)*interval;
const config={id:'ema' as const,fastPeriod:2,slowPeriod:3,lookback:3,atrPeriod:2,stopAtr:2,rewardRisk:1.5,timeframe:'1h' as const,simulation:{initialCapital:10000,leverage:2,riskPerTradePct:5,maxMarginPct:25,feeBps:5,slippageBps:2,fundingRatePct8h:0,maxTradesPerDay:10,maxPositionsOpenedPerDay:5,maxDailyLossPct:10,direction:'both' as const},contract:{symbol:'BTCUSD',contractSize:0.001,minContracts:1,maintenanceMarginRate:0.0025,settlement:'USD' as const}};
const bar=(timestamp:number,close=100)=>({timestamp,open:close,close,high:close+1,low:close-1,volume:10,closed:true});
function fixture(freshClose=110){
 const records=new Map<string,Record<string,unknown>>();const sent:unknown[][]=[];const reservations:unknown[]=[];
 const state:Record<string,unknown> & {lastCandle:number;history:ReturnType<typeof bar>[] }={_id:'strategy-agent',userId:'owner',lastCandle:end-2*interval,history:[bar(end-5*interval),bar(end-4*interval),bar(end-3*interval),bar(end-2*interval)]};
 records.set('CryptoStrategyState',state);
 const db={collection:(name:string)=>({findOne:async()=>records.get(name)??null,insertOne:async(doc:Record<string,unknown>)=>{records.set(name,doc);return {insertedId:doc._id};},replaceOne:async(_filter:unknown,doc:Record<string,unknown>)=>{records.set(name,doc);return{modifiedCount:1};}})} as unknown as Db;
 const ex=new ccxt.delta();const symbol='BTC/USD:USD';
 const market={id:'BTCUSD',symbol,base:'BTC',quote:'USD',settle:'USD',type:'swap',contract:true,swap:true,linear:true,inverse:false,active:true,contractSize:0.001,taker:0.0005,precision:{amount:1,price:0.5},limits:{amount:{min:1,max:10000},cost:{min:0}},info:{settling_asset:{id:14},taker_commission_rate:'0.0005',maintenance_margin:'0.25',initial_margin:'0.5',max_leverage_notional:'100000',initial_margin_scaling_factor:'0.0000025',maintenance_margin_scaling_factor:'0.00000125'}} as unknown as MarketInterface;
 ex.setMarkets([market]);
 const positions:Position[]=[];let existing:Order|undefined;
 ex.fetchPositions=async()=>positions;ex.fetchLeverage=async()=>({info:{},symbol,marginMode:'isolated',longLeverage:2,shortLeverage:2});
 ex.fetchBalance=async()=>({free:{USD:10000}}) as never;
 ex.fetchTicker=async()=>({symbol,bid:110,ask:110,last:110}) as never;
 ex.request=async(path:string)=>path==='orders'?{success:true,result:[],meta:{after:null}}:path==='wallet/transactions'?{success:true,result:[],meta:{after:null}}:{success:true,result:{default_auto_topup:false,deto_for_commission:false}};
 ex.createOrder=async(...args)=>{sent.push(args);return {id:'entry',symbol,clientOrderId:(args[5] as Record<string,unknown>|undefined)?.clientOrderId,info:args[5]} as Order;};
 ex.fetchOrder=async()=>{if(!existing)throw new Error('missing');return existing;};
 const safety:ExecutionSafety={agentId:'strategy-agent',policy:{symbols:['BTCUSD'],capital:{allocated:10000,currency:'USD'},futures:{leverage:2,maxMarginPct:25,maxNotional:20000,maintenanceMarginRate:0.0025,feeBps:5,slippageBps:2},risk:{maxRiskPerTradePct:5,maxDailyLossPct:10,maxOpenPositions:1,maxTradesPerDay:10,maxPositionsOpenedPerDay:5}},assertActive:async()=>{},reserveDailyEntry:async(...args)=>{reservations.push(args);},executeOrder:async(_intent,fn)=>fn()};
 const original=globalThis.fetch;
 globalThis.fetch=(async(url:URL|string)=>{const u=new URL(String(url));let result:unknown;if(u.pathname.includes('products'))result={symbol:'BTCUSD',contract_type:'perpetual_futures',notional_type:'vanilla',is_quanto:false,contract_value:'0.001',maintenance_margin:'0.25',initial_margin:'0.5',max_leverage_notional:'100000',initial_margin_scaling_factor:'0.0000025',maintenance_margin_scaling_factor:'0.00000125',settling_asset:{symbol:'USD'}};else{const from=Number(u.searchParams.get('start')),to=Number(u.searchParams.get('end'));const bars=[];for(let timestamp=from;timestamp<=to;timestamp+=interval){const b=bar(timestamp,timestamp===end-interval?freshClose:100);bars.push({time:timestamp,...b});}result=bars;}return new Response(JSON.stringify({success:true,result}));}) as typeof fetch;
 return {db,ex,state,records,sent,positions,reservations,safety,restore:()=>{globalThis.fetch=original;},setOrder:(order:Order)=>{existing=order;}};
}
test('live strategy routes fresh crossover through isolated guarded entry and does not replay',async()=>{
 const f=fixture();try{
 const args={db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config,safety:f.safety,exchange:f.ex};
 await runLiveCryptoStrategy(args);expect(f.sent).toHaveLength(1);expect(f.reservations).toHaveLength(1);const params=f.sent[0]![5] as Record<string,unknown>;expect(params.bracket_stop_loss_price).toBeDefined();expect(params.post_only).toBe(true);expect(f.records.get('CryptoStrategyState')!.entryOrderId).toBe('entry');
 await runLiveCryptoStrategy(args);expect(f.sent).toHaveLength(1);
 }finally{f.restore();}
});
test('unowned account position and partial fills stop before broker mutation',async()=>{
 const f=fixture();try{
 f.positions.push({symbol:'BTC/USD:USD',contracts:1,side:'long',info:{size:1}} as Position);
 const args={db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config,safety:f.safety,exchange:f.ex};
 await expect(runLiveCryptoStrategy(args)).rejects.toThrow('Unowned');expect(f.sent).toHaveLength(0);
 f.positions.length=0;f.state.entryOrderId='entry';
 f.setOrder({id:'entry',clientOrderId:`m${createHash('sha256').update('strategy-agent').digest('hex').slice(0,12)}-abc`,filled:1,remaining:1} as Order);
 await expect(runLiveCryptoStrategy(args)).rejects.toThrow('Partially filled');expect(f.sent).toHaveLength(0);
 }finally{f.restore();}
});
test('paper initialization uses only public data and never calls a broker',async()=>{
 const f=fixture();try{
 const response=await runPaperStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config,safety:f.safety});
 expect(response).toContain('PAPER: 0 new');expect(f.sent).toHaveLength(0);expect(f.reservations).toHaveLength(0);expect(f.records.get('PaperTradingState')).toBeDefined();
 }finally{f.restore();}
});
test('opposite signal closes only the tracked position with reduceOnly and no same-run flip',async()=>{
 const f=fixture(90);try{
 f.state.history=[bar(end-5*interval),bar(end-4*interval),bar(end-3*interval,110),bar(end-2*interval,110)];
 // Current close is lower than the previous uptrend, forcing a bearish crossover.
 f.state.history.at(-1)!.close=130;f.state.history.at(-1)!.open=130;f.state.history.at(-1)!.high=131;f.state.history.at(-1)!.low=129;
 f.state.entryOrderId='tracked';f.state.side='long';
 f.setOrder({id:'tracked',clientOrderId:`m${createHash('sha256').update('strategy-agent').digest('hex').slice(0,12)}-abc`,filled:1,remaining:0} as Order);
 f.positions.push({symbol:'BTC/USD:USD',contracts:1,side:'long',info:{size:1}} as Position);
 // The bearish signal reduces the owned long, with no short entry in this run.
 await runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config,safety:f.safety,exchange:f.ex});
 expect(f.sent).toHaveLength(1);expect(f.sent[0]![2]).toBe("sell");expect((f.sent[0]![5] as Record<string,unknown>).reduceOnly).toBe(true);
 }finally{f.restore();}
});

test('live entry binds the margin sizing quote even when the next ticker doubles', async () => {
 const f=fixture();try {
 f.safety.policy.futures!.maxMarginPct=1;
 let reads=0;
 f.ex.fetchTicker=async()=>{const price=++reads===1?110:220;return {symbol:'BTC/USD:USD',bid:price,ask:price,last:price} as never;};
 await runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config:{...config,simulation:{...config.simulation,maxMarginPct:1}},safety:f.safety,exchange:f.ex});
 expect(f.sent).toHaveLength(1);
 const amount=Number(f.sent[0]![3]),price=Number(f.sent[0]![4]);
 expect(price).toBe(110);
 expect(amount*price*config.contract.contractSize/config.simulation.leverage).toBeLessThanOrEqual(100);
 }finally{f.restore();}
});

test('missed live candles raise a typed recovery reason before any broker write or cursor advance',async()=>{
 const f=fixture();try {
 f.state.lastCandle=end-3*interval;f.state.history.pop();
 await expect(runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config,safety:f.safety,exchange:f.ex})).rejects.toMatchObject({code:'MISSED_LIVE_CANDLES'});
 expect(f.sent).toHaveLength(0);expect(f.reservations).toHaveLength(0);expect(f.state.lastCandle).toBe(end-3*interval);
 }finally{f.restore();}
});

test('deliberate resume rebuilds bounded history, skips old crossover signals and processes the cursor only once',async()=>{
 const f=fixture();try{
 f.state.lastCandle=end-10*interval;
 const activeAfter=end-300;
 const args={db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config,safety:f.safety,exchange:f.ex,activeAfter};
 expect(await runLiveCryptoStrategy(args)).toContain('resumed');
 const saved=f.records.get('CryptoStrategyState')!;
 expect(saved.lastCandle).toBe(end-interval);expect(saved.activeAfter).toBe(activeAfter);
 expect((saved.history as unknown[]).length).toBe(Math.max(config.slowPeriod,config.lookback,config.atrPeriod,15)*5+2);
 expect(f.sent).toHaveLength(0);expect(f.reservations).toHaveLength(0);
 expect(await runLiveCryptoStrategy(args)).toContain('waiting');expect(f.sent).toHaveLength(0);
 }finally{f.restore();}
});

test('an unchanged activation marker does not hide a missed-candle outage',async()=>{
 const f=fixture();try{
 f.state.lastCandle=end-10*interval;f.state.activeAfter=end-20*interval;
 await expect(runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config,safety:f.safety,exchange:f.ex,activeAfter:end-20*interval})).rejects.toMatchObject({code:'MISSED_LIVE_CANDLES'});
 expect(f.sent).toHaveLength(0);expect(f.records.get('CryptoStrategyState')!.lastCandle).toBe(end-10*interval);
 }finally{f.restore();}
});

test('resume keeps an owned filled position but rejects foreign positions and partial entries before cursor replacement',async()=>{
 for(const scenario of ['owned','foreign','partial']){
  const f=fixture();try{
   f.state.lastCandle=end-10*interval;
   if(scenario!=='foreign'){
    f.state.entryOrderId='tracked';f.state.side='long';
    f.setOrder({id:'tracked',clientOrderId:`m${createHash('sha256').update('strategy-agent').digest('hex').slice(0,12)}-abc`,filled:1,remaining:scenario==='partial'?1:0} as Order);
   }
   f.positions.push({symbol:'BTC/USD:USD',contracts:1,side:'long',info:{size:1}} as Position);
   const operation=runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config,safety:f.safety,exchange:f.ex,activeAfter:end-300});
   if(scenario==='owned'){
    expect(await operation).toContain('resumed');expect(f.records.get('CryptoStrategyState')!.entryOrderId).toBe('tracked');
    expect(f.records.get('CryptoStrategyState')!.side).toBe('long');
   }else{await expect(operation).rejects.toThrow(scenario==='foreign'?'Unowned':'Partially filled');expect(f.records.get('CryptoStrategyState')!.lastCandle).toBe(end-10*interval);}
   expect(f.sent).toHaveLength(0);expect(f.reservations).toHaveLength(0);
  }finally{f.restore();}
 }
});

test('a sizing budget below one contract skips the signal, advances the cursor and reports the actual guard reason',async()=>{
 const f=fixture();try{
  f.safety.policy.capital.allocated=0.001;
  f.safety.policy.futures!.maxNotional=0.002;
  const output=await runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config,safety:f.safety,exchange:f.ex});
  expect(output).toContain('entry skipped:');expect(output).toMatch(/contract|bound/);
  expect(output).not.toContain('preview is unavailable');expect(f.sent).toHaveLength(0);expect(f.reservations).toHaveLength(0);
  expect(f.records.get('CryptoStrategyState')!.lastCandle).toBe(end-interval);
 }finally{f.restore();}
});


test('automatic algorithm leverage is verified before the guarded order, with durable setting intent',async()=>{
 const f=fixture();try{
  const auto={...config,simulation:{...config.simulation,leverageMode:'AUTO' as const}};
  let actual=2;const intents:Record<string,unknown>[]=[];const events:string[]=[];
  f.ex.fetchLeverage=async()=>({info:{},symbol:'BTC/USD:USD',marginMode:'isolated',longLeverage:actual,shortLeverage:actual});
  f.ex.fetchMarginMode=async()=>({info:{},symbol:'BTC/USD:USD',marginMode:'isolated'});
  f.ex.setLeverage=async(value)=>{events.push('set-leverage');actual=value;return {success:true} as never;};
  const create=f.ex.createOrder.bind(f.ex);f.ex.createOrder=async(...args)=>{events.push('entry');return create(...args);};
  f.safety.executeOrder=async(intent,fn)=>{intents.push(intent);return fn();};
  const response=await runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config:auto,safety:f.safety,exchange:f.ex});
  expect(events).toEqual(['set-leverage','entry']);expect(actual).toBe(1);expect(response).toContain('automatic leverage 1×');
  expect(intents[0]).toMatchObject({action:'delta-leverage',leverage:1,leverageCeiling:2});expect(f.sent).toHaveLength(1);
 }finally{f.restore();}
});

test('uncertain leverage update never submits an algorithm entry or advances the candle cursor',async()=>{
 const f=fixture();try{
  const before=f.state.lastCandle;const auto={...config,simulation:{...config.simulation,leverageMode:'AUTO' as const}};
  f.ex.fetchMarginMode=async()=>({info:{},symbol:'BTC/USD:USD',marginMode:'isolated'});
  f.ex.setLeverage=async()=>{throw new Error('response lost after update');};
  await expect(runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config:auto,safety:f.safety,exchange:f.ex})).rejects.toThrow('could not verify the automatic leverage update');
  expect(f.sent).toHaveLength(0);expect(f.records.get('CryptoStrategyState')!.lastCandle).toBe(before);expect(f.reservations).toHaveLength(0);
 }finally{f.restore();}
});


test('automatic sizing quote timeout skips entry and reports the reason without changing leverage',async()=>{
 const f=fixture();try{
  f.ex.fetchTicker=async()=>{throw new ccxt.RequestTimeout('unavailable');};
  let settingsWrites=0;f.ex.setLeverage=async()=>{settingsWrites++;return {success:true} as never;};
  const output=await runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config:{...config,simulation:{...config.simulation,leverageMode:'AUTO'}},safety:f.safety,exchange:f.ex});
  expect(output).toContain('entry skipped: Automatic leverage sizing could not verify');expect(settingsWrites).toBe(0);expect(f.sent).toHaveLength(0);
  expect(f.records.get('CryptoStrategyState')!.lastCandle).toBe(end-interval);
 }finally{f.restore();}
});

test('confirmation setup waits without requesting an entry on its signal candle',async()=>{
 const f=fixture();try{
 const response=await runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config:{...config,entryTiming:{mode:'confirm',confirmationBars:1,maxWaitBars:3,cooldownBars:2}},safety:f.safety,exchange:f.ex});
 expect(f.sent).toHaveLength(0);expect(response).toContain('waiting for confirmation');
 expect(f.records.get('CryptoStrategyState')!.lastCandle).toBe(end-interval);
 }finally{f.restore();}
});

test('a broker-observed protected exit starts durable cooldown before a new crossover',async()=>{
 const f=fixture();try{
 f.state.entryOrderId='tracked';f.state.side='long';f.state.positionObserved=true;
 f.setOrder({id:'tracked',clientOrderId:`m${createHash('sha256').update('strategy-agent').digest('hex').slice(0,12)}-abc`,filled:1,remaining:0} as Order);
 const response=await runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config:{...config,entryTiming:{mode:'immediate',confirmationBars:1,maxWaitBars:3,cooldownBars:2}},safety:f.safety,exchange:f.ex});
 expect(f.sent).toHaveLength(0);expect(response).toContain('cooldown active');
 expect(f.records.get('CryptoStrategyState')!.lastExitCandle).toBe(end-interval);
 expect(f.records.get('CryptoStrategyState')!.entryOrderId).toBeUndefined();
 }finally{f.restore();}
});

test('persisted live cooldown survives restart and expires after the configured closed candles',async()=>{
 for(const elapsed of [1,3]){
  const f=fixture();try{
   // Simulate a process loading only durable state after a prior confirmed exit.
   f.state.lastExitCandle=end-interval-elapsed*interval;
   const response=await runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config:{...config,entryTiming:{mode:'immediate',confirmationBars:1,maxWaitBars:3,cooldownBars:2}},safety:f.safety,exchange:f.ex});
   expect(f.sent.length).toBe(elapsed===1?0:1);
   expect(response.includes('cooldown active')).toBe(elapsed===1);
  }finally{f.restore();}
 }
});

test('improved live rules persist consumed setup identity only after guarded submission',async()=>{
 const f=fixture(102);try{
  f.ex.fetchTicker=async()=>({symbol:'BTC/USD:USD',bid:102,ask:102,last:102}) as never;
  await runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config:{...config,executionRules:{version:1}},safety:f.safety,exchange:f.ex});
  expect(f.sent).toHaveLength(1);
  expect(f.records.get('CryptoStrategyState')!.usedEntryProposalIds).toEqual([`ema:long:${end-interval}`]);
 }finally{f.restore();}
});

test('improved live rules reject a fresh quote through the setup boundary before any order',async()=>{
 const f=fixture(102);try{
  f.ex.fetchTicker=async()=>({symbol:'BTC/USD:USD',bid:99,ask:99,last:99}) as never;
  const output=await runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config:{...config,executionRules:{version:1}},safety:f.safety,exchange:f.ex});
  expect(output).toContain('Fresh quote invalidated');expect(f.sent).toHaveLength(0);expect(f.reservations).toHaveLength(0);
  expect(f.records.get('CryptoStrategyState')!.usedEntryProposalIds).toBeUndefined();
 }finally{f.restore();}
});

test('improved live rules never resubmit an already consumed setup after a restart',async()=>{
 const f=fixture(102);try{
  f.state.usedEntryProposalIds=[`ema:long:${end-interval}`];
  const output=await runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config:{...config,executionRules:{version:1}},safety:f.safety,exchange:f.ex});
  expect(output).toContain('already submitted');expect(f.sent).toHaveLength(0);expect(f.reservations).toHaveLength(0);
 }finally{f.restore();}
});

test('v2 crossover entry uses the same extension bound in guarded live execution',async()=>{
 for(const quote of [102,110]){
  const f=fixture(102);try{
   f.state.history=Array.from({length:20},(_,i)=>bar(end-(21-i)*interval));
   f.ex.fetchTicker=async()=>({symbol:'BTC/USD:USD',bid:quote,ask:quote,last:quote}) as never;
   const output=await runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config:{...config,executionRules:{version:2,emaEntry:'crossover'}},safety:f.safety,exchange:f.ex});
   expect(f.sent).toHaveLength(quote===102?1:0);
   if(quote===110){expect(output).toContain('extension bound');expect(f.reservations).toHaveLength(0);}
  }finally{f.restore();}
 }
});

test('adaptive exit research cannot silently run as fixed protection on a live account',async()=>{
 const f=fixture();try{
  await expect(runLiveCryptoStrategy({db:f.db,agentId:'strategy-agent',userId:'owner',symbol:'BTCUSD',config:{...config,simulation:{...config.simulation,exitPolicy:{version:1,mode:'atr-trailing',activationR:1,atrMultiple:2}}},safety:f.safety,exchange:f.ex})).rejects.toThrow('not enabled for live');
  expect(f.sent).toHaveLength(0);expect(f.reservations).toHaveLength(0);
 }finally{f.restore();}
});
