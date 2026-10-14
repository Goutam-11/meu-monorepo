import { beforeEach, expect, mock, test } from 'bun:test';
const id='a'.repeat(24), exchangeId='b'.repeat(24), executionId='failed-run', accountKey='delta:fixture',peerId='c'.repeat(24);
const now=new Date(), interval=3600, end=Math.floor(Date.now()/1000/interval)*interval;
const config={id:'donchian',fastPeriod:20,slowPeriod:50,lookback:20,atrPeriod:14,stopAtr:2,rewardRisk:2,timeframe:'1h',simulation:{initialCapital:10,leverage:2,riskPerTradePct:0.5,maxMarginPct:10,feeBps:10,slippageBps:5,fundingRatePct8h:0,maxTradesPerDay:1,maxPositionsOpenedPerDay:1,maxDailyLossPct:1,direction:'both'},contract:{symbol:'XRPUSD',contractSize:1,maintenanceMarginRate:0.005,settlement:'USD'}};
const agent={id,exchangeId,userId:'owner',updatedAt:now,status:'PAUSED',type:'CRYPTO',strategy:'ALGO_TRADING',executionMode:'LIVE',market:{symbols:['XRPUSD']},strategyConfig:config};
type Row=Record<string,unknown>;
let records:Record<string,Row[]>;
let running=0, changed=false, legacyNotice=true, brokerFailure=false, brokerPositions:unknown[]=[], brokerOrders:unknown[]=[];
let cursorConflict=false, partialRelease=false, failAuditCompletion=false, brokerReads=0;
let pauseScan: (()=>Promise<void>) | undefined;
const scopes=[`agent:${id}`,`exchange:${exchangeId}`,`account:${accountKey}`];
function matches(row:Row,q:Row):boolean {
 return Object.entries(q).every(([key,value])=>{
  const actual=row[key];
  if(value && typeof value==='object' && !Array.isArray(value)) {
   const filter=value as Row;
   if('$in' in filter)return (filter.$in as unknown[]).some(item=>JSON.stringify(item)===JSON.stringify(actual));
   if('$ne' in filter)return actual!==filter.$ne;
   if('$exists' in filter)return (actual!==undefined)===filter.$exists;
  }
  return actual===value;
 });
}
mock.module('server-only',()=>({}));
mock.module('../src/lib/logging/app-logger',()=>({appLog:()=>{}}));
mock.module('../src/features/exchange/server/execution-account',()=>({executionConnection:async()=>({exchange:{loadMarkets:async()=>{}}}),registerExecutionAccount:async()=>({accountKey}),linkedExchangeIds:async()=>[exchangeId]}));
mock.module('../../meu/schedulerService/src/brokers/delta/deltaReconciliation',()=>({inspectDeltaOwnership:async()=>{brokerReads++;if(pauseScan)await pauseScan();if(brokerFailure)throw new Error('Sensitive upstream details');return {issues:[],positions:brokerPositions,pending:brokerOrders};}}));
mock.module('../src/features/backtests/server/delta-data',()=>({loadDeltaBacktestData:async()=>({contract:config.contract,dataHash:'public-history-hash',candles:[{timestamp:end-2*interval},{timestamp:end-interval}]})}));
mock.module('../src/features/exchange/server/reconciliation',()=>({readRows:async(command:Row,maximum:number)=>{
 const rows=(records[String(command.find)]??[]).filter(row=>matches(row,command.filter as Row));
 if(rows.length>maximum)throw new Error('Incomplete bounded records');return structuredClone(rows);
}}));
mock.module('../src/lib/db',()=>({default:{
 agent:{findFirst:async()=>changed?null:{id},findMany:async({where}:{where:Row})=>where.status==='RUNNING' ? running ? [{id:peerId}]:[] : [{id,status:'PAUSED',executionMode:'LIVE'},...(running ? [{id:peerId,status:'RUNNING',executionMode:'LIVE'}]:[])],count:async()=>running},
 notification:{findFirst:async()=>legacyNotice?{id:'notice'}:null},
 $runCommandRaw:async(command:Row)=>{
  if(command.insert){const name=String(command.insert);const rows=records[name]??=[];records[name]=rows;const doc=(command.documents as Row[])[0]!;if(rows.some(row=>row._id===doc._id))return {ok:1,n:0,writeErrors:[{code:11000}]};rows.push(structuredClone(doc));return {ok:1,n:1};}
  if(command.update){const name=String(command.update),{q,u}=(command.updates as {q:Row;u:{$set:Row}}[])[0]!;
   if(name==='CryptoStrategyState' && cursorConflict)return {ok:1,n:0};
   if(name==='AgentExecutions' && u.$set.state==='COMPLETED' && failAuditCompletion)throw new Error('Interrupted completion');
   const row=records[name]!.find(row=>matches(row,q));if(!row)return {ok:1,n:0};Object.assign(row,structuredClone(u.$set));return {ok:1,n:1};}
  if(command.delete){let n=0;for(const {q} of command.deletes as {q:Row}[]){const rows=records[String(command.delete)]!,at=rows.findIndex(row=>matches(row,q));if(at>=0){rows.splice(at,1);n++;}if(partialRelease && !String(q._id).startsWith('recovery:')){partialRelease=false;return {ok:1,n};}}return {ok:1,n};}
  throw new Error('Unexpected operation');
 }
}}));
const {recoverDeltaAgent,recoverPaperDataAgent}=await import('../src/features/agents/server/recover-delta-agent');
beforeEach(()=>{
 running=0;changed=brokerFailure=cursorConflict=partialRelease=failAuditCompletion=false;legacyNotice=true;brokerReads=0;brokerPositions=[];brokerOrders=[];pauseScan=undefined;
 records={ExecutionLocks:scopes.map(_id=>({_id,executionId})),AgentExecutions:[{_id:executionId,agentId:id,state:'REVIEW_REQUIRED',reviewReason:'MISSED_LIVE_CANDLES',startedAt:{$date:now.toISOString()},finishedAt:{$date:now.toISOString()}}],CryptoStrategyState:[{_id:id,userId:'owner',lastCandle:end-3*interval}],OrderIntents:[],CryptoPositionOwners:[],ManagedCryptoOrders:[]};
});
const recover=()=>recoverDeltaAgent(agent as never,'owner');
function unchanged(){expect(records.CryptoStrategyState![0]!.lastCandle).toBe(end-3*interval);expect(records.ExecutionLocks).toHaveLength(3);expect(records.AgentExecutions![0]!.state).toBe('REVIEW_REQUIRED');}
test('flat pre-order recovery records skipped signals and releases only its own locks',async()=>{
 records.ExecutionLocks!.push({_id:'exchange:unrelated',executionId:'other'});
 await recover();expect(records.CryptoStrategyState![0]!.lastCandle).toBe(end-interval);
 expect(records.ExecutionLocks).toEqual([{_id:'exchange:unrelated',executionId:'other'}]);
 expect(records.AgentExecutions![0]).toMatchObject({state:'COMPLETED',originalState:'REVIEW_REQUIRED',recovery:{outcome:'SKIPPED_STALE_SIGNALS',skippedCandles:2,fromCandle:end-3*interval}});
 expect(brokerReads).toBe(1);expect(agent.status).toBe('PAUSED');
});
test('legacy failures require a matching missed-candle notification',async()=>{
 delete records.AgentExecutions![0]!.reviewReason;legacyNotice=false;
 await expect(recover()).rejects.toThrow('not a verified missed-candle');unchanged();
 legacyNotice=true;await recover();expect(records.AgentExecutions![0]!.state).toBe('COMPLETED');
});
test('active execution and start-preflight locks cannot be recovered',async()=>{
 records.AgentExecutions![0]!.state='STARTED';await expect(recover()).rejects.toThrow('still active');expect(records.ExecutionLocks).toHaveLength(3);
 records.AgentExecutions![0]!.state='REVIEW_REQUIRED';records.ExecutionLocks![1]!.kind='START_PREFLIGHT';await expect(recover()).rejects.toThrow('not a missed-candle');unchanged();
});
test('any broker operation in the failed run blocks automatic recovery',async()=>{
 for(const state of ['PENDING','CONFIRMED','REFUSED']){records.OrderIntents=[{_id:'operation',executionId,state}];await expect(recover()).rejects.toThrow('attempted a broker operation');unchanged();}
});
test('running peers, position ownership and unfinished submissions block recovery',async()=>{
 running=1;await expect(recover()).rejects.toThrow('Pause live agents');unchanged();running=0;
 records.CryptoPositionOwners=[{accountKey,userId:'owner',state:'REVIEW_REQUIRED'}];await expect(recover()).rejects.toThrow('Position ownership');unchanged();records.CryptoPositionOwners=[];
 records.ManagedCryptoOrders=[{accountKey,userId:'owner',state:'SUBMITTING'}];await expect(recover()).rejects.toThrow('unfinished submission');unchanged();records.ManagedCryptoOrders=[];
 records.AgentExecutions!.push({_id:'another',agentId:id,state:'STARTED'});await expect(recover()).rejects.toThrow('Another execution');unchanged();
});
test('broker positions, open orders and unavailable reads retain cursor and locks',async()=>{
 brokerPositions=[{symbol:'XRP/USD:USD',contracts:1}];await expect(recover()).rejects.toThrow('flat');unchanged();brokerPositions=[];
 brokerOrders=[{brokerOrderId:'open'}];await expect(recover()).rejects.toThrow('no open orders');unchanged();brokerOrders=[];
 brokerFailure=true;await expect(recover()).rejects.toThrow('could not be completed');unchanged();
});
test('saved entries and changed agent versions cannot be discarded',async()=>{
 records.CryptoStrategyState![0]!.entryOrderId='entry';await expect(recover()).rejects.toThrow('recorded entry');unchanged();delete records.CryptoStrategyState![0]!.entryOrderId;
 changed=true;await expect(recover()).rejects.toThrow('settings changed');unchanged();
});
test('cursor CAS failure preserves execution review and locks',async()=>{
 cursorConflict=true;await expect(recover()).rejects.toThrow('could not be completed');unchanged();
});
test('retry after cursor persistence preserves the original skip audit',async()=>{
 failAuditCompletion=true;await expect(recover()).rejects.toThrow('could not be completed');expect(records.ExecutionLocks).toHaveLength(3);expect(records.AgentExecutions![0]!.state).toBe('REVIEW_REQUIRED');
 failAuditCompletion=false;await recover();expect(records.AgentExecutions![0]).toMatchObject({state:'COMPLETED',recovery:{skippedCandles:2,fromCandle:end-3*interval}});
});
test('interrupted release restores account locks before retry',async()=>{
 partialRelease=true;await expect(recover()).rejects.toThrow('could not be completed');expect(records.AgentExecutions![0]!.state).toBe('COMPLETED');expect(records.ExecutionLocks).toHaveLength(2);
 await recover();expect(records.ExecutionLocks).toHaveLength(0);expect(records.AgentExecutions![0]).toMatchObject({recovery:{skippedCandles:2}});
});
test('concurrent resume cannot race the recovery cursor',async()=>{
 let resume!:()=>void, entered!:()=>void;const waiting=new Promise<void>(resolve=>{resume=resolve;});const ready=new Promise<void>(resolve=>{entered=resolve;});
 pauseScan=async()=>{entered();await waiting;};const first=recover();await ready;
 await expect(recover()).rejects.toMatchObject({code:'CONFLICT'});expect(records.CryptoStrategyState![0]!.lastCandle).toBe(end-3*interval);
 resume();await first;expect(records.ExecutionLocks).toHaveLength(0);
});
test('replacement account locks are never deleted',async()=>{
 records.ExecutionLocks![2]!.executionId='replacement';await expect(recover()).rejects.toThrow('changed execution locks');expect(records.ExecutionLocks![2]!.executionId).toBe('replacement');unchanged();
});

