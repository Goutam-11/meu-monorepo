import 'server-only';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import prisma from '@/lib/db';
import { executionConnection, linkedExchangeIds } from '@/features/exchange/server/execution-account';
import { readRows } from '@/features/exchange/server/reconciliation';
import { cryptoStrategySettingsSchema } from '@/features/backtests/validation';
import { validateSizingPolicy, type AutomaticSizingDiagnostics } from '../../../../../shared/trading/sizing';
import { identifyDeltaAccount, accountRiskSchema } from '../../../../../meu/schedulerService/src/brokers/crypto/cryptoAccount';
import { cryptoDayStart, cryptoEntryMarket, cryptoEntrySnapshot, previewAutomaticCryptoLeverage, sizeCryptoEntry } from '../../../../../meu/schedulerService/src/brokers/crypto/cryptoRisk';
import { OrderRejectedError, type TradingPolicy } from '../../../../../meu/schedulerService/src/execution/tradeGuard';
import type { Exchange } from '../../../../../meu/schedulerService/node_modules/ccxt';

export const entryPreviewSchema = z.object({
  agentId: z.string().regex(/^[a-f0-9]{24}$/i),
  symbol: z.string().trim().min(2).max(100),
  side: z.enum(['buy', 'sell']),
  stopDistancePct: z.number().positive().max(50),
});
type Input = z.infer<typeof entryPreviewSchema>;
type Scenario = { symbol: string; side: 'buy'|'sell'; stopDistancePct: number; entryPrice: number; stopPrice: number };
export type EntryPreviewResult = {
  ok: boolean; provisional?: boolean; timestamp: string; notes: string[]; message?: string; scenario?: Scenario;
  sizing?: { amount: number; notional: number; marginRequired: number; riskAtStop: number; selectedLeverage: number; limitingConstraint: string; diagnostics?: AutomaticSizingDiagnostics };
};
const active = new Set<string>();
const canonical = (symbol: string) => symbol.split(':')[0].replace(/[^a-z0-9]/gi, '').toUpperCase();
function refuse(message: string): never { throw new TRPCError({ code: 'PRECONDITION_FAILED', message }); }

/** Separate instance, GET-only transport, and bounded work: never a broker or database write. */
export function boundPreviewReads(exchange: Exchange) {
  const request = exchange.request.bind(exchange);
  const started = Date.now();
  let requests = 0;
  exchange.request = async (...args: Parameters<Exchange['request']>) => {
    if ((args[2] ?? 'GET') !== 'GET' || ++requests > 32 || Date.now() - started > 45_000)
      throw new Error('Preview read budget exceeded');
    return request(...args);
  };
  return exchange;
}

