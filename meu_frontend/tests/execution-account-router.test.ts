import { test, expect, mock } from 'bun:test';
import { COLLECTIONS } from "../../shared/persistence/collections";
const limits={maxOpenPositions:3,maxMarginPct:50,maxDailyLossPct:1,maxNotionalMultiple:3};
let busy=false,running=false,releaseFailure=false,updates=0,releases=0;
const queries:Record<string,unknown>[]=[];
mock.module('server-only',()=>({}));
mock.module('@/lib/auth/server',()=>({auth:{api:{getSession:async()=>({user:{id:'owner'}})}}}));
mock.module('next/headers',()=>({headers:async()=>new Headers()}));
mock.module('../src/features/exchange/server/execution-account',()=>({
 executionConnection:async (_id:string,userId:string)=>{expect(userId).toBe('owner');return{exchange:{}};},
 registerExecutionAccount:async()=>({accountKey:'account'}),linkedExchangeIds:async()=>['connection-a','connection-b'],
}));
mock.module('@/lib/db',()=>({default:{
 exchange:{findFirst:async ({where}:{where:Record<string,unknown>})=>where.id==='connection-a'&&where.userId==='owner'?{id:'connection-a',name:'DELTA'}:null},
 agent:{findMany:async ({where}:{where:Record<string,unknown>})=>{expect(where.userId).toBe('owner');return[{id:'agent',name:'My Agent'}];},count:async ({where}:{where:Record<string,unknown>})=>{expect(where.userId).toBe('owner');expect(where.exchangeId).toEqual({in:['connection-a','connection-b']});return running?1:0;}},
 $runCommandRaw:async (command:Record<string,any>)=>{
  queries.push(command);
  if(command.find){expect(command.filter.userId).toBe('owner');return{ok:1,cursor:{firstBatch:command.find===COLLECTIONS.BrokerAccountLinks?[{accountKey:'account'}]:command.find===COLLECTIONS.BrokerAccounts?[{limits}]:command.find===COLLECTIONS.CryptoPositionOwners?[{agentId:'agent',symbol:'XRP/USD:USD',state:'OPEN',contracts:1,apiKey:'private'}]:command.find===COLLECTIONS.ManagedCryptoOrders?[{agentId:'agent',symbol:'XRP/USD:USD',clientOrderId:'client',state:'ACCEPTED',side:'buy',amount:1,reduceOnly:false,secret:'private'}]:[]}};}
  if(command.insert)return busy?{ok:1,n:0,writeErrors:[{code:11000}]}:{ok:1,n:1};
  if(command.update){expect(command.updates[0].q).toEqual({_id:'account',userId:'owner'});updates++;return{ok:1,n:1};}
  if(command.delete){expect(command.deletes[0].q._id).toBe('account:account');releases++;return{ok:1,n:releaseFailure?0:1};}
  throw new Error('Unexpected command');
 },
}}));
const {exchangeRouter}=await import('../src/features/exchange/server/router');
const caller=exchangeRouter.createCaller({} as never);
function reset(){busy=running=releaseFailure=false;updates=releases=0;queries.length=0;}
test('execution state scopes connection and records to owner and returns only public fields',async()=>{
 reset();await expect(caller.executionState({id:'foreign'})).rejects.toMatchObject({code:'NOT_FOUND'});expect(queries).toHaveLength(0);
 const result=await caller.executionState({id:'connection-a'});expect(result.positions[0]?.agentName).toBe('My Agent');expect(result.positions[0]).not.toHaveProperty('apiKey');expect(result.orders[0]).not.toHaveProperty('secret');expect(result.orders[0]?.clientOrderId).toBe('client');
});
test('shared risk changes require every linked live agent paused and release the owned account lock',async()=>{
 reset();running=true;await expect(caller.updateAccountRisk({id:'connection-a',limits})).rejects.toMatchObject({code:'PRECONDITION_FAILED'});expect(updates).toBe(0);expect(releases).toBe(1);
 reset();await caller.updateAccountRisk({id:'connection-a',limits});expect(updates).toBe(1);expect(releases).toBe(1);
});
test('busy account and failed release surface conflicts; invalid limits never save',async()=>{
 reset();busy=true;await expect(caller.updateAccountRisk({id:'connection-a',limits})).rejects.toMatchObject({code:'CONFLICT'});expect(updates).toBe(0);expect(releases).toBe(0);
 reset();releaseFailure=true;await expect(caller.updateAccountRisk({id:'connection-a',limits})).rejects.toMatchObject({code:'CONFLICT'});expect(updates).toBe(1);
 reset();await expect(caller.updateAccountRisk({id:'connection-a',limits:{...limits,maxMarginPct:101}})).rejects.toMatchObject({code:'BAD_REQUEST'});expect(updates).toBe(0);expect(queries).toHaveLength(0);
});
