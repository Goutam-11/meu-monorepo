import {prepareBinanceAccount} from '../../../../../meu/schedulerService/src/brokers/binance/binanceExecution';
import 'server-only';
import {validateSizingPolicy} from '../../../../../shared/trading/sizing';
import { readRows } from '@/features/exchange/server/reconciliation';
import { recoverDeltaAgent } from './recover-delta-agent';
import { registerExecutionAccount, linkedExchangeIds } from '@/features/exchange/server/execution-account';
import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import type { Agent } from '@/generated/prisma/client';
import prisma from '@/lib/db';
import { decryptSecret } from '@/lib/security/encryption';
import { appLog } from '@/lib/logging/app-logger';
import { cryptoStrategySettingsSchema } from '@/features/backtests/validation';
import { configureCryptoExchange, exchangeMap } from '../../../../../meu/schedulerService/src/config/config';
import { prepareDeltaStrategyAccount } from '../../../../../meu/schedulerService/src/brokers/delta/deltaStart';
import { cryptoEntryMarket, fetchCryptoLeverage } from '../../../../../meu/schedulerService/src/brokers/crypto/cryptoRisk';
import { OrderRejectedError } from '../../../../../meu/schedulerService/src/execution/tradeGuard';
import { COLLECTIONS } from "../../../../../shared/persistence/collections";

