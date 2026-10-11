import {test,expect,mock,beforeEach} from 'bun:test';
import {TRPCError} from '@trpc/server';
let running=false,changed=false,truncated=false,brokerError=false,denied=false;
let inspections=0;
const commands:Record<string,any>[]=[];
mock.module('server-only',()=>({}));
mock.module('../src/features/exchange/server/execution-account',()=>({
 executionConnection:async (_id:string,userId:string)=>{
  expect(userId).toBe('owner');if(denied)throw new TRPCError({code:'NOT_FOUND',message:'Connection unavailable'});
  return{connection:{name:'DELTA',displayName:'India'},exchange:{loadMarkets:async()=>{}}};
 },
 registerExecutionAccount:async()=>({accountKey:'physical'}),
 linkedExchangeIds:async()=>['alias-a','alias-b'],
}));
mock.module('../../meu/schedulerService/src/agent/deltaReconciliation',()=>({
 inspectDeltaOwnership:async()=>{inspections++;if(brokerError)throw new Error('private broker response');return{issues:[],positions:[],orders:[],pending:[]};},
}));
mock.module('@/lib/db',()=>({default:{
 agent:{findMany:async({where}:{where:Record<string,any>})=>{
  expect(where).toEqual({userId:'owner',exchangeId:{in:['alias-a','alias-b']}});
  return[{id:'agent',name:'Paper or paused',status:running?'RUNNING':'PAUSED',executionMode:'LIVE'}];
 },count:async()=>changed?1:0},
 $runCommandRaw:async(command:Record<string,any>)=>{
  commands.push(command);expect(command.find).toBeDefined();
  expect(command.batchSize).toBe(command.limit);
  if(command.find==='ExecutionLocks'){
   expect(command.filter._id.$in).toEqual(['account:physical','exchange:alias-a','exchange:alias-b','agent:agent','recovery:agent']);
   return{ok:1,cursor:{id:truncated?123:0,firstBatch:[{_id:'account:physical',executionId:'run',kind:'WORKER'}]}};
  }
  if(['CryptoPositionOwners','ManagedCryptoOrders'].includes(command.find))expect(command.filter.userId).toBe('owner');
  const rows=command.find==='AgentExecutions'?[{_id:'run',agentId:'agent',state:'REVIEW_REQUIRED',secret:'hidden'}]
   :command.find==='OrderIntents'?[{_id:'intent',executionId:'run',state:'PENDING',intent:{symbol:'XRP/USD:USD'},secret:'hidden'}]:[];
  return{ok:1,cursor:{id:{$numberLong:'0'},firstBatch:rows}};
 },
}}));
const {reconciliationReport}=await import('../src/features/exchange/server/reconciliation');
beforeEach(()=>{running=changed=truncated=brokerError=denied=false;inspections=0;commands.length=0;});
test('scan scopes both account aliases, retains locks and returns only projected intent fields',async()=>{
 const result=await reconciliationReport('alias-a','owner');
 expect(result.connectionName).toBe('India');expect(result.changedDuringScan).toBe(false);
 expect(result.locks[0]).toMatchObject({scope:'account',executionId:'run',state:'REVIEW_REQUIRED'});
 expect(result.unresolvedIntents[0]).toEqual({id:'intent',executionId:'run',symbol:'XRP/USD:USD',state:'PENDING'});
 expect(JSON.stringify(result)).not.toContain('hidden');expect(commands.every(c=>c.find)).toBe(true);
});
test('running live agent prevents broker scan',async()=>{
 running=true;await expect(reconciliationReport('alias-a','owner')).rejects.toMatchObject({code:'PRECONDITION_FAILED'});
 expect(inspections).toBe(0);expect(commands).toHaveLength(0);
});
test('unowned connection prevents linked record and broker reads',async()=>{
 denied=true;await expect(reconciliationReport('foreign','owner')).rejects.toMatchObject({code:'NOT_FOUND'});
 expect(inspections).toBe(0);expect(commands).toHaveLength(0);
});
test('incomplete Mongo cursor fails instead of reporting a clean account',async()=>{
 truncated=true;await expect(reconciliationReport('alias-a','owner')).rejects.toMatchObject({code:'BAD_GATEWAY'});expect(inspections).toBe(0);
 truncated=false;expect((await reconciliationReport('alias-a','owner')).locks).toHaveLength(1);
});
test('live activation during scan invalidates its stability',async()=>{
 changed=true;expect((await reconciliationReport('alias-a','owner')).changedDuringScan).toBe(true);
});
test('broker errors do not expose private response contents and release only the scan throttle',async()=>{
 brokerError=true;try{await reconciliationReport('alias-a','owner');throw new Error('expected failure');}catch(error){expect(error).toMatchObject({code:'BAD_GATEWAY'});expect(String(error)).not.toContain('private broker');}
 brokerError=false;await reconciliationReport('alias-a','owner');expect(commands.every(c=>c.find)).toBe(true);
});
