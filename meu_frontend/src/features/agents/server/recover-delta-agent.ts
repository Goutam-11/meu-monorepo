import 'server-only';
import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import type { Agent, Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/db';
import { appLog } from '@/lib/app-logger';
import { readRows } from '@/features/exchange/server/reconciliation';
import { executionConnection, registerExecutionAccount, linkedExchangeIds } from '@/features/exchange/server/execution-account';
import { loadDeltaBacktestData } from '@/features/backtests/server/delta-data';
import { strategyStateKey } from '../../../../../shared/trading/strategies';
import { intervals, validateCryptoStrategy } from '../../../../../meu/schedulerService/src/agent/cryptoStrategyConfig';
import { inspectDeltaOwnership } from '../../../../../meu/schedulerService/src/agent/deltaReconciliation';

type Lock = { _id: string; executionId: string; kind?: string };
type Execution = { _id: string; agentId: string; state: string; reviewReason?: string; failure?: {stage?:string;brokerOperationRequested?:boolean;errorType?:string}; startedAt: {$date:string}; finishedAt?: {$date:string}; recovery?: { outcome?: string; fromCandle?: number } };
type State = { _id: string; userId: string; lastCandle: number; activeAfter?: number; entryOrderId?: string; side?: string; filled?: number };
const missedMessage = 'Missed live strategy candles; review required rather than trading stale signals';
const fail = (message: string): never => { throw new TRPCError({code:'PRECONDITION_FAILED',message}); };
function written(result: Prisma.JsonObject, count: number) {
  if (result.ok !== 1 || result.n !== count || (Array.isArray(result.writeErrors) && result.writeErrors.length))
    throw new Error('Recovery write was not confirmed');
}

/** Recover verified pre-order strategy failures under retained locks. Never sends broker writes. */
export async function recoverDeltaAgent(agent: Agent, userId: string, requestId?: string) {
  if (agent.userId !== userId || agent.status !== 'PAUSED' || agent.type !== 'CRYPTO' || agent.strategy !== 'ALGO_TRADING' || agent.executionMode !== 'LIVE')
    fail('Only a paused live Delta algorithm can recover missed candles.');
  let recoveryLock = '', recoveryId = '';
  let acquired = false;
  try {
    const [held] = await readRows<Lock>({find:'ExecutionLocks',filter:{_id:`exchange:${agent.exchangeId}`}},1);
    if (!held || held.kind) fail('The exchange is busy or requires manual reconciliation; this is not a missed-candle worker lock.');
    recoveryLock = `recovery:${agent.id}`; recoveryId = `recover:${randomUUID()}`;
    written(await prisma.$runCommandRaw({insert:'ExecutionLocks',documents:[{_id:recoveryLock,executionId:recoveryId,kind:'MISSED_CANDLE_RECOVERY',createdAt:{$date:new Date().toISOString()}}]}),1);
    acquired = true;
    const [execution] = await readRows<Execution>({find:'AgentExecutions',filter:{_id:held.executionId,agentId:agent.id}},1);
    const previouslyRecovered = execution?.state === 'COMPLETED' && execution.recovery?.outcome === 'SKIPPED_STALE_SIGNALS';
    if (!execution || (execution.state !== 'REVIEW_REQUIRED' && !previouslyRecovered)) fail('The execution is still active or its failure cannot be recovered automatically.');
    let resumeHistoryFailure = false;
    if (execution.reviewReason === 'DELTA_DATA_INVALID' && execution.failure?.stage === 'execute_strategy' && execution.failure.brokerOperationRequested === false) {
      const savedConfig = validateCryptoStrategy(agent.strategyConfig);
      const [savedCursor] = await readRows<State>({find:'CryptoStrategyState',filter:{_id:strategyStateKey(agent.id,savedConfig),userId}},1);
      const activation = agent.strategyStartedAt ? Math.floor(agent.strategyStartedAt.getTime()/1000) : 0;
      resumeHistoryFailure = !!savedCursor && Number.isSafeInteger(savedCursor.lastCandle) && activation>0 &&
        (savedCursor.activeAfter !== undefined ? activation>savedCursor.activeAfter : activation>savedCursor.lastCandle+intervals[savedConfig.timeframe]);
    }
    const guardBeforeOrders = execution.reviewReason==='EXECUTION_GUARD_REJECTED' && execution.failure?.errorType==='OrderRejectedError' && execution.failure.stage==='execute_strategy' && execution.failure.brokerOperationRequested===false;
    if (!previouslyRecovered && execution.reviewReason !== 'MISSED_LIVE_CANDLES' && !resumeHistoryFailure && !guardBeforeOrders) {
      // Compatibility for failures recorded before typed review reasons were introduced.
      const startedAt = execution.startedAt?.$date, finishedAt = execution.finishedAt?.$date;
      if (!startedAt || !finishedAt) fail('The failure reason could not be verified. Inspect account reconciliation.');
      const notice = await prisma.notification.findFirst({where:{userId,agentId:agent.id,exchangeId:agent.exchangeId,code:'AGENT_REVIEW_REQUIRED',message:missedMessage,createdAt:{gte:new Date(startedAt!),lte:new Date(new Date(finishedAt!).getTime()+60_000)}},select:{id:true}});
      if (!notice) fail('This failure is not a verified missed-candle pause. Inspect account reconciliation.');
    }
    const {exchange} = await executionConnection(agent.exchangeId,userId);
    await exchange.loadMarkets();
    const {accountKey} = await registerExecutionAccount(exchange,agent.exchangeId,userId);
    const connectionIds = await linkedExchangeIds(accountKey,userId);
    const peers = await prisma.agent.findMany({where:{userId,exchangeId:{in:connectionIds}},select:{id:true,status:true,executionMode:true}});
    if (peers.length > 100) fail('Too many linked agents to recover safely.');
    const scopes = [`agent:${agent.id}`,`exchange:${agent.exchangeId}`,`account:${accountKey}`];
    if (previouslyRecovered) {
      // Finish an interrupted release only after restoring exclusive ownership.
      for (const scope of scopes) {
        const [lock] = await readRows<Lock>({find:'ExecutionLocks',filter:{_id:scope}},1);
        if (!lock) written(await prisma.$runCommandRaw({insert:'ExecutionLocks',documents:[{_id:scope,executionId:held.executionId,createdAt:{$date:new Date().toISOString()}}]}),1);
      }
    }
    const accountScopes = [...scopes,...connectionIds.map(id=>`exchange:${id}`),...peers.map(a=>`agent:${a.id}`)];
    const assertUnchanged = async () => {
      if (!await prisma.agent.findFirst({where:{id:agent.id,userId,status:'PAUSED',updatedAt:agent.updatedAt},select:{id:true}})) fail('Agent settings changed during recovery. Reload before resuming.');
      const running = await prisma.agent.findMany({where:{userId,exchangeId:{in:connectionIds},status:'RUNNING',OR:[{executionMode:null},{executionMode:{isSet:false}},{executionMode:{not:'PAPER'}}]},select:{id:true}});
      if(running.length) {
        const waiters=await readRows({find:'Agent',filter:{_id:{$in:running.map(a=>({$oid:a.id}))},userId,status:'RUNNING',executionWaitingOn:held.executionId},projection:{_id:1}},100);
        if(waiters.length!==running.length)fail('Pause live agents that are not waiting on this failed execution before recovering missed candles.');
      }
      const locks = await readRows<Lock>({find:'ExecutionLocks',filter:{_id:{$in:accountScopes}}},300);
      if (locks.some(l=>l.executionId!==held.executionId || !scopes.includes(l._id) || l.kind) || locks.length!==3)
        fail('Other account operations or changed execution locks require reconciliation.');
      // Require zero broker operations, including confirmed/refused operations, for this run.
      if ((await readRows({find:'OrderIntents',filter:{executionId:held.executionId}},1)).length)
        fail('This execution attempted a broker operation. Reconcile its orders before resuming.');
      const incomplete = await readRows<Execution>({find:'AgentExecutions',filter:{agentId:{$in:peers.map(a=>a.id)},state:{$ne:'COMPLETED'},_id:{$ne:held.executionId}}},100);
      if (incomplete.length) fail('Another execution on this account needs review before recovery.');
      const owners = await readRows({find:'CryptoPositionOwners',filter:{accountKey,userId,state:{$ne:'FLAT'}}},100);
      const submitting = await readRows({find:'ManagedCryptoOrders',filter:{accountKey,userId,state:'SUBMITTING'}},500);
      if (owners.length || submitting.length) fail('Position ownership or an unfinished submission needs reconciliation.');
    };
    await assertUnchanged();
    const config = validateCryptoStrategy(agent.strategyConfig);
    const stateId = strategyStateKey(agent.id,config);
    const [state] = await readRows<State>({find:'CryptoStrategyState',filter:{_id:stateId,userId}},1);
    if (!state || !Number.isSafeInteger(state.lastCandle) || state.entryOrderId || state.side || state.filled)
      fail('The strategy cursor or recorded entry needs manual reconciliation.');
    const interval = intervals[config.timeframe], end = Math.floor(Date.now()/1000/interval)*interval;
    const count = Math.max(config.slowPeriod,config.lookback,config.atrPeriod,15)*5+2;
    const data = await loadDeltaBacktestData({symbol:agent.market.symbols[0]!,timeframe:config.timeframe,start:end-count*interval,end});
    if (data.contract.symbol!==config.contract.symbol || data.contract.contractSize!==config.contract.contractSize || data.contract.maintenanceMarginRate!==config.contract.maintenanceMarginRate)
      fail('Delta contract terms changed. Review the strategy configuration.');
    const cursor = data.candles.at(-1)!.timestamp;
    if (cursor<state.lastCandle || (cursor-state.lastCandle)%interval!==0) fail('The saved candle cursor is inconsistent with current market history.');
    const broker = await inspectDeltaOwnership(exchange,[],[]);
    if (broker.issues.length || broker.positions.length || broker.pending.length) fail('Delta must be flat with no open orders before missed-candle recovery.');
    await assertUnchanged();
    const fromCandle = execution.recovery?.fromCandle ?? state.lastCandle;
    const recovery = {outcome:'SKIPPED_STALE_SIGNALS',fromCandle,toCandle:cursor,skippedCandles:(cursor-fromCandle)/interval,dataHash:data.dataHash,verifiedAt:{$date:new Date().toISOString()},userId};
    // Persist the plan before the cursor; an interruption retains account locks.
    written(await prisma.$runCommandRaw({update:'AgentExecutions',updates:[{q:{_id:held.executionId,agentId:agent.id,state:execution.state},u:{$set:{recovery}}}]}),1);
    written(await prisma.$runCommandRaw({update:'CryptoStrategyState',updates:[{q:{_id:stateId,userId,lastCandle:state.lastCandle,entryOrderId:{$exists:false},side:{$exists:false}},u:{$set:{history:data.candles,lastCandle:cursor}}}]}),1);
    written(await prisma.$runCommandRaw({update:'AgentExecutions',updates:[{q:{_id:held.executionId,agentId:agent.id,state:execution.state},u:{$set:{state:'COMPLETED',reviewReason:execution.reviewReason ?? 'MISSED_LIVE_CANDLES',originalState:'REVIEW_REQUIRED',recovery}}}]}),1);
    // Release the exchange lock last so an interrupted release can retry through Resume.
    // Never delete unrelated or replacement locks.
    const remaining = await readRows<Lock>({find:'ExecutionLocks',filter:{_id:{$in:scopes},executionId:held.executionId}},3);
    written(await prisma.$runCommandRaw({delete:'ExecutionLocks',ordered:true,deletes:[scopes[0]!,scopes[2]!,scopes[1]!].filter(id=>remaining.some(l=>l._id===id)).map(id=>({q:{_id:id,executionId:held.executionId},limit:1}))}),remaining.length);
    appLog('info','agent.recovery.completed',{requestId,operation:'trpc.agents.statusChange'});
  } catch (error) {
    appLog('warn','agent.recovery.failed',{requestId,operation:'trpc.agents.statusChange',code:'PRECONDITION_FAILED'});
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({code:'CONFLICT',message:'Recovery could not be completed or verified. The agent remains paused. Wait for any recovery in progress, then retry or inspect account reconciliation.'});
  } finally {
    if (acquired) {
      try { written(await prisma.$runCommandRaw({delete:'ExecutionLocks',deletes:[{q:{_id:recoveryLock,executionId:recoveryId},limit:1}]}),1); }
      catch { throw new TRPCError({code:'CONFLICT',message:'The recovery lock could not be released. Keep the agent paused and inspect account reconciliation.'}); }
    }
  }
}

/** Paper data fetches cannot submit orders. Preserve the portfolio and retry from its cursor. */
export async function recoverPaperDataAgent(agent: Agent, userId: string, requestId?: string) {
  if(agent.userId!==userId || agent.status!=='PAUSED' || agent.executionMode!=='PAPER' || agent.type!=='CRYPTO' || agent.strategy!=='ALGO_TRADING')
    fail('Only a paused paper algorithm can recover a data-fetch failure.');
  const scope=`agent:${agent.id}`, recoveryLock=`recovery:${agent.id}`, recoveryId=`recover:${randomUUID()}`;
  let acquired=false;
  try {
    written(await prisma.$runCommandRaw({insert:'ExecutionLocks',documents:[{_id:recoveryLock,executionId:recoveryId,kind:'PAPER_DATA_RECOVERY',createdAt:{$date:new Date().toISOString()}}]}),1);
    acquired=true;
    const [held]=await readRows<Lock>({find:'ExecutionLocks',filter:{_id:scope}},1);
    if(!held)return;
    if(held.kind)fail('A paper operation or recovery lock needs review before resuming.');
    const [execution]=await readRows<Execution>({find:'AgentExecutions',filter:{_id:held.executionId,agentId:agent.id}},1);
    const previouslyRecovered=execution?.state==='COMPLETED' && execution.recovery?.outcome==='PAPER_DATA_FETCH_RETRY';
    if(!execution || (execution.state!=='REVIEW_REQUIRED' && !previouslyRecovered))fail('The paper execution is active or needs reconciliation.');
    const transientCodes=['DELTA_DATA_TIMEOUT','DELTA_DATA_NETWORK','DELTA_DATA_RATE_LIMIT','DELTA_DATA_UPSTREAM'];
    if(!previouslyRecovered && !transientCodes.includes(execution.reviewReason ?? '')) {
      const from=execution.startedAt?.$date, to=execution.finishedAt?.$date;
      if(!from || !to)fail('The paper failure could not be verified.');
      const notice=await prisma.notification.findFirst({where:{userId,agentId:agent.id,exchangeId:agent.exchangeId,code:'AGENT_REVIEW_REQUIRED',message:'Delta public data request failed or timed out.',createdAt:{gte:new Date(from!),lte:new Date(new Date(to!).getTime()+60_000)}},select:{id:true}});
      if(!notice)fail('Only a verified pre-save temporary market-data failure can recover automatically.');
    }
    const ownLocks=await readRows<Lock>({find:'ExecutionLocks',filter:{executionId:held.executionId}},3);
    if(ownLocks.length!==1 || ownLocks[0]?._id!==scope || (await readRows({find:'OrderIntents',filter:{executionId:held.executionId}},1)).length)
      fail('This paper run has unexpected locks or broker operations; review required.');
    if(!await prisma.agent.findFirst({where:{id:agent.id,userId,status:'PAUSED',updatedAt:agent.updatedAt},select:{id:true}}))fail('Agent settings changed; reload before resuming.');
    written(await prisma.$runCommandRaw({update:'AgentExecutions',updates:[{q:{_id:held.executionId,agentId:agent.id,state:execution.state},u:{$set:{state:'COMPLETED',originalState:'REVIEW_REQUIRED',recovery:{outcome:'PAPER_DATA_FETCH_RETRY',userId,verifiedAt:{$date:new Date().toISOString()},portfolioUnchanged:true}}}}]}),1);
    written(await prisma.$runCommandRaw({delete:'ExecutionLocks',deletes:[{q:{_id:scope,executionId:held.executionId},limit:1}]}),1);
    appLog('info','agent.recovery.completed',{requestId,operation:'trpc.agents.statusChange'});
  } catch(error) {
    appLog('warn','agent.recovery.failed',{requestId,operation:'trpc.agents.statusChange',code:'CONFLICT'});
    if(error instanceof TRPCError)throw error;
    throw new TRPCError({code:'CONFLICT',message:'Paper data recovery could not be verified. Keep the agent paused and inspect the retained execution record.'});
  } finally {
    if(acquired) {
      try {written(await prisma.$runCommandRaw({delete:'ExecutionLocks',deletes:[{q:{_id:recoveryLock,executionId:recoveryId},limit:1}]}),1);}
      catch {throw new TRPCError({code:'CONFLICT',message:'The paper recovery lock needs review. Keep the agent paused.'});}
    }
  }
}
