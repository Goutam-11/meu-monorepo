import 'server-only';
import {validateSizingPolicy} from '../../../../../shared/trading/sizing';
import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import type { Agent, Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/db';
import { appLog } from '@/lib/logging/app-logger';
import { readRows } from './reconciliation';
import { executionConnection, linkedExchangeIds, registerExecutionAccount } from './execution-account';
import {fetchCryptoLeverage,cryptoEntryMarket} from '../../../../../meu/schedulerService/src/brokers/crypto/cryptoRisk';
import { inspectDeltaOwnership, type ReconciliationOrder, type ReconciliationOwner } from '../../../../../meu/schedulerService/src/brokers/delta/deltaReconciliation';
import { intervals, validateCryptoStrategy } from '../../../../../meu/schedulerService/src/algorithms/crypto/cryptoStrategyConfig';
import { strategyStateKey } from '../../../../../shared/trading/strategies';
import { loadDeltaBacktestData } from '@/features/backtests/server/delta-data';
import { COLLECTIONS } from "../../../../../shared/persistence/collections";

type Lock = {_id:string;executionId:string;kind?:string};
type Execution = {_id:string;agentId:string;state:string;startedAt?:{$date:string};finishedAt?:{$date:string};recovery?:{outcome?:string;fromCandle?:number;intents?:Prisma.InputJsonValue[]}};
type Intent = {_id:string;executionId:string;state:string;intent:{clientOrderId?:string;order_id?:string;action?:string;symbol?:string;leverage?:number;leverageCeiling?:number};recovery?:{brokerOrderId?:string}};
type Owner = ReconciliationOwner & {accountKey:string;userId:string;periodId?:string};
type Managed = ReconciliationOrder & {accountKey:string;userId:string;updatedAt?:unknown};
type Cursor = {_id:string;lastCandle:number;entryOrderId?:string};
const fail=(message:string):never=>{throw new TRPCError({code:'PRECONDITION_FAILED',message});};
function written(result:Prisma.JsonObject,n=1) {
  if(result.ok!==1 || result.n!==n || (Array.isArray(result.writeErrors)&&result.writeErrors.length))throw new Error('Recovery write was not confirmed');
}

/** No broker writes. Recovery finishes only on a verified flat, quiescent account. */
export async function recoverDeltaExecution(agent:Agent,userId:string) {
  if(agent.userId!==userId || agent.status!=='PAUSED' || agent.type!=='CRYPTO' || agent.executionMode==='PAPER')fail('Pause the live crypto agent before recovering its execution.');
  const [held]=await readRows<Lock>({find:COLLECTIONS.ExecutionLocks,filter:{_id:`exchange:${agent.exchangeId}`}},1);
  if(!held)return 'No retained execution lock exists on this connection.';
  if(held.kind)fail('Account preparation or another recovery is in progress. Its lock cannot be released here.');
  const recoveryLock=`recovery:${agent.id}`,recoveryId=`recover:${randomUUID()}`;
  const coordinatorMessage='Recovery is already in progress for this agent. Wait for the existing request to finish and scan again. If the frontend restarted during recovery and this coordination lock persists, administrator review is required; it cannot be safely unlocked by elapsed time alone.';
  let acquired=false;
  try {
    const [coordinator]=await readRows<Lock>({find:COLLECTIONS.ExecutionLocks,filter:{_id:recoveryLock}},1);
    if(coordinator)fail(coordinatorMessage);
    try {
      written(await prisma.$runCommandRaw({insert:COLLECTIONS.ExecutionLocks,documents:[{_id:recoveryLock,executionId:recoveryId,kind:'BROKER_RECONCILIATION',createdAt:{$date:new Date().toISOString()}}]}));
    }catch(error) {
      // The initial read is advisory: a concurrent request can win the unique insert.
      if((await readRows<Lock>({find:COLLECTIONS.ExecutionLocks,filter:{_id:recoveryLock}},1)).length)fail(coordinatorMessage);
      throw error;
    }
    acquired=true;
    const [execution]=await readRows<Execution>({find:COLLECTIONS.AgentExecutions,filter:{_id:held.executionId,agentId:agent.id}},1);
    const interrupted=execution?.state==='COMPLETED'&&execution.recovery?.outcome==='BROKER_RECONCILED_FLAT';
    const orphan=execution?.state==='STARTED';
    const verifyOrphan=async()=>{
      const {redis}=await import('../../../../../meu/schedulerService/src/lib/redis');
      const key=`bull:agent-execution:${held.executionId}`;
      const [heartbeat,active,failed,data]=await Promise.race([Promise.all([redis.exists(`${key}:lock`),redis.lpos('bull:agent-execution:active',held.executionId),redis.zscore('bull:agent-execution:failed',held.executionId),redis.hget(key,'data')]),new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Queue evidence verification timed out')),5000);timer.unref();})]);
      let saved;
      try { saved=typeof data==='string'&&data.length<10000 ? JSON.parse(data) : null; } catch { saved=null; }
      const evidence=saved?.recoveryFailure;
      if(heartbeat||active!==null||!failed||!Number.isFinite(Number(failed))||saved?.agentId!==agent.id||saved?.userId!==userId||evidence?.version!==1||evidence.runId!==held.executionId||evidence.brokerOperationRequested!==false||
        typeof evidence.code!=='string'||!/^[A-Z_]{1,80}$/.test(evidence.code)||!Number.isFinite(Date.parse(evidence.failedAt))||!execution?.startedAt?.$date||!Number.isFinite(Date.parse(execution.startedAt.$date))||Date.parse(evidence.failedAt)<Date.parse(execution.startedAt.$date))
        fail('The database still shows STARTED and no verified terminal, pre-order queue evidence is available. An active or uncertain execution cannot be unlocked; administrator review is required if its worker already stopped.');
      return {code:evidence.code as string,failedAt:evidence.failedAt as string};
    };
    const orphanEvidence=orphan ? await verifyOrphan() : undefined;
    if(!execution || (!orphan && (!interrupted && execution.state!=='REVIEW_REQUIRED' || !execution.finishedAt?.$date)))fail('The holding execution has not finished. Wait for the worker; an active execution cannot be unlocked.');
    const {exchange,connection}=await executionConnection(agent.exchangeId,userId);
    if(!['DELTA','BINANCE'].includes(connection.name.toUpperCase()) || connection.sandbox)fail('Broker recovery supports Delta India and Binance USD-M production accounts.');
    await exchange.loadMarkets();
    const {accountKey}=await registerExecutionAccount(exchange,agent.exchangeId,userId);
    const connectionIds=await linkedExchangeIds(accountKey,userId);
    const peers=await prisma.agent.findMany({where:{userId,exchangeId:{in:connectionIds}},select:{id:true,status:true,executionMode:true}});
    if(peers.length>100)fail('Too many linked agents to verify safely.');
    const livePeers=peers.filter(a=>a.executionMode!=='PAPER');
    const scopes=[`agent:${agent.id}`,`account:${accountKey}`,`exchange:${agent.exchangeId}`];
    if(peers.some(a=>a.status==='RUNNING'&&a.executionMode!=='PAPER'))fail('Pause all live agents on this account before broker recovery. Use Pause live agents on the recovery page.');
    const assertUnchanged=async()=>{
      if(!await prisma.agent.findFirst({where:{id:agent.id,userId,status:'PAUSED',updatedAt:agent.updatedAt},select:{id:true}}))fail('Agent settings changed during recovery. Reload the page and try again.');
      if(await prisma.agent.count({where:{userId,exchangeId:{in:connectionIds},status:'RUNNING',OR:[{executionMode:null},{executionMode:{isSet:false}},{executionMode:{not:'PAPER'}}]}}))fail('Pause all live agents on this account before broker recovery. Use Pause live agents on the recovery page.');
      // A finished audit alone is insufficient if an in-flight queue job still owns its heartbeat.
      const {redis}=await import('../../../../../meu/schedulerService/src/lib/redis');
      const active=await Promise.race([
        Promise.all([redis.exists(`bull:agent-execution:${held.executionId}:lock`),redis.lpos('bull:agent-execution:active',held.executionId)]),
        new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Queue verification timed out')),5000);timer.unref();}),
      ]);
      if(active[0] || active[1]!==null)fail('This execution is still active in the worker queue. Wait for it to finish before retrying recovery.');
      if(orphan && JSON.stringify(await verifyOrphan())!==JSON.stringify(orphanEvidence))fail('Queue recovery evidence changed during verification. Scan again.');
      const locks=await readRows<Lock>({find:COLLECTIONS.ExecutionLocks,filter:{_id:{$in:[...scopes,...connectionIds.map(id=>`exchange:${id}`),...livePeers.map(a=>`agent:${a.id}`)]}}},300);
      if(locks.some(l=>l.executionId!==held.executionId || !scopes.includes(l._id) || l.kind) || locks.length!==3)fail('Another operation or changed lock owns this account. Recovery will not release its locks.');
      const unfinished=await readRows({find:COLLECTIONS.AgentExecutions,filter:{agentId:{$in:livePeers.map(a=>a.id)},state:{$ne:'COMPLETED'},_id:{$ne:held.executionId}}},100);
      if(unfinished.length)fail('Another execution needs review on this account. Recover that execution first.');
    };
    if(interrupted)for(const scope of scopes) {
      const [lock]=await readRows<Lock>({find:COLLECTIONS.ExecutionLocks,filter:{_id:scope}},1);
      if(!lock)written(await prisma.$runCommandRaw({insert:COLLECTIONS.ExecutionLocks,documents:[{_id:scope,executionId:held.executionId,createdAt:{$date:new Date().toISOString()}}]}));
    }
    await assertUnchanged();
    const owners=await readRows<Owner>({find:COLLECTIONS.CryptoPositionOwners,filter:{accountKey,userId,agentId:agent.id}},100);
    const foreignOwners=await readRows({find:COLLECTIONS.CryptoPositionOwners,filter:{accountKey,userId,agentId:{$ne:agent.id},state:{$ne:'FLAT'}}},1);
    if(foreignOwners.length)fail('Another agent still reserves a position on this account. Reconcile that agent first.');
    const foreignSubmissions=await readRows({find:COLLECTIONS.ManagedCryptoOrders,filter:{accountKey,userId,agentId:{$ne:agent.id},state:'SUBMITTING'}},1);
    if(foreignSubmissions.length)fail('Another agent has an uncertain order submission on this account. Reconcile that execution first.');
    if(owners.some(o=>!Array.isArray(o.orderRefs)||o.orderRefs.length>128))fail('Managed ownership history is incomplete. Recovery requires the saved order references.');
    const managed=await readRows<Managed>({find:COLLECTIONS.ManagedCryptoOrders,filter:{accountKey,userId,agentId:agent.id}},500);
    if(owners.some(o=>o.orderRefs.some(id=>!managed.some(m=>m._id===id&&m.symbol===o.symbol))))fail('A managed order is missing from ownership history. Restore that record before recovering.');
    const periods=await readRows<{_id:string;endedAt?:{$date:string}}>({find:COLLECTIONS.CryptoOwnershipPeriods,filter:{_id:{$in:owners.flatMap(o=>o.periodId?[o.periodId]:[])},accountKey,agentId:agent.id}},100);
    if(owners.some(o=>o.periodId&&!periods.some(p=>p._id===o.periodId)))fail('A saved ownership period is missing. Restore it before recovering; risk attribution cannot be discarded.');
    const intents=await readRows<Intent>({find:COLLECTIONS.OrderIntents,filter:{executionId:held.executionId}},100);
    if(orphan && intents.length)fail('The interrupted execution has order operations. Pre-order queue evidence cannot recover it; inspect its broker submission history.');
    const broker=await inspectDeltaOwnership(exchange,owners,managed);
    if(broker.positions.length)fail(`The exchange still has an open position (${broker.positions.map(p=>p.symbol).join(', ')}). Manage or close it on the exchange, then scan again. Recovery does not close positions.`);
    if(broker.pending.length)fail(`The exchange still has pending orders (${broker.pending.map(o=>`${o.symbol}: ${o.brokerOrderId}`).join(', ')}). Review/cancel them on the exchange, then scan again. Recovery does not cancel orders.`);
    const unknown=broker.orders.find(o=>o.verification==='UNKNOWN');
    if(unknown)fail(`The exchange could not verify client order ${unknown.clientOrderId} on ${unknown.symbol}. A missing order is not proof of rejection; check its broker history and retry the scan.`);
    if(broker.orders.some(o=>!['closed','canceled','expired','rejected'].includes(o.brokerStatus??'')))fail('A managed order is not terminal on the exchange. Wait for or cancel the order, then scan again.');
    const verifyLeverageIntent=async(intent:Intent)=>{
      const raw=agent.strategyConfig as Record<string,unknown>;
      const saved=agent.strategy==='ALGO_TRADING' ? validateCryptoStrategy(raw).simulation : validateSizingPolicy(raw.sizing);
      if(agent.strategy==='LLM_TRADING' && (!('mode' in saved) || saved.mode!=='STOP_LOSS'))fail('Leverage recovery requires a protected sizing policy.');
      const target=intent.intent.leverage,ceiling=intent.intent.leverageCeiling;
      if(!['ALGO_TRADING','LLM_TRADING'].includes(agent.strategy)||saved.leverageMode!=='AUTO'||ceiling!==saved.leverage||!Number.isSafeInteger(target)||!target||target<1||target>ceiling!||!intent.intent.symbol||
        !agent.market.symbols.some(symbol=>exchange.market(symbol).symbol===intent.intent.symbol))fail('Automatic leverage intent does not match this saved agent and its leverage ceiling.');
      const symbol=cryptoEntryMarket(exchange,intent.intent.symbol!,agent.capital.currency).symbol;
      const leverage=await fetchCryptoLeverage(exchange,symbol);
      const mode=exchange.id==='binance' ? {marginMode:leverage.marginMode} : await exchange.fetchMarginMode(symbol);
      if(mode.marginMode!=='isolated'||leverage.marginMode!=='isolated'||leverage.longLeverage!==target||leverage.shortLeverage!==target)
        fail(`Automatic leverage update is not verified: ${symbol} must show isolated margin and ${target}× leverage. Review this ticker on the exchange, then retry recovery. No entry is replayed.`);
      return {id:intent._id,state:intent.state,action:'delta-leverage',symbol,verifiedLeverage:target,marginMode:'isolated'};
    };
    const intentEvidence=await Promise.all(intents.map(async intent=>{
      if(!['PENDING','CONFIRMED','REFUSED','RECONCILED'].includes(intent.state))fail('An execution operation has an unknown state.');
      if(intent.state==='REFUSED')return {id:intent._id,state:intent.state};
      if(['delta-leverage','crypto-leverage'].includes(intent.intent?.action ?? ''))return verifyLeverageIntent(intent);
      const saved=managed.find(m=>intent.intent?.clientOrderId ? m.clientOrderId===intent.intent.clientOrderId : intent.intent?.action==='cancel'&&m.brokerOrderId===intent.intent.order_id);
      if(!saved)fail(`Operation ${intent._id} has no verifiable managed order identity. Recovery will not assume it failed or retry the order.`);
      const actual=broker.orders.find(o=>o.clientOrderId===saved!.clientOrderId);
      if(!actual && saved!.state!=='REFUSED')fail('An execution operation has no verified broker evidence.');
      if(intent.state==='PENDING'&&!actual)fail('An uncertain operation cannot be resolved from a refusal record alone.');
      return {id:intent._id,state:intent.state,brokerOrderId:actual?.brokerOrderId??saved!.brokerOrderId??null,brokerStatus:actual?.brokerStatus??'refused'};
    }));
    let cursor:Cursor|undefined,history:Awaited<ReturnType<typeof loadDeltaBacktestData>>|undefined;
    if(agent.strategy==='ALGO_TRADING') {
      const config=validateCryptoStrategy(agent.strategyConfig);
      [cursor]=await readRows<Cursor>({find:COLLECTIONS.CryptoStrategyState,filter:{_id:strategyStateKey(agent.id,config),userId}},1);
      if(cursor) {
        const interval=intervals[config.timeframe],end=Math.floor(Date.now()/1000/interval)*interval,count=Math.max(config.slowPeriod,config.lookback,config.atrPeriod,15)*5+2;
        history=await loadDeltaBacktestData({symbol:agent.market.symbols[0]!,timeframe:config.timeframe,start:end-count*interval,end});
        if(history.contract.symbol!==config.contract.symbol || history.contract.contractSize!==config.contract.contractSize || history.contract.maintenanceMarginRate!==config.contract.maintenanceMarginRate || !Number.isSafeInteger(cursor.lastCandle) || history.candles.at(-1)!.timestamp<cursor.lastCandle || (history.candles.at(-1)!.timestamp-cursor.lastCandle)%interval!==0)fail('Saved strategy cursor or contract differs from verified market history. Review the strategy configuration.');
        if(cursor.entryOrderId&&!broker.orders.some(o=>o.brokerOrderId===cursor!.entryOrderId))fail('The tracked strategy entry is not part of the verified managed order history.');
      }
    }
    await assertUnchanged();
    // Repeat the flat snapshot before writes; never repair from a stale scan displayed in the UI.
    const finalBroker=await inspectDeltaOwnership(exchange,owners,managed);
    if(JSON.stringify(finalBroker)!==JSON.stringify(broker))fail('Broker orders or positions changed during recovery. No recovery writes were made; scan again.');
    for(const intent of intents)if(['delta-leverage','crypto-leverage'].includes(intent.intent?.action ?? '')&&intent.state!=='REFUSED')await verifyLeverageIntent(intent);
    await assertUnchanged();
    const verifiedAt={$date:new Date().toISOString()};
    const recovery={outcome:'BROKER_RECONCILED_FLAT',userId,verifiedAt,brokerOrders:broker.orders,intents:execution.recovery?.intents??intentEvidence,ownerIds:owners.map(o=>o._id),...(orphanEvidence?{queueFailure:orphanEvidence}:{}),...(cursor&&history?{fromCandle:execution.recovery?.fromCandle??cursor.lastCandle,toCandle:history.candles.at(-1)!.timestamp,dataHash:history.dataHash}:{})};
    written(await prisma.$runCommandRaw({update:COLLECTIONS.AgentExecutions,updates:[{q:{_id:held.executionId,agentId:agent.id,state:execution.state},u:{$set:{recovery,originalState:'REVIEW_REQUIRED'}}}]}));
    for(const saved of managed) {
      const actual=broker.orders.find(o=>o.clientOrderId===saved.clientOrderId);
      if(!actual)continue; // Recorded broker refusals are already terminal and have no order ID.
      written(await prisma.$runCommandRaw({update:COLLECTIONS.ManagedCryptoOrders,updates:[{q:{_id:saved._id,accountKey,userId,agentId:agent.id,state:saved.state},u:{$set:{state:'ACCEPTED',brokerOrderId:actual.brokerOrderId,brokerStatus:actual.brokerStatus,filled:actual.filled,remaining:actual.remaining,updatedAt:verifiedAt,reconciledBy:userId,reconciledAt:verifiedAt}}}]}));
    }
    for(const owner of owners) {
      written(await prisma.$runCommandRaw({update:COLLECTIONS.CryptoPositionOwners,updates:[{q:{_id:owner._id,accountKey,userId,agentId:agent.id,state:owner.state,orderRefs:owner.orderRefs},u:{$set:{state:'FLAT',contracts:0,lastVerifiedAt:verifiedAt,updatedAt:verifiedAt,reconciledBy:userId}}}]}));
      if(owner.periodId&&!periods.find(p=>p._id===owner.periodId)?.endedAt)written(await prisma.$runCommandRaw({update:COLLECTIONS.CryptoOwnershipPeriods,updates:[{q:{_id:owner.periodId,accountKey,agentId:agent.id,endedAt:{$exists:false}},u:{$set:{endedAt:verifiedAt}}}]}));
    }
    for(const evidence of intentEvidence)if(evidence.state==='PENDING')written(await prisma.$runCommandRaw({update:COLLECTIONS.OrderIntents,updates:[{q:{_id:evidence.id,executionId:held.executionId,state:'PENDING'},u:{$set:{state:'RECONCILED',originalState:'PENDING',recovery:{...evidence,userId,verifiedAt}}}}]}));
    if(cursor&&history)written(await prisma.$runCommandRaw({update:COLLECTIONS.CryptoStrategyState,updates:[{q:{_id:cursor._id,userId,lastCandle:cursor.lastCandle},u:{$set:{history:history.candles,lastCandle:history.candles.at(-1)!.timestamp},$unset:{entryOrderId:'',side:'',filled:''}}}]}));
    written(await prisma.$runCommandRaw({update:COLLECTIONS.AgentExecutions,updates:[{q:{_id:held.executionId,agentId:agent.id,state:execution.state},u:{$set:{state:'COMPLETED',recovery,originalState:orphan?'STARTED':'REVIEW_REQUIRED',...(orphan?{finishedAt:verifiedAt}:{})}}}]}));
    // Release only this execution's scopes. Exchange remains held until the last delete.
    written(await prisma.$runCommandRaw({delete:COLLECTIONS.ExecutionLocks,ordered:true,deletes:scopes.map(_id=>({q:{_id,executionId:held.executionId},limit:1}))}),3);
    appLog('info','exchange.recovery.completed',{operation:'trpc.exchange.recoverExecution'});
    return `Recovered ${agent.name}: verified broker account is flat, reconciled ${broker.orders.length} orders and released execution locks. The agent remains paused; Resume it when ready.`;
  }catch(error) {
    appLog('warn','exchange.recovery.failed',{operation:'trpc.exchange.recoverExecution',code:'PRECONDITION_FAILED'});
    if(error instanceof TRPCError)throw error;
    throw new TRPCError({code:'CONFLICT',message:'Recovery could not finish or be verified. Locks were not blindly removed. Keep agents paused and retry; a partial recovery can be continued safely.'});
  }finally {
    if(acquired)try{written(await prisma.$runCommandRaw({delete:COLLECTIONS.ExecutionLocks,deletes:[{q:{_id:recoveryLock,executionId:recoveryId},limit:1}]}));}
    catch{throw new TRPCError({code:'CONFLICT',message:'The recovery coordination lock could not be released. Keep agents paused and retry the account scan; the execution locks were not blindly removed.'});}
  }
}
