import {fetchManagedCryptoOrder} from '../binance/binanceExecution';
import { createHash, randomUUID } from 'node:crypto';
import type { Db } from 'mongodb';
import type { Exchange, MarketInterface, Order, Position } from 'ccxt';
import { z } from 'zod';
import { defaultAccountRisk, type AccountRiskLimits } from '../../../../../shared/trading/accountRisk';
export { defaultAccountRisk, type AccountRiskLimits } from '../../../../../shared/trading/accountRisk';
import { OrderRejectedError, type ExecutionSafety } from '../../execution/tradeGuard';
import { fetchCryptoOpenOrders, type CryptoRiskSnapshot } from './cryptoRisk';
import { COLLECTIONS } from "../../../../../shared/persistence/collections";

export const accountRiskSchema = z.object({
  maxOpenPositions: z.number().int().min(1).max(100),
  maxMarginPct: z.number().positive().max(100),
  maxDailyLossPct: z.number().positive().max(100),
  maxNotionalMultiple: z.number().positive().max(20),
});
export function deltaAccountKey(profileId: unknown, sandbox: boolean) {
  if (!((typeof profileId === 'string' && /^[1-9][0-9]*$/.test(profileId)) || (typeof profileId === 'number' && Number.isSafeInteger(profileId) && profileId > 0)))
    throw new OrderRejectedError('Delta account identity could not be verified');
  return `delta:${sandbox ? 'demo' : 'india'}:${createHash('sha256').update(String(profileId)).digest('hex')}`;
}
export async function identifyDeltaAccount(exchange: Exchange, sandbox: boolean) {
  if(exchange.id==='binance') {
    if(sandbox)throw new OrderRejectedError('Protected Binance tracking currently requires a production account');
    const profile=await exchange.request('account/info','sapi','GET');
    const uid=String(profile?.uid ?? '');
    if(!/^[1-9][0-9]*$/.test(uid))throw new OrderRejectedError('Binance UID could not be verified; account-info read permission is required');
    return `binance:usdm:${createHash('sha256').update(uid).digest('hex')}`;
  }
  if (exchange.id !== 'delta') throw new OrderRejectedError('Account ownership tracking supports Delta India and Binance USD-M');
  const profile = await exchange.request('profile', 'private', 'GET');
  if (profile?.success !== true) throw new OrderRejectedError('Delta profile read was not acknowledged');
  return deltaAccountKey(profile.result?.id, sandbox);
}
type Account = { _id: string; userId: string; limits: AccountRiskLimits; updatedAt: Date };
type Owner = { _id: string; accountKey: string; userId: string; agentId: string; symbol: string; productId: string; state: 'PENDING'|'OPEN'|'FLAT'|'REVIEW_REQUIRED'; orderRefs: string[]; periodId: string; contracts?:number;side?:string;entryPrice?:number;collateral?:number;unrealizedPnl?:number;lastVerifiedAt?:Date;updatedAt: Date };
type ManagedOrder = { _id: string; accountKey: string; userId: string; agentId: string; symbol: string; clientOrderId: string; brokerOrderId?: string; side: 'buy'|'sell'; amount: number; reduceOnly: boolean; conditional?:boolean; closePosition?:boolean; triggerPrice?:number; protectionType?:'STOP_MARKET'|'TAKE_PROFIT_MARKET'; state: 'SUBMITTING'|'ACCEPTED'|'REFUSED'; filled?:number;remaining?:number;brokerStatus?:string; createdAt: Date; updatedAt: Date };
type Period = { _id: string; accountKey: string; agentId: string; productId: string; startedAt: Date; endedAt?: Date };
export async function registerDeltaAccount(db: Db, accountKey: string, userId: string, exchangeId: string) {
  const accounts = db.collection<Account>(COLLECTIONS.BrokerAccounts);
  await accounts.updateOne({ _id: accountKey }, { $setOnInsert: { userId, limits: defaultAccountRisk, updatedAt: new Date() } }, { upsert: true });
  const account = await accounts.findOne({ _id: accountKey, userId });
  if (!account) throw new OrderRejectedError('This broker account is already registered to a different Meu user');
  accountRiskSchema.parse(account.limits);
  const previous = await db.collection<{_id:string;accountKey:string;userId:string}>(COLLECTIONS.BrokerAccountLinks).findOne({ _id:exchangeId });
  if (previous && (previous.accountKey !== accountKey || previous.userId !== userId)) throw new OrderRejectedError('Saved connection points to a different broker account; create a new connection and reconcile the old account');
  await db.collection<{_id:string;accountKey:string;userId:string;updatedAt:Date}>(COLLECTIONS.BrokerAccountLinks).updateOne({ _id: exchangeId }, { $set: { accountKey, userId, updatedAt: new Date() } }, { upsert: true });
  return account;
}

