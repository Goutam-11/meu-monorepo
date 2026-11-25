import {beforeEach,expect,mock,test} from 'bun:test';
import { COLLECTIONS } from "../../shared/persistence/collections";
type Row=Record<string,any>;
const agent={id:'a'.repeat(24),exchangeId:'b'.repeat(24),userId:'owner',status:'PAUSED',type:'CRYPTO',strategy:'LLM_TRADING',executionMode:null,updatedAt:new Date(0),name:'LLM',capital:{allocated:20,currency:'USD'}};
const executionId='failed-run',accountKey='delta:test';
const scopes=[`agent:${agent.id}`,`account:${accountKey}`,`exchange:${agent.exchangeId}`];
let rows:Record<string,Row[]>,running=0,active=false,changed=false,unknown=false,partialDelete=false,failAudit=false,snapshotChanged=false,raceCoordinator=false;
let queueEvidence:Row|null=null;
let positions:Row[]=[],pending:Row[]=[],writes=0,scans=0,verifiedLeverage=1,leverageReads=0;
function matches(row:Row,filter:Row):boolean{return Object.entries(filter).every(([key,v])=>{
 if(v&&typeof v==='object'&&!Array.isArray(v)){
  if('$in' in v)return v.$in.includes(row[key]);if('$ne' in v)return row[key]!==v.$ne;if('$exists' in v)return (row[key]!==undefined)===v.$exists;
 }
 return JSON.stringify(row[key])===JSON.stringify(v);
});}
mock.module('server-only',()=>({}));
mock.module('@/lib/logging/app-logger',()=>({appLog:()=>{}}));
mock.module('../../meu/schedulerService/src/lib/redis',()=>({redis:{exists:async()=>active?1:0,lpos:async()=>active?0:null,zscore:async()=>queueEvidence?"1":null,hget:async()=>queueEvidence?JSON.stringify({agentId:agent.id,userId:"owner",recoveryFailure:queueEvidence}):null}}));
mock.module('../src/features/exchange/server/execution-account',()=>({executionConnection:async()=>({exchange:{id:'delta',loadMarkets:async()=>{},market:()=>({symbol:'BTCUSD',active:true,contract:true,swap:true,linear:true,quote:'USD',settle:'USD',contractSize:0.001}),fetchMarginMode:async()=>({marginMode:'isolated'}),fetchLeverage:async()=>{leverageReads++;return {marginMode:'isolated',longLeverage:verifiedLeverage,shortLeverage:verifiedLeverage};}},connection:{name:'DELTA',sandbox:false}}),registerExecutionAccount:async()=>({accountKey}),linkedExchangeIds:async()=>[agent.exchangeId]}));
mock.module('../src/features/exchange/server/reconciliation',()=>({readRows:async(command:Row,max:number)=>{const result=(rows[command.find]??[]).filter(r=>matches(r,command.filter??{}));if(result.length>max)throw Error('too many');return structuredClone(result);}}));
mock.module('../../meu/schedulerService/src/brokers/delta/deltaReconciliation',()=>({inspectDeltaOwnership:async(_ex:unknown,_owners:unknown,managed:Row[])=>{
 scans++;
 return {issues:[],positions:snapshotChanged&&scans>1?[{symbol:'BTCUSD'}]:positions,pending,orders:managed.filter(o=>o.state!=='REFUSED').map(o=>({agentId:o.agentId,symbol:o.symbol,clientOrderId:o.clientOrderId,savedState:o.state,verification:unknown?'UNKNOWN':o.state==='SUBMITTING'?'FOUND_UNRECORDED':'VERIFIED',brokerOrderId:'broker',brokerStatus:'canceled',filled:1,remaining:1}))};
}}));
mock.module('@/lib/db',()=>({default:{
 agent:{findFirst:async()=>changed?null:agent,findMany:async()=>[{...agent,...(running?{status:'RUNNING'}:{})}],count:async()=>running},
 $runCommandRaw:async(c:Row)=>{
  if(c.insert){const r=rows[c.insert]??=[];rows[c.insert]=r;const d=c.documents[0];if(raceCoordinator&&d._id.startsWith('recovery:')){r.push({...d,executionId:'concurrent-recovery'});raceCoordinator=false;}if(r.some(x=>x._id===d._id))return {ok:1,n:0};r.push(structuredClone(d));return {ok:1,n:1};}
  if(c.update){const {q,u}=c.updates[0];if(c.update===COLLECTIONS.AgentExecutions&&u.$set?.state==='COMPLETED'&&failAudit){failAudit=false;throw Error('Interrupted completion');}const r=(rows[c.update]??[]).find(x=>matches(x,q));if(!r)return {ok:1,n:0};Object.assign(r,structuredClone(u.$set??{}));for(const k of Object.keys(u.$unset??{}))delete r[k];writes++;return {ok:1,n:1};}
  if(c.delete){let n=0;for(const {q} of c.deletes){const r=rows[c.delete]??[],i=r.findIndex(x=>matches(x,q));if(i>=0){r.splice(i,1);n++;}if(partialDelete&&!q._id.startsWith('recovery:')){partialDelete=false;return {ok:1,n};}}return {ok:1,n};}
  throw Error('unexpected write');
 }
}}));
const {recoverDeltaExecution}=await import('../src/features/exchange/server/recover-execution');
beforeEach(()=>{
 queueEvidence=null;running=0;active=changed=unknown=partialDelete=failAudit=snapshotChanged=raceCoordinator=false;positions=[];pending=[];writes=scans=0;verifiedLeverage=1;leverageReads=0;
 rows={ExecutionLocks:scopes.map(_id=>({_id,executionId})),AgentExecutions:[{_id:executionId,agentId:agent.id,state:'REVIEW_REQUIRED',finishedAt:{$date:new Date().toISOString()}}],CryptoPositionOwners:[],ManagedCryptoOrders:[],OrderIntents:[]};
});
const recover=()=>recoverDeltaExecution(agent as never,'owner');
function uncertain(){
 rows.ManagedCryptoOrders=[{_id:'managed',accountKey,userId:'owner',agentId:agent.id,symbol:'BTCUSD',clientOrderId:'client',state:'SUBMITTING',side:'buy',amount:2}];
 rows.CryptoPositionOwners=[{_id:'owned',accountKey,userId:'owner',agentId:agent.id,symbol:'BTCUSD',state:'REVIEW_REQUIRED',orderRefs:['managed'],periodId:'period'}];
 rows.CryptoOwnershipPeriods=[{_id:'period',accountKey,agentId:agent.id}];
 rows.OrderIntents=[{_id:'intent',executionId,state:'PENDING',intent:{clientOrderId:'client',action:'crypto-entry'}}];
}
test('LLM pre-order failure releases only its own scopes and leaves agent paused',async()=>{
 rows.ExecutionLocks.push({_id:'exchange:unrelated',executionId:'other'});
 expect(await recover()).toContain('remains paused');expect(rows.ExecutionLocks).toEqual([{_id:'exchange:unrelated',executionId:'other'}]);
 expect(rows.AgentExecutions[0]).toMatchObject({state:'COMPLETED',recovery:{outcome:'BROKER_RECONCILED_FLAT'}});expect(scans).toBe(2);
});
test('uncertain terminal partial fill repairs submission, intent and flat ownership without broker writes',async()=>{
 uncertain();await recover();expect(rows.ManagedCryptoOrders[0]).toMatchObject({state:'ACCEPTED',brokerOrderId:'broker',filled:1,remaining:1,brokerStatus:'canceled'});
 expect(rows.OrderIntents[0]).toMatchObject({state:'RECONCILED',originalState:'PENDING'});expect(rows.CryptoPositionOwners[0]).toMatchObject({state:'FLAT',contracts:0});expect(rows.CryptoOwnershipPeriods[0].endedAt).toBeDefined();expect(rows.ExecutionLocks).toHaveLength(0);
});
test('unknown order, open position, pending order and changed snapshot retain locks with specific reasons',async()=>{
 uncertain();unknown=true;await expect(recover()).rejects.toThrow('client order client');expect(writes).toBe(0);
 unknown=false;positions=[{symbol:'BTCUSD'}];await expect(recover()).rejects.toThrow('open position');expect(writes).toBe(0);
 positions=[];pending=[{symbol:'BTCUSD',brokerOrderId:'pending'}];await expect(recover()).rejects.toThrow('pending orders');expect(writes).toBe(0);
 pending=[];snapshotChanged=true;scans=0;await expect(recover()).rejects.toThrow('changed during recovery');expect(writes).toBe(0);expect(rows.ExecutionLocks).toHaveLength(3);
});
test('active queue job, running peer and changed agent cannot recover',async()=>{
 active=true;await expect(recover()).rejects.toThrow('still active');active=false;running=1;await expect(recover()).rejects.toThrow('Pause all live');running=0;changed=true;await expect(recover()).rejects.toThrow('settings changed');expect(writes).toBe(0);
});
test('missing managed identity never turns an uncertain operation into a refusal',async()=>{
 rows.OrderIntents=[{_id:'uncertain',executionId,state:'PENDING',intent:{clientOrderId:'missing',action:'crypto-entry'}}];
 await expect(recover()).rejects.toThrow('no verifiable managed order identity');expect(rows.OrderIntents[0].state).toBe('PENDING');expect(writes).toBe(0);
});
test('foreign locks and foreign ownership are never repaired',async()=>{
 rows.ExecutionLocks[1].executionId='other';await expect(recover()).rejects.toThrow('Another operation');expect(rows.ExecutionLocks[1].executionId).toBe('other');
 rows.ExecutionLocks[1].executionId=executionId;rows.CryptoPositionOwners=[{accountKey,userId:'owner',agentId:'peer',state:'OPEN'}];await expect(recover()).rejects.toThrow('Another agent still reserves');expect(writes).toBe(0);
});
test('interrupted audit completion and partial lock release can safely be retried',async()=>{
 uncertain();failAudit=true;await expect(recover()).rejects.toThrow('could not finish');expect(rows.ExecutionLocks).toHaveLength(3);expect(rows.AgentExecutions[0].state).toBe('REVIEW_REQUIRED');
 partialDelete=true;await expect(recover()).rejects.toThrow('could not finish');expect(rows.AgentExecutions[0].state).toBe('COMPLETED');expect(rows.ExecutionLocks).toHaveLength(2);
 await recover();expect(rows.ExecutionLocks).toHaveLength(0);expect(rows.OrderIntents[0].state).toBe('RECONCILED');
});
test('foreign user and active execution are rejected',async()=>{
 await expect(recoverDeltaExecution(agent as never,'other')).rejects.toThrow('Pause');rows.AgentExecutions[0].state='STARTED';await expect(recover()).rejects.toThrow('database still shows STARTED');expect(writes).toBe(0);
});

