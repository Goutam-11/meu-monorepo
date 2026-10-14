import 'server-only';
import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { configuredCryptoAgentSchema } from '@/features/backtests/validation';
import { loadDeltaBacktestData } from '@/features/backtests/server/delta-data';
import { executionConnection, registerExecutionAccount } from '@/features/exchange/server/execution-account';
import { cryptoEntryMarket, fetchCryptoOpenOrders, normalizeCryptoPositions } from '../../../../../meu/schedulerService/src/brokers/crypto/cryptoRisk';

export const editCryptoAgentSchema = configuredCryptoAgentSchema.safeExtend({
  id: z.string().regex(/^[a-f0-9]{24}$/i),
  expectedUpdatedAt: z.string().datetime(),
  restartPaper: z.boolean().default(false),
});

export async function editCryptoAgent(userId: string, input: z.infer<typeof editCryptoAgentSchema>) {
  const agent = await prisma.agent.findFirst({where:{id:input.id,userId}});
  if (!agent) throw new TRPCError({code:'NOT_FOUND',message:'Agent not found'});
  if (agent.type !== 'CRYPTO' || agent.strategy !== 'ALGO_TRADING' || !['PAPER','LIVE'].includes(agent.executionMode ?? ''))
    throw new TRPCError({code:'PRECONDITION_FAILED',message:'Choose a saved crypto algorithm agent.'});
  if (agent.status !== 'PAUSED' || agent.updatedAt.toISOString() !== input.expectedUpdatedAt)
    throw new TRPCError({code:'CONFLICT',message:'Pause the agent and reload its latest settings before saving.'});
  if (input.exchangeId !== agent.exchangeId || input.mode !== agent.executionMode || input.config.symbol !== agent.market.symbols[0])
    throw new TRPCError({code:'BAD_REQUEST',message:'Ticker, exchange and execution mode stay with this agent. Create a new agent to change them.'});
  const raw = agent.strategyConfig as Record<string,unknown> | null;
  const previous = configuredCryptoAgentSchema.safeParse({name:agent.name,exchangeId:agent.exchangeId,mode:agent.executionMode,agentCycles:agent.market.agentCycles,config:{symbol:agent.market.symbols[0],timeframe:raw?.timeframe,strategy:raw,simulation:raw?.simulation}});
  if (!previous.success) throw new TRPCError({code:'PRECONDITION_FAILED',message:'The saved configuration is invalid. Create a replacement agent.'});
  const changed = JSON.stringify(previous.data.config) !== JSON.stringify(input.config);
  if (changed && agent.executionMode === 'PAPER' && !input.restartPaper)
    throw new TRPCError({code:'PRECONDITION_FAILED',message:'Confirm a fresh paper portfolio when changing strategy or risk settings. The previous portfolio is retained.'});

  const executionId = `edit:${randomUUID()}`;
  const attemptedLocks: string[] = [];
  const acquiredLocks: string[] = [];
  let saved = false;
  try {
    const claim = async (id:string) => {
      attemptedLocks.push(id);
      const result = await prisma.$runCommandRaw({insert:'ExecutionLocks',documents:[{_id:id,executionId,kind:'AGENT_EDIT',state:'PREPARING',createdAt:{$date:new Date().toISOString()}}]});
      if (result.ok !== 1 || result.n !== 1 || (Array.isArray(result.writeErrors) && result.writeErrors.length))
        throw new TRPCError({code:'CONFLICT',message:'An execution or retained lock is still using this agent or account. Wait for the run or reconcile it before editing.'});
      acquiredLocks.push(id);
    };
    const requireNoRecords = async(collection:string,filter:Prisma.InputJsonObject) => {
      const result=await prisma.$runCommandRaw({find:collection,filter,limit:1,batchSize:1});
      const cursor=result.cursor as {firstBatch?:unknown[];id?:number|{$numberLong:string}}|undefined;
      const cursorId=typeof cursor?.id==='object'?cursor.id.$numberLong:String(cursor?.id);
      if(result.ok!==1 || !Array.isArray(cursor?.firstBatch) || cursorId!=='0')throw new Error('Incomplete reconciliation read');
      if(cursor.firstBatch.length)throw new TRPCError({code:'PRECONDITION_FAILED',message:'This agent has unfinished execution, active ownership or an uncertain submission. Inspect account reconciliation before changing settings.'});
    };
    await claim(`agent:${agent.id}`);
    await requireNoRecords('AgentExecutions',{agentId:agent.id,state:{$ne:'COMPLETED'}});
    let contract = raw?.contract;
    if (changed && agent.executionMode === 'LIVE') {
      await claim(`exchange:${agent.exchangeId}`);
      const {exchange} = await executionConnection(agent.exchangeId,userId);
      const {accountKey} = await registerExecutionAccount(exchange,agent.exchangeId,userId);
      await claim(`account:${accountKey}`);
      await exchange.loadMarkets();
      const market = cryptoEntryMarket(exchange,input.config.symbol,'USD');
      const [positions,orders] = await Promise.all([exchange.fetchPositions(),fetchCryptoOpenOrders(exchange)]);
      if (normalizeCryptoPositions(exchange,positions).some(p=>p.symbol===market.symbol && Number(p.contracts)>0) || orders.some(o=>o.symbol===market.symbol))
        throw new TRPCError({code:'PRECONDITION_FAILED',message:'This ticker still has a position or pending order. Resolve its exposure on Delta before changing execution settings.'});
      for (const [collection,filter] of [
        ['CryptoPositionOwners',{accountKey,userId,agentId:agent.id,state:{$ne:'FLAT'}}],
        ['ManagedCryptoOrders',{accountKey,userId,agentId:agent.id,state:'SUBMITTING'}],
      ] as const) {
        await requireNoRecords(collection,filter);
      }
    }
    if (changed) {
      const interval={'15m':900,'1h':3600,'4h':14400,'1d':86400}[input.config.timeframe];
      const end=Math.floor(Date.now()/1000/interval)*interval;
      const warmup=Math.max(input.config.strategy.slowPeriod,input.config.strategy.lookback,input.config.strategy.atrPeriod,15)*5+2;
      contract=(await loadDeltaBacktestData({symbol:input.config.symbol,timeframe:input.config.timeframe,start:end-warmup*interval,end})).contract;
    }
    const config = input.config;
    const result = await prisma.agent.update({where:{id:agent.id,userId,status:'PAUSED',updatedAt:agent.updatedAt},data:{
      name:input.name,
      market:{symbols:agent.market.symbols,agentCycles:input.agentCycles},
      ...(changed ? {
        capital:{allocated:config.simulation.initialCapital,currency:'USD'},
        risk:{maxRiskPerTradePct:config.simulation.riskPerTradePct,maxDailyLossPct:config.simulation.maxDailyLossPct,maxOpenPositions:1,maxTradesPerDay:config.simulation.maxTradesPerDay,maxPositionsOpenedPerDay:config.simulation.maxPositionsOpenedPerDay},
        strategyConfig:{...config.strategy,timeframe:config.timeframe,simulation:config.simulation,contract,stateId:`${agent.id}:${randomUUID()}`,revisionAt:new Date().toISOString()} as Prisma.InputJsonValue,
        strategyStartedAt:null,nextRunAt:null,
      } : {}),
    }});
    saved = true;
    return result;
  } catch(error) {
    if(error instanceof TRPCError)throw error;
    throw new TRPCError({code:'CONFLICT',message:'Could not verify or save the edit. Reload the agent before retrying. It remains paused.'});
  } finally {
    if(attemptedLocks.length) {
      try {
        const result=await prisma.$runCommandRaw({delete:'ExecutionLocks',deletes:attemptedLocks.map(id=>({q:{_id:id,executionId},limit:1}))});
        if(result.ok!==1 || typeof result.n!=='number' || result.n<acquiredLocks.length || (Array.isArray(result.writeErrors)&&result.writeErrors.length))throw new Error('Lock release failed');
      } catch {
        throw new TRPCError({code:'CONFLICT',message:saved?'Settings were saved, but the edit lock could not be released. Keep the agent paused and inspect account reconciliation.':'The edit did not finish and its lock could not be released. Reload and inspect account reconciliation.'});
      }
    }
  }
}