/** Called under the account execution lock. Broker observations remain authoritative. */
export function createCryptoAccountContext(db: Db, exchange: Exchange, input: { accountKey: string; userId: string; agentId: string; limits: AccountRiskLimits }): NonNullable<ExecutionSafety['crypto']> {
  const { accountKey, userId, agentId } = input;
  const limits = accountRiskSchema.parse(input.limits);
  const owners = db.collection<Owner>(COLLECTIONS.CryptoPositionOwners);
  const orders = db.collection<ManagedOrder>(COLLECTIONS.ManagedCryptoOrders);
  const periods = db.collection<Period>(COLLECTIONS.CryptoOwnershipPeriods);
  const prefix = `m${createHash('sha256').update(agentId).digest('hex').slice(0,12)}-`;
  const productId = (symbol: string) => {
    if(exchange.id==='binance') {const id=exchange.market(symbol).id;if(!id)throw new OrderRejectedError('Broker market identity unavailable');return id;}
    const id = exchange.market(symbol).numericId;
    if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) throw new OrderRejectedError('Verified Delta product identity required');
    return String(id);
  };
  const key = (symbol: string) => `${accountKey}:${productId(symbol)}`;

  async function verify(owner: Owner, positions: Position[], pending: Order[]) {
    if (owner.state === 'REVIEW_REQUIRED') throw new OrderRejectedError('Position ownership requires reconciliation');
    if (owner.orderRefs.length > 128) throw new OrderRejectedError('Position order history requires reconciliation');
    let net = 0, outstanding = false;
    for (const ref of owner.orderRefs) {
      const saved = await orders.findOne({ _id: ref, accountKey, agentId });
      if (!saved) throw new OrderRejectedError('Missing managed order ownership');
      if (saved.state === 'REFUSED') continue;
      if (saved.state !== 'ACCEPTED' || !saved.brokerOrderId) throw new OrderRejectedError('An entry or reduction has an unresolved submission');
      const actual = await fetchManagedCryptoOrder(exchange,saved.brokerOrderId,owner.symbol,saved.conditional,undefined,saved.amount);
      if (actual.id !== saved.brokerOrderId || actual.symbol !== owner.symbol || actual.clientOrderId !== saved.clientOrderId || !Number.isFinite(saved.amount) || saved.amount <= 0 || !Number.isFinite(actual.filled) || Number(actual.filled) < 0 || !Number.isFinite(actual.remaining) || Number(actual.remaining) < 0 || Math.abs(Number(actual.filled) + Number(actual.remaining) - saved.amount) > 1e-9 || actual.side !== saved.side || !Number.isFinite(actual.amount) || Math.abs(Number(actual.amount) - saved.amount) > 1e-9 || !['open','closed','canceled','expired','rejected'].includes(actual.status ?? ''))
        throw new OrderRejectedError('Broker order ownership or fill state could not be verified');
      await orders.updateOne({ _id:ref,agentId }, { $set:{filled:Number(actual.filled),remaining:Number(actual.remaining),brokerStatus:actual.status,updatedAt:new Date()} });
      net += Number(actual.filled) * (saved.side === 'buy' ? 1 : -1);
      outstanding ||= Number(actual.remaining) > 0 && actual.status === 'open';
    }
    const position = positions.find(p => p.symbol === owner.symbol && Number(p.contracts) > 0);
    const foreign = pending.some(o => o.symbol === owner.symbol && o.reduceOnly !== true && o.info?.reduce_only !== true && !owner.orderRefs.includes(`${accountKey}:${o.clientOrderId}`));
    if (foreign) throw new OrderRejectedError('A foreign pending entry exists on the owned ticker');
    if (position) {
      if (!['long','short'].includes(position.side ?? '')) throw new OrderRejectedError('Position direction could not be verified');
      const signed = Number(position.contracts) * (position.side === 'long' ? 1 : -1);
      if (!Number.isFinite(signed) || Math.abs(signed - net) > 1e-9) {
        await owners.updateOne({ _id: owner._id, agentId }, { $set: { state: 'REVIEW_REQUIRED', updatedAt: new Date() } });
        throw new OrderRejectedError('Broker position differs from agent-owned fills; no trade sent');
      }
      await owners.updateOne({ _id: owner._id, agentId }, { $set: { state: 'OPEN', contracts:Number(position.contracts),side:position.side,entryPrice:position.entryPrice,collateral:position.collateral,unrealizedPnl:position.unrealizedPnl,lastVerifiedAt:new Date(),updatedAt: new Date() } });
    } else if (!outstanding && pending.some(o => o.symbol === owner.symbol)) {
      if(exchange.id!=='binance' || pending.some(o=>o.symbol===owner.symbol&&!o.clientOrderId?.startsWith(prefix)))throw new OrderRejectedError('Flat ticker still has pending protection; reconcile before another entry');
      return true; // Keep ownership until the LLM cancels its stale conditional protection.
    } else if (!outstanding) {
      // Native protection or a manual close can leave the broker flat. No entry can fill later.
      await periods.updateOne({ _id: owner.periodId }, { $set: { endedAt: new Date() } });
      await owners.updateOne({ _id: owner._id, agentId }, { $set: { state: 'FLAT', contracts:0,lastVerifiedAt:new Date(),updatedAt: new Date() } });
    }
    return !!position || outstanding;
  }
  return {
    scopeSnapshot: async (snapshot: CryptoRiskSnapshot, market: MarketInterface) => {
      const records = await owners.find({ accountKey, userId, agentId, state: { $ne: 'FLAT' } }).limit(101).toArray();
      if (records.length > 100) throw new OrderRejectedError('Agent ownership snapshot exceeds reconciliation limit');
      const owned = new Set<string>();
      for (const record of records) if (await verify(record, snapshot.positions, snapshot.orders)) owned.add(record.symbol);
      const target = await owners.findOne({ _id: key(market.symbol) });
      const targetExposed = snapshot.openSymbols.has(market.symbol);
      if (target && target.agentId !== agentId && (target.state !== 'FLAT' || targetExposed)) throw new OrderRejectedError('Another agent owns this account/ticker');
      if (targetExposed && !owned.has(market.symbol)) throw new OrderRejectedError('An unowned account position or entry exists on this ticker');
      const history = await periods.find({ accountKey, $or: [{ endedAt: { $gte: new Date(snapshot.dayStart) } }, { endedAt: { $exists: false } }] }).limit(10001).toArray();
      if (history.length > 10000) throw new OrderRejectedError("Daily ownership history exceeds reconciliation limit");
      let agentLoss = 0;
      for (const event of snapshot.lossEvents) {
        const matches = event.productId ? history.filter(p => p.productId === event.productId && p.startedAt.getTime() <= event.timestamp && (!p.endedAt || p.endedAt.getTime() >= event.timestamp)) : [];
        // Unattributed debits stay conservative: charge the account and every agent.
        if (matches.length !== 1 || matches[0]!.agentId === agentId) agentLoss += event.amount;
      }
      let exposure = 0, notionalExposure = 0, marginUsed = 0, existingLossReserve = 0;
      for (const metric of snapshot.metrics) if (owned.has(metric.symbol)) {
        exposure += metric.exposure; notionalExposure += metric.notional; marginUsed += metric.margin; existingLossReserve += metric.lossReserve;
      }
      if (!Number.isFinite(snapshot.walletEquity) || snapshot.walletEquity <= 0) throw new OrderRejectedError('An authoritative settlement equity is required for account limits');
      const date = new Date(snapshot.dayStart).toISOString();
      const daily = db.collection<{ _id: string; equity: number }>(COLLECTIONS.CryptoAccountDailyEquity);
      await daily.updateOne({ _id: `${accountKey}:${date}` }, { $setOnInsert: { equity: snapshot.walletEquity } }, { upsert: true });
      const baseline = await daily.findOne({ _id: `${accountKey}:${date}` });
      if (!baseline || !Number.isFinite(baseline.equity) || baseline.equity <= 0) throw new OrderRejectedError('Account daily equity baseline is unavailable');
      return { ...snapshot, exposure, notionalExposure, marginUsed, existingLossReserve, openSymbols: owned, realizedLosses: agentLoss, dailyPnl: -agentLoss-exposure,
        account: { limits, equity: snapshot.walletEquity, dailyEquity: baseline.equity, realizedLosses: snapshot.realizedLosses, existingLossReserve: snapshot.existingLossReserve, marginUsed: snapshot.marginUsed, notionalExposure: snapshot.notionalExposure, openSymbols: snapshot.openSymbols } };
    },
    assertOwnsPosition: async (symbol, position) => {
      const owner = await owners.findOne({ _id: key(symbol), accountKey, agentId, userId });
      if (!owner || owner.state === 'FLAT') throw new OrderRejectedError('This agent does not own the position');
      await verify(owner, [position], await fetchCryptoOpenOrders(exchange));
    },
    recordSubmission: async (clientOrderId, symbol, side, amount, reduceOnly, protection) => {
      if (!clientOrderId.startsWith(prefix)) throw new OrderRejectedError('Invalid managed client order identity');
      let owner = await owners.findOne({ _id: key(symbol) });
      if (reduceOnly && (!owner || owner.agentId !== agentId || owner.state !== 'OPEN')) throw new OrderRejectedError('Only the verified position owner may reduce a position');
      const periodId = randomUUID();
      if (!owner || owner.state === 'FLAT') {
        const record: Owner = { _id:key(symbol), accountKey,userId,agentId,symbol,productId:productId(symbol),state:'PENDING',orderRefs:[],periodId,updatedAt:new Date() };
        if (owner) {
          const result = await owners.replaceOne({ _id:owner._id,state:'FLAT',agentId:owner.agentId },record);
          if (!result.modifiedCount) throw new OrderRejectedError('Ticker ownership changed');
        } else await owners.insertOne(record);
        await periods.insertOne({ _id:periodId,accountKey,agentId,productId:record.productId,startedAt:new Date() });
        owner = record;
      }
      if (owner.agentId !== agentId || owner.userId !== userId || owner.state === 'REVIEW_REQUIRED') throw new OrderRejectedError('Ticker is owned by another agent or needs review');
      if (owner.orderRefs.length >= 128) throw new OrderRejectedError('Position order history limit reached');
      const id = `${accountKey}:${clientOrderId}`;
      await orders.insertOne({ _id:id,accountKey,userId,agentId,symbol,clientOrderId,side,amount,reduceOnly,...protection,state:'SUBMITTING',createdAt:new Date(),updatedAt:new Date() });
      const result = await owners.updateOne({ _id:owner._id,agentId }, { $push:{orderRefs:id}, $set:{updatedAt:new Date()} });
      if (!result.modifiedCount) throw new Error('Managed order reservation could not be attached to its owner');
    },
    recordAccepted: async (clientOrderId, order) => {
      const saved = await orders.findOne({ _id:`${accountKey}:${clientOrderId}`, agentId, state:'SUBMITTING' });
      if (!saved || !order.id || (order.clientOrderId && order.clientOrderId !== clientOrderId) || (order.symbol && order.symbol !== saved.symbol)) throw new Error('Accepted managed order identity could not be verified');
      const updated = await orders.updateOne({ _id:`${accountKey}:${clientOrderId}`,agentId,state:'SUBMITTING' }, { $set:{brokerOrderId:order.id,state:'ACCEPTED',updatedAt:new Date()} });
      if (!updated.modifiedCount) throw new Error('Accepted broker order could not be persisted');
    },
    recordRefused: async clientOrderId => { await orders.updateOne({ _id:`${accountKey}:${clientOrderId}`,agentId,state:'SUBMITTING' }, { $set:{state:'REFUSED',updatedAt:new Date()} }); },
  };
}