test('cancel and reduction operations resolve only against their exact managed identities',async()=>{
 for(const action of ['cancel','crypto-reduction']) {
  uncertain();rows.ManagedCryptoOrders[0].state='ACCEPTED';rows.ManagedCryptoOrders[0].brokerOrderId='broker';
  rows.OrderIntents[0].intent=action==='cancel'?{action,order_id:'broker'}:{action,clientOrderId:'client'};
  await recover();expect(rows.OrderIntents[0].state).toBe('RECONCILED');
  rows.ExecutionLocks=scopes.map(_id=>({_id,executionId}));rows.AgentExecutions[0]={_id:executionId,agentId:agent.id,state:'REVIEW_REQUIRED',finishedAt:{$date:new Date().toISOString()}};
 }
});
test('closed ownership periods and existing risk counters survive recovery and retries',async()=>{
 uncertain();const endedAt={$date:'2026-01-01T00:00:00.000Z'};rows.CryptoOwnershipPeriods[0].endedAt=endedAt;
 rows.DailyRiskUsage=[{trades:7,positionsOpened:3}];
 await recover();expect(rows.CryptoOwnershipPeriods[0].endedAt).toEqual(endedAt);expect(rows.DailyRiskUsage).toEqual([{trades:7,positionsOpened:3}]);
});
test('a foreign uncertain submission blocks even when no foreign owner is recorded',async()=>{
 rows.ManagedCryptoOrders=[{_id:'foreign',accountKey,userId:'owner',agentId:'peer',state:'SUBMITTING'}];
 await expect(recover()).rejects.toThrow('Another agent has an uncertain order');expect(writes).toBe(0);
});
test('existing recovery coordinator gives an actionable reason and is never removed by another request',async()=>{
 const coordinator={_id:`recovery:${agent.id}`,executionId:'existing-recovery',kind:'BROKER_RECONCILIATION'};
 rows.ExecutionLocks.push(coordinator);
 await expect(recover()).rejects.toThrow('Recovery is already in progress');
 expect(rows.ExecutionLocks).toContainEqual(coordinator);expect(rows.ExecutionLocks).toHaveLength(4);
 expect(writes).toBe(0);expect(scans).toBe(0);
});
test('a concurrent coordinator winning the unique insert remains held with an actionable error',async()=>{
 raceCoordinator=true;
 await expect(recover()).rejects.toThrow('Recovery is already in progress');
 expect(rows.ExecutionLocks.find(l=>l._id===`recovery:${agent.id}`)?.executionId).toBe('concurrent-recovery');
 expect(rows.ExecutionLocks).toHaveLength(4);expect(writes).toBe(0);expect(scans).toBe(0);
});