test('paper legacy data recovery preserves portfolio and releases only its agent lock',async()=>{
 records.ExecutionLocks=[{_id:scopes[0],executionId}];delete records.AgentExecutions![0]!.reviewReason;
 const paper={...agent,executionMode:'PAPER'};
 await recoverPaperDataAgent(paper as never,'owner');
 expect(records.ExecutionLocks).toHaveLength(0);expect(records.CryptoStrategyState![0]!.lastCandle).toBe(end-3*interval);
 expect(records.AgentExecutions![0]).toMatchObject({state:'COMPLETED',recovery:{outcome:'PAPER_DATA_FETCH_RETRY',portfolioUnchanged:true}});
 expect(brokerReads).toBe(0);
});
test('paper recovery refuses unknown failure, extra locks and any broker operation',async()=>{
 const paper={...agent,executionMode:'PAPER'};records.ExecutionLocks=[{_id:scopes[0],executionId}];delete records.AgentExecutions![0]!.reviewReason;legacyNotice=false;
 await expect(recoverPaperDataAgent(paper as never,'owner')).rejects.toThrow('verified pre-save');expect(records.ExecutionLocks).toHaveLength(1);legacyNotice=true;
 records.ExecutionLocks!.push({_id:scopes[1],executionId});await expect(recoverPaperDataAgent(paper as never,'owner')).rejects.toThrow('unexpected locks');records.ExecutionLocks!.pop();
 records.OrderIntents=[{_id:'order',executionId,state:'PENDING'}];await expect(recoverPaperDataAgent(paper as never,'owner')).rejects.toThrow('broker operations');
});
test('paper recovery can finish an interrupted lock release',async()=>{
 records.ExecutionLocks=[{_id:scopes[0],executionId}];records.AgentExecutions![0]!.state='COMPLETED';records.AgentExecutions![0]!.recovery={outcome:'PAPER_DATA_FETCH_RETRY'};
 await recoverPaperDataAgent({...agent,executionMode:'PAPER'} as never,'owner');expect(records.ExecutionLocks).toHaveLength(0);expect(brokerReads).toBe(0);
});