export async function startDeltaAgent(agent: Agent, userId: string, requestId?: string) {
  const raw = agent.strategyConfig as Record<string, unknown> | null;
  let sizing;
  try { sizing = raw?.sizing ? validateSizingPolicy(raw.sizing) : undefined; }
  catch { throw new TRPCError({code:'PRECONDITION_FAILED',message:'Review the saved sizing policy before starting.'}); }
  const protectedLlm = agent.strategy === 'LLM_TRADING' && sizing?.mode === 'STOP_LOSS' && agent.executionMode !== 'PAPER';
  const algorithm = agent.strategy === 'ALGO_TRADING' && agent.executionMode === 'LIVE';
  if (agent.status !== 'PAUSED' || agent.type !== 'CRYPTO' || (!algorithm && !protectedLlm))
    throw new TRPCError({code:'PRECONDITION_FAILED',message:'Only a paused live Delta algorithm or native-stop LLM agent can prepare these settings.'});
  const parsed = cryptoStrategySettingsSchema.safeParse({symbol:agent.market.symbols[0],timeframe:raw?.timeframe,strategy:raw,simulation:raw?.simulation});
  if (agent.market.symbols.length !== 1 || !['USD','USDT'].includes(agent.capital.currency) ||
      (algorithm && (!parsed.success || parsed.data.simulation.initialCapital !== agent.capital.allocated || parsed.data.simulation.riskPerTradePct !== agent.risk.maxRiskPerTradePct || parsed.data.simulation.maxDailyLossPct !== agent.risk.maxDailyLossPct || parsed.data.simulation.maxTradesPerDay !== agent.risk.maxTradesPerDay || parsed.data.simulation.maxPositionsOpenedPerDay !== agent.risk.maxPositionsOpenedPerDay || agent.risk.maxOpenPositions !== 1)))
    throw new TRPCError({code:'PRECONDITION_FAILED',message:'Review the saved strategy, allocation and single-ticker configuration before starting.'});
  const symbol = agent.market.symbols[0]!;
  const automaticLeverage = (algorithm && parsed.success && parsed.data.simulation.leverageMode === 'AUTO') || (protectedLlm && sizing?.leverageMode === 'AUTO');
  const leverage = protectedLlm ? sizing!.leverage : parsed.success ? parsed.data.simulation.leverage : 0;
  const connection = await prisma.exchange.findFirst({ where: { id: agent.exchangeId, userId }, select: { name: true, sandbox: true, apiKey: true, secret: true } });
  if (!connection || !['DELTA','BINANCE'].includes(connection.name.toUpperCase()) || (algorithm && connection.name.toUpperCase()!=='DELTA') || connection.sandbox || !connection.apiKey || !connection.secret)
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'A production Delta India or Binance USD-M connection with saved keys is required.' });
  const lockId = `exchange:${agent.exchangeId}`, executionId = `start:${randomUUID()}`;
  const claimExchange = async () => {
    const inserted = await prisma.$runCommandRaw({ insert: COLLECTIONS.ExecutionLocks, documents: [{ _id: lockId, executionId, kind: 'START_PREFLIGHT', state: 'PREPARING', createdAt: { $date: new Date().toISOString() } }] });
    if (inserted.ok !== 1 || inserted.n !== 1 || (Array.isArray(inserted.writeErrors) && inserted.writeErrors.length)) throw new Error('Lock not acquired');
  };
  try { await claimExchange(); }
  catch {
    // Recover only this agent's worker lock. A different ticker/agent may
    // own the account lock; passing the new agent ID gives a misleading error.
    const [holding] = await readRows<{executionId:string;kind?:string}>({find:COLLECTIONS.ExecutionLocks,filter:{_id:lockId}},1);
    if (!holding || holding.kind || !holding.executionId.startsWith(`${agent.id}-`))
      throw new TRPCError({code:'CONFLICT',message: holding?.kind ? 'Delta account preparation or recovery is in progress. Wait for it to finish, then retry Start.' : holding ? 'Another agent has a running or retained execution on this Delta connection. Wait for its run, or recover/reconcile that agent before starting. Different tickers share account margin and execution safety.' : 'Could not acquire the Delta execution lock. Retry Start; if this persists, check the database connection.'});
    if (protectedLlm) throw new TRPCError({code:'CONFLICT',message:'This LLM execution has a retained lock. Open Exchanges → account recovery, scan the broker account, then verify and recover before starting.'});
    await recoverDeltaAgent(agent, userId, requestId);
    try { await claimExchange(); }
    catch { throw new TRPCError({ code:'CONFLICT', message:'Recovery finished, but the exchange is now busy. The agent remains paused; retry Resume after the current operation.' }); }
  }
  const ownedLocks = [lockId];
  let connectedIds = [agent.exchangeId];
  let writeAttempted = false, verified = false;
  let activatedVersion: Date | undefined;
  const startedAt = Date.now();
  try {
    if ((await readRows({find:COLLECTIONS.ExecutionLocks,filter:{_id:`recovery:${agent.id}`}},1)).length)
      throw new TRPCError({code:'CONFLICT',message:'A recovery is still running or its lock needs review. Keep the agent paused and inspect account reconciliation.'});
    const assertPaused = async (accountWide = false) => {
      if (!await prisma.agent.findFirst({ where: { id: agent.id, userId, status: 'PAUSED', updatedAt: agent.updatedAt }, select: { id: true } }))
        throw new TRPCError({ code: 'CONFLICT', message: 'Agent state changed during preflight. Review it and try again.' });
      const others = await prisma.agent.findMany({ where: { userId, exchangeId: { in: connectedIds }, status: 'RUNNING', id: { not: agent.id }, OR: [{ executionMode: null }, { executionMode: { isSet: false } }, { executionMode: { not: 'PAPER' } }] }, select: { market: true } });
      const canonical = (symbol: string) => symbol.split(':')[0].replace(/[^a-z0-9]/gi, '').toUpperCase();
      if (others.some(other => other.market.symbols.some(otherSymbol => canonical(otherSymbol) === canonical(symbol))))
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Pause the other live agent covering this symbol first.' });
      if (accountWide && others.length)
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Pause other live agents only while changing account-wide margin mode. With isolated mode already set, different tickers can run together.' });
      return others.length === 0;
    };
    await assertPaused();
    const exchange = new exchangeMap[connection.name.toUpperCase() as "DELTA"|"BINANCE"]({ apiKey: decryptSecret(connection.apiKey), secret: decryptSecret(connection.secret), timeout: 15000, enableRateLimit: true, verbose: false });
    configureCryptoExchange(exchange, false);
    await exchange.loadMarkets();
    const registered = await registerExecutionAccount(exchange, agent.exchangeId, userId);
    connectedIds = await linkedExchangeIds(registered.accountKey, userId);
    const accountLock = `account:${registered.accountKey}`;
    const accountClaim = await prisma.$runCommandRaw({ insert: COLLECTIONS.ExecutionLocks, documents: [{ _id: accountLock, executionId, kind: 'START_PREFLIGHT', state: 'PREPARING', createdAt: { $date: new Date().toISOString() } }] });
    if (accountClaim.ok !== 1 || accountClaim.n !== 1 || (Array.isArray(accountClaim.writeErrors) && accountClaim.writeErrors.length))
      throw new TRPCError({ code: 'CONFLICT', message: 'This broker account is busy or has an unresolved execution. Another saved connection may refer to the same account.' });
    ownedLocks.push(accountLock);
    const mayChangeAccountMode = await assertPaused();
    const market = cryptoEntryMarket(exchange, symbol, agent.capital.currency);
    const contract = raw?.contract as Record<string, unknown> | undefined;
    if (algorithm && (!contract || contract.symbol !== symbol || market.contractSize !== contract.contractSize || Number(market.info?.maintenance_margin) / 100 !== contract.maintenanceMarginRate))
      throw new OrderRejectedError('Delta contract terms changed or are missing. Create a fresh agent configuration.');
    let startLeverage=leverage;
    if(automaticLeverage) {
      const current=await fetchCryptoLeverage(exchange,market.symbol);
      if(!Number.isSafeInteger(current.longLeverage)||current.longLeverage!==current.shortLeverage||current.longLeverage<1||current.longLeverage>leverage)
        startLeverage=1;
      else startLeverage=Number(current.longLeverage);
    }
    if(exchange.id==='binance')await prepareBinanceAccount(exchange,symbol,startLeverage,async()=>{await assertPaused();writeAttempted=true;});
    else await prepareDeltaStrategyAccount(exchange, symbol, startLeverage, {
      allowAccountModeChange: mayChangeAccountMode,
      requireFlatSymbol: agent.strategyStartedAt === null,
      beforeWrite: async change => { await assertPaused(change === 'marginMode'); writeAttempted = true; },
    });
    verified = true;
    await assertPaused();
    const result = await prisma.agent.update({ where: { id: agent.id, userId, status: 'PAUSED', updatedAt: agent.updatedAt }, data: { status: 'RUNNING', strategyStartedAt: new Date(), nextRunAt: null } });
    activatedVersion = result.updatedAt;
    appLog('info', 'agent.start.preflight.completed', { requestId, operation: 'trpc.agents.statusChange', durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    appLog('warn', 'agent.start.preflight.failed', { requestId, operation: 'trpc.agents.statusChange', durationMs: Date.now() - startedAt, code: 'PRECONDITION_FAILED' });
    if (writeAttempted && !verified) {
      try {
        await prisma.$runCommandRaw({ update: COLLECTIONS.ExecutionLocks, updates: [{ q: { _id: { $in: ownedLocks }, executionId }, multi: true, u: { $set: { state: 'REVIEW_REQUIRED' } } }] });
      } catch { appLog('error', 'agent.start.preflight.failed', { requestId, operation: 'trpc.agents.statusChange', code: 'CONFLICT' }); }
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Broker settings could not be verified after an update attempt. The agent remains paused and the account lock is retained. Reconcile margin/leverage and the execution lock before retrying.' });
    }
    if (error instanceof TRPCError) throw error;
    if (error instanceof OrderRejectedError) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: error.message });
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Could not verify broker settings. The agent remains paused. Check the connection and account, then retry.' });
  } finally {
    if (!writeAttempted || verified) {
      try {
        const released = await prisma.$runCommandRaw({ delete: COLLECTIONS.ExecutionLocks, deletes: ownedLocks.map(key => ({ q: { _id: key, executionId }, limit: 1 })) });
        if (released.ok !== 1 || released.n !== ownedLocks.length || (Array.isArray(released.writeErrors) && released.writeErrors.length)) throw new Error('Lock not released');
      } catch {
        // Never let a successfully prepared agent execute behind an unresolved start lock.
        if (activatedVersion) await prisma.agent.updateMany({ where: { id: agent.id, userId, status: 'RUNNING', updatedAt: activatedVersion }, data: { status: 'PAUSED', nextRunAt: null } });
        appLog('error', 'agent.start.preflight.failed', { requestId, operation: 'trpc.agents.statusChange', code: 'CONFLICT' });
        throw new TRPCError({ code: 'CONFLICT', message: 'Could not release the start lock. Review agent status and the account lock before retrying.' });
      }
    }
  }
}