const automaticAgent={...agent,strategy:'ALGO_TRADING',market:{symbols:['BTCUSD']},strategyConfig:{id:'ema',fastPeriod:2,slowPeriod:3,lookback:3,atrPeriod:2,stopAtr:2,rewardRisk:2,timeframe:'1h',contract:{settlement:'USD'},simulation:{initialCapital:20,leverage:2,leverageMode:'AUTO',riskPerTradePct:1,maxMarginPct:100,maxDailyLossPct:5,feeBps:10,slippageBps:5,fundingRatePct8h:0,maxTradesPerDay:2,maxPositionsOpenedPerDay:1,direction:'both'}}};
test('uncertain automatic leverage intent is reconciled from two setting readbacks without an order identity',async()=>{
 rows.OrderIntents=[{_id:'setting',executionId,state:'PENDING',intent:{action:'delta-leverage',symbol:'BTCUSD',leverage:1,leverageCeiling:2}}];
 await recoverDeltaExecution(automaticAgent as never,'owner');
 expect(rows.OrderIntents[0]).toMatchObject({state:'RECONCILED',recovery:{action:'delta-leverage',verifiedLeverage:1}});
 expect(leverageReads).toBe(2);expect(rows.ExecutionLocks).toHaveLength(0);expect(rows.ManagedCryptoOrders).toHaveLength(0);
});
test('unverified leverage setting and a ceiling mismatch preserve the execution lock',async()=>{
 rows.OrderIntents=[{_id:'setting',executionId,state:'PENDING',intent:{action:'delta-leverage',symbol:'BTCUSD',leverage:1,leverageCeiling:2}}];
 verifiedLeverage=2;await expect(recoverDeltaExecution(automaticAgent as never,'owner')).rejects.toThrow('must show isolated margin and 1×');
 expect(rows.ExecutionLocks).toHaveLength(3);expect(rows.OrderIntents[0].state).toBe('PENDING');
 verifiedLeverage=1;rows.OrderIntents[0].intent.leverageCeiling=5;
 await expect(recoverDeltaExecution(automaticAgent as never,'owner')).rejects.toThrow('does not match');expect(rows.ExecutionLocks).toHaveLength(3);
});