export async function entryPreview(userId: string, input: Input): Promise<EntryPreviewResult> {
  entryPreviewSchema.parse(input);
  const agent = await prisma.agent.findFirst({ where: { id: input.agentId, userId } });
  if (!agent) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
  const notes = ['Read-only scenario. Start and every entry recheck broker state; this preview does not authorize or reserve an entry.'];
  let claimed: string | undefined;
  let scenario: Scenario | undefined;
  let provisional = false;
  try {
    if (agent.status !== 'PAUSED' || agent.type !== 'CRYPTO' || agent.executionMode === 'PAPER')
      refuse('Pause a saved live crypto agent before previewing authenticated broker sizing. Paper agents do not use broker credentials.');
    if (!agent.market.symbols.includes(input.symbol)) refuse('Choose a ticker saved on this agent.');
    const raw = agent.strategyConfig as Record<string, unknown> | null;
    const algorithm = agent.strategy === 'ALGO_TRADING' && agent.executionMode === 'LIVE';
    let sizing: TradingPolicy['sizing'];
    try { sizing = raw?.sizing ? validateSizingPolicy(raw.sizing) : undefined; }
    catch { refuse('Review the saved sizing limits before previewing.'); }
    if (!algorithm && !(agent.strategy === 'LLM_TRADING' && sizing?.mode === 'STOP_LOSS'))
      refuse('Preview supports live Delta algorithms and Delta/Binance native-stop LLM agents.');
    const risk = z.object({
      maxRiskPerTradePct: z.number().positive().max(100), maxDailyLossPct: z.number().positive().max(100),
      maxOpenPositions: z.number().int().min(1).max(100), maxTradesPerDay: z.number().int().min(1).max(1000),
      maxPositionsOpenedPerDay: z.number().int().min(1).max(1000),
    }).safeParse(agent.risk);
    if (!risk.success || !Number.isFinite(agent.capital.allocated) || agent.capital.allocated <= 0 || agent.capital.allocated > 1e8)
      refuse('Saved allocation or risk limits are invalid. Review the agent settings.');
    const policy: TradingPolicy = { symbols: agent.market.symbols, capital: agent.capital, risk: risk.data!, ...(sizing ? { sizing } : {}) };
    const parsed = algorithm ? cryptoStrategySettingsSchema.safeParse({ symbol: input.symbol, timeframe: raw?.timeframe, strategy: raw, simulation: raw?.simulation }) : undefined;
    if (algorithm && (!parsed?.success || agent.market.symbols.length !== 1)) refuse('Review the saved single-ticker algorithm settings.');
    if (parsed?.success) {
      const s = parsed.data.simulation;
      if (s.initialCapital !== policy.capital.allocated || s.riskPerTradePct !== policy.risk.maxRiskPerTradePct || s.maxDailyLossPct !== policy.risk.maxDailyLossPct || s.maxTradesPerDay !== policy.risk.maxTradesPerDay || s.maxPositionsOpenedPerDay !== policy.risk.maxPositionsOpenedPerDay || policy.risk.maxOpenPositions !== 1)
        refuse('Saved algorithm allocation and risk limits disagree. Review the agent settings.');
      if ((s.direction === 'long' && input.side === 'sell') || (s.direction === 'short' && input.side === 'buy')) refuse('This side is outside the saved algorithm direction.');
      notes.push('Algorithm stop distance is an explicit scenario, not a current ATR signal or trade recommendation.');
    }
    if (active.has(agent.exchangeId) || active.size >= 4) refuse('A preview is already running. Wait for it to finish.');
    active.add(agent.exchangeId); claimed = agent.exchangeId;
    const { exchange: connected } = await executionConnection(agent.exchangeId, userId);
    const exchange = boundPreviewReads(connected);
    if (algorithm && exchange.id !== 'delta') refuse('Live algorithm preview requires Delta India.');
    let accountKey: string;
    try { accountKey = await identifyDeltaAccount(exchange, false); }
    catch { refuse('Could not verify the physical broker account. Check the connection and read permissions.'); }
    const [accounts, links] = await Promise.all([
      readRows<{ userId: string; limits: unknown }>({ find: 'BrokerAccounts', filter: { _id: accountKey! } }, 1),
      readRows<{ userId: string; accountKey: string }>({ find: 'BrokerAccountLinks', filter: { _id: agent.exchangeId } }, 1),
    ]);
    if (!accounts[0] || !links[0]) refuse('Account safety limits are not initialized. Preview cannot register accounts; prepare or reconcile this connection first.');
    if (accounts[0].userId !== userId || links[0].userId !== userId || links[0].accountKey !== accountKey!) refuse('The saved connection and physical account ownership do not match. Reconcile the account.');
    const limits = accountRiskSchema.safeParse(accounts[0].limits);
    if (!limits.success) refuse('Saved account-wide risk limits are invalid. Review account settings.');
    const connectionIds = await linkedExchangeIds(accountKey!, userId);
    if (!connectionIds.includes(agent.exchangeId)) refuse('The saved connection is missing its verified account link.');
    const siblings = await prisma.agent.findMany({ where: { userId, exchangeId: { in: connectionIds }, status: 'RUNNING', id: { not: agent.id } }, take: 101, select: { executionMode: true, market: true } });
    if (siblings.length > 100) refuse('Too many linked agents to verify safely.');
    if (siblings.some(other => other.executionMode !== 'PAPER' && other.market.symbols.some(symbol => canonical(symbol) === canonical(input.symbol))))
      refuse('Another live agent covers this account/ticker. Pause it before previewing.');
    const lockFilter = { _id: { $in: [`account:${accountKey!}`, `agent:${agent.id}`, `recovery:${agent.id}`, ...connectionIds.map(id => `exchange:${id}`)] } };
    if ((await readRows({ find: 'ExecutionLocks', filter: lockFilter }, 104)).length) refuse('This account has an active or retained execution lock. Wait or reconcile before previewing.');
    await exchange.loadMarkets();
    const market = cryptoEntryMarket(exchange, input.symbol, policy.capital.currency);
    const productId = exchange.id === 'binance' ? market.id : String(market.numericId);
    if (!productId || (exchange.id === 'delta' && (!Number.isSafeInteger(Number(productId)) || Number(productId) <= 0))) refuse('Broker contract identity is unavailable.');
    if (parsed?.success) {
      const contract = raw?.contract as { symbol?: string; contractSize?: number; maintenanceMarginRate?: number } | undefined;
      if (!contract || contract.symbol !== input.symbol || contract.contractSize !== market.contractSize || contract.maintenanceMarginRate !== Number(market.info?.maintenance_margin) / 100)
        refuse('Saved algorithm contract terms changed or are missing. Review the agent configuration.');
      const s = parsed.data.simulation;
      policy.futures = { leverage: s.leverage, maxMarginPct: s.maxMarginPct, maxNotional: agent.capital.allocated * (s.maxExposureMultiple ?? s.leverage), maintenanceMarginRate: contract.maintenanceMarginRate!, feeBps: s.feeBps, slippageBps: s.slippageBps };
    }
    const dayStart = cryptoDayStart(exchange.id);
    const timezone = exchange.id === 'delta' ? 'Asia/Kolkata' : 'UTC';
    const day = new Date(dayStart + (exchange.id === 'delta' ? 330 * 60_000 : 0)).toISOString().slice(0, 10);
    const [baseline, owners, submitting, usage] = await Promise.all([
      readRows<{ equity: number }>({ find: 'CryptoAccountDailyEquity', filter: { _id: `${accountKey!}:${new Date(dayStart).toISOString()}` } }, 1),
      readRows<{ agentId: string; userId: string; state: string }>({ find: 'CryptoPositionOwners', filter: { _id: `${accountKey!}:${productId}` } }, 1),
      readRows({ find: 'ManagedCryptoOrders', filter: { accountKey: accountKey!, state: 'SUBMITTING' } }, 100),
      readRows<{ tradesReserved: number; positionsOpenedReserved: number }>({ find: 'AgentDailyRiskUsage', filter: { _id: `${agent.id}:${timezone}:${day}` } }, 1),
    ]);
    if (baseline[0] && (!Number.isFinite(baseline[0].equity) || baseline[0].equity <= 0))
      refuse('Today’s saved account equity baseline is invalid. Reconcile account safety before previewing.');
    if (owners[0] && (owners[0].state !== 'FLAT' || owners[0].userId !== userId))
      refuse(owners[0].agentId !== agent.id ? 'Another agent owns this account/ticker. Reconcile its ownership first.' : 'This ticker has unresolved tracked ownership. Reconcile it before previewing a new entry.');
    if (submitting.length) refuse('An account order submission is unresolved. Reconcile it before previewing.');
    if (usage[0]) {
      if (![usage[0].tradesReserved, usage[0].positionsOpenedReserved].every(n => Number.isSafeInteger(n) && n >= 0)) refuse('Daily entry usage cannot be verified.');
      if (usage[0].tradesReserved >= policy.risk.maxTradesPerDay || usage[0].positionsOpenedReserved >= policy.risk.maxPositionsOpenedPerDay) refuse('The saved daily entry or position-opening limit is exhausted.');
    }
    const leverage = policy.sizing?.leverage ?? policy.futures!.leverage;
    const automatic = policy.sizing?.leverageMode === 'AUTO' || parsed?.success && parsed.data.simulation.leverageMode === 'AUTO';
    // Only target settings are hypothetical; positions and unrelated pending orders
    // keep their actual broker settings and full collateral/loss reserves.
    let actualLeverage: { marginMode?: string; longLeverage?: number; shortLeverage?: number } | undefined;
    const hypothesis = new Proxy(exchange, { get(target, key, receiver) {
      if (key === 'fetchLeverage') return async (symbol: string) => {
        const actual = await target.fetchLeverage(symbol);
        if (target.market(symbol).symbol !== market.symbol) return actual;
        const mode = actual.marginMode ? actual : { ...actual, ...(await target.fetchMarginMode(symbol)) };
        actualLeverage = mode;
        return { ...actual, marginMode: 'isolated', longLeverage: leverage, shortLeverage: leverage };
      };
      if (key === 'fetchLeverages') return async (symbols: string[]) => {
        const values = await target.fetchLeverages(symbols);
        const actual = values[market.symbol];
        if (actual) { actualLeverage = actual; values[market.symbol] = { ...actual, marginMode: 'isolated', longLeverage: leverage, shortLeverage: leverage }; }
        return values;
      };
      if (key === 'request') return async (...args: Parameters<Exchange['request']>) => {
        const result = await target.request(...args);
        if (target.id === 'delta' && args[0] === 'users/trading_preferences' && result?.success === true && result.result?.default_auto_topup !== false) {
          notes.push('Sizing assumes default automatic margin top-up is disabled. This setting has not been applied.');
          return { ...result, result: { ...result.result, default_auto_topup: false } };
        }
        return result;
      };
      return Reflect.get(target, key, receiver);
    } });
    let snapshot;
    let quote;
    try { [snapshot, quote] = await Promise.all([cryptoEntrySnapshot(hypothesis, market, policy), exchange.fetchTicker(market.symbol)]); }
    catch { refuse('Could not verify a complete fresh broker snapshot and quote within the read budget. Check isolated positions, fee currency, account mode and connection, then retry.'); }
    if (snapshot!.dayStart !== dayStart) refuse('The broker market day changed during the preview. Refresh the preview.');
    if (snapshot!.positions.some(p => p.symbol === market.symbol && Number(p.contracts) > 0) || snapshot!.orders.some(o => o.symbol === market.symbol)) refuse('The broker ticker must be flat with no pending entry or protection orders.');
    if (!Number.isFinite(snapshot!.walletEquity) || snapshot!.walletEquity <= 0) refuse('Authoritative settlement wallet equity is unavailable.');
    provisional = !baseline[0];
    if (provisional) notes.push('Provisional scenario: today’s account equity baseline has not been initialized. Current verified wallet equity is assumed as the day-start equity for this calculation only. A guarded run initializes the actual baseline; entry checks can produce a different result.');
    snapshot!.account = { limits: limits.data!, equity: snapshot!.walletEquity, dailyEquity: baseline[0]?.equity ?? snapshot!.walletEquity, realizedLosses: snapshot!.realizedLosses, existingLossReserve: snapshot!.existingLossReserve, marginUsed: snapshot!.marginUsed, notionalExposure: snapshot!.notionalExposure, openSymbols: snapshot!.openSymbols };
    notes.push('Conservative agent budget: all account losses, positions and pending-entry reserves count against this agent as well as the saved account-wide limits.');
    const bid = Number(quote!.bid), ask = Number(quote!.ask);
    if (![bid, ask].every(n => Number.isFinite(n) && n > 0) || ask < bid || quote!.timestamp != null && (!Number.isFinite(quote!.timestamp) || Math.abs(Date.now() - quote!.timestamp) > 60_000)) refuse('A fresh, valid bid and ask are required.');
    if (quote!.timestamp == null) notes.push('The freshly fetched quote has no broker timestamp; its age cannot be independently verified.');
    const quotedEntry = exchange.id === 'binance' ? (input.side === 'buy' ? ask : bid) : (input.side === 'buy' ? bid : ask);
    notes.push(exchange.id === 'binance' ? 'Entry assumes a marketable IOC limit: buy at ask or sell at bid, before the saved slippage buffer.' : 'Entry assumes a passive post-only limit: buy at bid or sell at ask; fills are not guaranteed.');
    const entryPrice = Number(exchange.priceToPrecision(market.symbol, quotedEntry));
    const stopPrice = Number(exchange.priceToPrecision(market.symbol, entryPrice * (input.side === 'buy' ? 1 - input.stopDistancePct / 100 : 1 + input.stopDistancePct / 100)));
    scenario = { symbol: input.symbol, side: input.side, stopDistancePct: input.stopDistancePct, entryPrice, stopPrice };
    const selected = automatic ? previewAutomaticCryptoLeverage(hypothesis, market, policy, snapshot!, entryPrice, { side: input.side, stopPrice }, parsed?.success ? parsed.data.simulation.autoSizing : policy.sizing?.autoSizing) : undefined;
    const sized = selected?.sizing ?? sizeCryptoEntry(hypothesis, market, policy, snapshot!, entryPrice, undefined, { side: input.side, stopPrice });
    if (!('riskAtStop' in sized) || !('marginRequired' in sized) || !('limitingConstraint' in sized)) refuse('Protected entry sizing is unavailable.');
    const selectedLeverage = selected?.leverage ?? leverage;
    if (actualLeverage?.marginMode !== 'isolated' || actualLeverage.longLeverage !== selectedLeverage || actualLeverage.shortLeverage !== selectedLeverage)
      notes.push(`Sizing assumes isolated ${selectedLeverage}× leverage. The preview has not applied broker settings; Start or entry preparation must verify them.`);
    if ((await readRows({ find: 'ExecutionLocks', filter: lockFilter }, 104)).length || !await prisma.agent.findFirst({ where: { id: agent.id, userId, status: 'PAUSED', updatedAt: agent.updatedAt }, select: { id: true } })) refuse('Account or agent state changed during the preview. Refresh before using these numbers.');
    return { ok: true, provisional, timestamp: new Date().toISOString(), notes, scenario, sizing: { amount: sized.amount, notional: sized.notional, marginRequired: Number(sized.marginRequired), riskAtStop: Number(sized.riskAtStop), selectedLeverage, limitingConstraint: String(sized.limitingConstraint), ...(selected ? { diagnostics: selected.diagnostics } : {}) } };
  } catch (error) {
    return { ok: false, provisional, timestamp: new Date().toISOString(), notes, ...(scenario ? { scenario } : {}), message: error instanceof TRPCError ? error.message : scenario && error instanceof OrderRejectedError ? error.message : 'Could not safely verify this preview. Check the saved account and connection, then retry.' };
  } finally { if (claimed) active.delete(claimed); }
}