test('an active agent explicitly waiting behind the same failed account lock does not prevent flat recovery',async()=>{
 running=1;records.Agent=[{_id:{$oid:peerId},userId:'owner',status:'RUNNING',executionWaitingOn:executionId}];
 await recover();expect(records.ExecutionLocks).toHaveLength(0);expect(records.AgentExecutions![0]!.state).toBe('COMPLETED');
});

test('verified pre-order data validation failure after explicit resume can rebase fresh history without weakening ordinary invalid-data review',async()=>{
 const execution=records.AgentExecutions![0]!;execution.reviewReason='DELTA_DATA_INVALID';execution.failure={stage:'execute_strategy',brokerOperationRequested:false};
 legacyNotice=false;
 await expect(recover()).rejects.toThrow('not a verified');unchanged();
 const resumed={...agent,strategyStartedAt:new Date((end-300)*1000)};
 records.CryptoStrategyState![0]!.activeAfter=end-5*interval;
 await recoverDeltaAgent(resumed as never,'owner');
 expect(records.AgentExecutions![0]).toMatchObject({state:'COMPLETED',reviewReason:'DELTA_DATA_INVALID',recovery:{outcome:'SKIPPED_STALE_SIGNALS'}});
 expect(records.ExecutionLocks).toHaveLength(0);expect(brokerReads).toBe(1);
});

test('legacy pre-order guard rejections recover only with typed stage evidence and zero broker intents',async()=>{
 const execution=records.AgentExecutions![0]!;
 execution.reviewReason='EXECUTION_GUARD_REJECTED';legacyNotice=false;
 execution.failure={stage:'execute_strategy',errorType:'OrderRejectedError',brokerOperationRequested:true};
 await expect(recover()).rejects.toThrow('not a verified');unchanged();
 execution.failure={stage:'execute_strategy',errorType:'OrderRejectedError',brokerOperationRequested:false};
 records.OrderIntents=[{_id:'intent',executionId,state:'CONFIRMED'}];
 await expect(recover()).rejects.toThrow('attempted a broker operation');unchanged();
 records.OrderIntents=[];
 await recover();expect(records.ExecutionLocks).toHaveLength(0);
 expect(execution).toMatchObject({state:'COMPLETED',reviewReason:'EXECUTION_GUARD_REJECTED'});
});