test('LLM automatic leverage setting recovers using its saved native-stop ceiling',async()=>{
 rows.OrderIntents=[{_id:'setting',executionId,state:'PENDING',intent:{action:'delta-leverage',symbol:'BTCUSD',leverage:1,leverageCeiling:2}}];
 const llm={...agent,strategy:'LLM_TRADING',market:{symbols:['BTCUSD']},strategyConfig:{sizing:{version:1,mode:'STOP_LOSS',leverageMode:'AUTO',leverage:2,maxMarginPct:100,maxExposureMultiple:2,feeBps:10,slippageBps:5}}};
 await recoverDeltaExecution(llm as never,'owner');
 expect(rows.OrderIntents[0]).toMatchObject({state:'RECONCILED'});expect(leverageReads).toBe(2);expect(rows.ExecutionLocks).toHaveLength(0);
});

test('terminal pre-order queue evidence recovers an orphaned STARTED database record',async()=>{
 rows.AgentExecutions[0]={_id:executionId,agentId:agent.id,state:'STARTED',startedAt:{$date:'2026-01-01T00:00:00Z'}};
 queueEvidence={version:1,runId:executionId,brokerOperationRequested:false,failedAt:'2026-01-01T00:02:00Z',code:'LLM_REQUEST_TIMEOUT'};
 await recover();expect(rows.AgentExecutions[0]).toMatchObject({state:'COMPLETED',originalState:'STARTED',recovery:{queueFailure:{code:'LLM_REQUEST_TIMEOUT'}}});expect(rows.ExecutionLocks).toHaveLength(0);
});
test('orphan recovery refuses an active worker, mismatched evidence or any order intent',async()=>{
 rows.AgentExecutions[0]={_id:executionId,agentId:agent.id,state:'STARTED',startedAt:{$date:'2026-01-01T00:00:00Z'}};
 queueEvidence={version:1,runId:executionId,brokerOperationRequested:false,failedAt:'2026-01-01T00:02:00Z',code:'LLM_REQUEST_TIMEOUT'};
 active=true;await expect(recover()).rejects.toThrow('no verified terminal');active=false;
 queueEvidence.runId='other';await expect(recover()).rejects.toThrow('no verified terminal');queueEvidence.runId=executionId;
 rows.OrderIntents=[{_id:'unexpected',executionId,state:'PENDING',intent:{action:'crypto-entry'}}];
 await expect(recover()).rejects.toThrow('has order operations');expect(rows.ExecutionLocks).toHaveLength(3);expect(writes).toBe(0);
});
