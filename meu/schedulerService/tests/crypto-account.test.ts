import { test, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import type { Db } from 'mongodb';
import type { Exchange, MarketInterface, Order, Position } from 'ccxt';
import { createCryptoAccountContext, deltaAccountKey, registerDeltaAccount, defaultAccountRisk } from '../src/brokers/crypto/cryptoAccount';
import { sizeCryptoEntry, type CryptoRiskSnapshot } from '../src/brokers/crypto/cryptoRisk';
import type { TradingPolicy } from '../src/execution/tradeGuard';
import { COLLECTIONS } from "../../../shared/persistence/collections";

type Row = Record<string, any>;
function matches(row: Row, query: Row): boolean {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') return value.some((q: Row) => matches(row, q));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('$ne' in value) return row[key] !== value.$ne;
      if ('$gte' in value) return row[key] >= value.$gte;
      if ('$exists' in value) return (row[key] !== undefined) === value.$exists;
    }
    return row[key] === value;
  });
}
function database() {
  const collections = new Map<string, Row[]>();
  let failOrders = false;
  const rows = (name: string) => { if (!collections.has(name)) collections.set(name, []); return collections.get(name)!; };
  const db = { collection: (name: string) => ({
    findOne: async (query: Row) => rows(name).find(r => matches(r, query)) ?? null,
    find: (query: Row) => { let cap = Infinity; const cursor = { limit: (n: number) => { cap = n; return cursor; }, toArray: async () => rows(name).filter(r => matches(r, query)).slice(0, cap) }; return cursor; },
    insertOne: async (record: Row) => { if (failOrders && name === COLLECTIONS.ManagedCryptoOrders) throw new Error('Unavailable persistence'); if (rows(name).some(r => r._id === record._id)) throw new Error('Duplicate'); rows(name).push(record); return { acknowledged: true }; },
    updateOne: async (query: Row, update: Row, options?: Row) => {
      let row = rows(name).find(r => matches(r, query)); let inserted = false;
      if (!row && options?.upsert) { row = { ...query, ...update.$setOnInsert }; rows(name).push(row!); inserted = true; }
      if (!row) return { modifiedCount: 0 };
      Object.assign(row, update.$set);
      for (const [key, value] of Object.entries(update.$push ?? {})) (row[key] ??= []).push(value);
      return { modifiedCount: inserted ? 0 : 1 };
    },
    replaceOne: async (query: Row, record: Row) => { const i = rows(name).findIndex(r => matches(r, query)); if (i < 0) return { modifiedCount: 0 }; rows(name)[i] = record; return { modifiedCount: 1 }; },
  }) } as unknown as Db;
  return { db, rows, failOrderWrites: () => { failOrders = true; } };
}
const symbol = 'XRP/USD:USD', otherSymbol = 'ETH/USD:USD';
const market = { numericId: 1, symbol, contractSize: 1, settle:'USD', quote:'USD', linear:true, contract:true, swap:true, active:true, maker:0,taker:0,limits:{amount:{min:1,max:10000},cost:{min:0}},info:{} } as unknown as MarketInterface;
function fixture() {
  const store = database();
  const brokerOrders = new Map<string, Order>();
  const exchange = { id:'delta', market: (s: string) => s === otherSymbol ? {...market, symbol:s,numericId:2} : market,
    amountToPrecision: (_symbol: string, n: number) => String(Math.floor(n)),
    fetchOrder: async (id: string) => brokerOrders.get(id)!,
    request: async () => ({success:true,result:[],meta:{after:null}}),
  } as unknown as Exchange;
  const context = (agentId = 'agent-a') => createCryptoAccountContext(store.db, exchange, {accountKey:'account',userId:'user',agentId,limits:defaultAccountRisk});
  const client = (agentId = 'agent-a', suffix = 'entry') => `m${createHash('sha256').update(agentId).digest('hex').slice(0,12)}-${suffix}`;
  const snapshot = (patch: Partial<CryptoRiskSnapshot> = {}): CryptoRiskSnapshot => ({
    positions:[],orders:[],exposure:0,notionalExposure:0,marginUsed:0,existingLossReserve:0,availableFunds:1000,openSymbols:new Set(),dailyPnl:0,realizedLosses:0,
    leverage:{longLeverage:2,shortLeverage:2,marginMode:'isolated'} as never,walletEquity:1000,dayStart:Date.now()-3600000,lossEvents:[],metrics:[],...patch,
  });
  const accepted = async (agentId = 'agent-a', filled = 2, remaining = 0, status = 'closed', side: 'buy'|'sell' = 'buy', reduceOnly = false, suffix = 'entry') => {
    const ctx = context(agentId), id = client(agentId,suffix);
    await ctx.recordSubmission(id,symbol,side,filled+remaining,reduceOnly);
    const order = {id:suffix,symbol,clientOrderId:id,filled,remaining,status,side,amount:filled+remaining} as Order;
    brokerOrders.set(suffix, order); await ctx.recordAccepted(id,order);
    return ctx;
  };
  const position = (contracts = 2) => ({symbol,contracts,side:'long',entryPrice:10,collateral:10,unrealizedPnl:0}) as Position;
  return {...store,exchange,brokerOrders,context,client,snapshot,accepted,position};
}

test('duplicate Delta connections map to one broker identity; demo and India stay separate', async () => {
  expect(deltaAccountKey(42,false)).toBe(deltaAccountKey('42',false));
  expect(deltaAccountKey(42,true)).not.toBe(deltaAccountKey(42,false));
  for (const bad of ['0','-1','1.2',null,0,NaN]) expect(() => deltaAccountKey(bad,false)).toThrow();
  const f = fixture(); await registerDeltaAccount(f.db,'account','user','connection-a');
  await registerDeltaAccount(f.db,'account','user','connection-b');
  expect(f.rows(COLLECTIONS.BrokerAccounts)).toHaveLength(1); expect(f.rows(COLLECTIONS.BrokerAccountLinks)).toHaveLength(2);
  await expect(registerDeltaAccount(f.db,'account','other-user','foreign')).rejects.toThrow('different Meu user');
  expect(f.rows(COLLECTIONS.BrokerAccountLinks)).toHaveLength(2);
  await expect(registerDeltaAccount(f.db,'changed-account','user','connection-a')).rejects.toThrow('different broker account');
  expect(f.rows(COLLECTIONS.BrokerAccountLinks)[0]?.accountKey).toBe('account');
});
test('manual positions and pending entries cannot be adopted or reduced', async () => {
  const f = fixture(), ctx = f.context(), pos = f.position();
  await expect(ctx.scopeSnapshot(f.snapshot({positions:[pos],openSymbols:new Set([symbol])}),market)).rejects.toThrow('unowned');
  await expect(ctx.scopeSnapshot(f.snapshot({orders:[{symbol} as Order],openSymbols:new Set([symbol])}),market)).rejects.toThrow('unowned');
  await expect(ctx.assertOwnsPosition(symbol,pos)).rejects.toThrow('does not own');
  expect(f.rows(COLLECTIONS.ManagedCryptoOrders)).toHaveLength(0);
});
test('submission is reserved durably before broker acknowledgement and uncertain entries never become available', async () => {
  const f = fixture(), ctx = f.context(); await ctx.recordSubmission(f.client(),symbol,'buy',2,false);
  expect(f.rows(COLLECTIONS.ManagedCryptoOrders)[0]?.state).toBe('SUBMITTING');
  await expect(ctx.scopeSnapshot(f.snapshot(),market)).rejects.toThrow('unresolved submission');
  await expect(f.context('agent-b').recordSubmission(f.client('agent-b'),symbol,'buy',2,false)).rejects.toThrow('another agent');
  await expect(ctx.recordAccepted(f.client(),{id:'wrong',clientOrderId:'foreign',symbol} as Order)).rejects.toThrow('identity');
});
test('partial fills verify owned quantity and retain the outstanding entry', async () => {
  const f = fixture(), ctx = await f.accepted('agent-a',1,1,'open');
  const result = await ctx.scopeSnapshot(f.snapshot({positions:[f.position(1)],openSymbols:new Set([symbol]),metrics:[{symbol,exposure:20,notional:20,margin:10,lossReserve:10}]}),market);
  expect(result.openSymbols.has(symbol)).toBe(true); expect(f.rows(COLLECTIONS.CryptoPositionOwners)[0]?.contracts).toBe(1);
  expect(f.rows(COLLECTIONS.ManagedCryptoOrders)[0]?.remaining).toBe(1);
  await expect(f.context('agent-b').scopeSnapshot(f.snapshot({positions:[f.position(1)],openSymbols:new Set([symbol])}),market)).rejects.toThrow('Another agent owns');
});
test('incomplete broker fill evidence cannot release ownership or authorize reductions', async () => {
  for (const patch of [{amount:undefined},{side:undefined},{filled:1,remaining:0}]) {
    const f = fixture(), ctx = await f.accepted();
    Object.assign(f.brokerOrders.get('entry')!,patch);
    await expect(ctx.scopeSnapshot(f.snapshot(),market)).rejects.toThrow('fill state');
    expect(f.rows(COLLECTIONS.CryptoPositionOwners)[0]?.state).not.toBe('FLAT');
    await expect(ctx.assertOwnsPosition(symbol,f.position())).rejects.toThrow('fill state');
    expect(f.rows(COLLECTIONS.CryptoOwnershipPeriods)[0]?.endedAt).toBeUndefined();
  }
});
test('manual changes to owned quantity require review rather than silently adopting fills', async () => {
  const f = fixture(), ctx = await f.accepted();
  await expect(ctx.scopeSnapshot(f.snapshot({positions:[f.position(3)],openSymbols:new Set([symbol])}),market)).rejects.toThrow('differs');
  expect(f.rows(COLLECTIONS.CryptoPositionOwners)[0]?.state).toBe('REVIEW_REQUIRED');
  await expect(ctx.recordSubmission(f.client('agent-a','next'),symbol,'buy',1,false)).rejects.toThrow('review');
});
test('agent limits exclude another ticker but shared caps still include its position', async () => {
  const f = fixture();
  const snapshot = f.snapshot({positions:[{...f.position(),symbol:otherSymbol}],openSymbols:new Set([otherSymbol]),exposure:200,notionalExposure:200,marginUsed:100,existingLossReserve:100,metrics:[{symbol:otherSymbol,exposure:200,notional:200,margin:100,lossReserve:100}]});
  const scoped = await f.context().scopeSnapshot(snapshot,market);
  expect(scoped.openSymbols.size).toBe(0); expect(scoped.marginUsed).toBe(0); expect(scoped.exposure).toBe(0);
  expect(scoped.account?.marginUsed).toBe(100); expect(scoped.account?.openSymbols.has(otherSymbol)).toBe(true);
  const policy: TradingPolicy = {symbols:[symbol],capital:{allocated:1000,currency:'USD'},risk:{maxOpenPositions:1,maxRiskPerTradePct:10,maxDailyLossPct:10,maxTradesPerDay:10,maxPositionsOpenedPerDay:5}};
  expect(() => sizeCryptoEntry(f.exchange,market,policy,scoped,10)).toThrow('Account-wide');
  scoped.account!.existingLossReserve=0;scoped.account!.limits={...defaultAccountRisk,maxOpenPositions:1};
  expect(() => sizeCryptoEntry(f.exchange,market,policy,scoped,10)).toThrow('position');
  scoped.account!.limits={...defaultAccountRisk,maxOpenPositions:2};
  expect(sizeCryptoEntry(f.exchange,market,policy,scoped,5).amount).toBe(1);
});
test('wallet debits attribute only to an unambiguous ownership period; unknown debits charge every agent', async () => {
  const f = fixture(), now = Date.now();
  f.rows(COLLECTIONS.CryptoOwnershipPeriods).push({_id:'period',accountKey:'account',agentId:'agent-b',productId:'2',startedAt:new Date(now-60000)});
  const result = await f.context().scopeSnapshot(f.snapshot({realizedLosses:7,lossEvents:[{timestamp:now,amount:5,productId:'2'},{timestamp:now,amount:2}]}),market);
  expect(result.realizedLosses).toBe(2);expect(result.account?.realizedLosses).toBe(7);
  f.rows(COLLECTIONS.CryptoOwnershipPeriods).push({_id:'overlap',accountKey:'account',agentId:'agent-a',productId:'2',startedAt:new Date(now-50000)});
  expect((await f.context().scopeSnapshot(f.snapshot({lossEvents:[{timestamp:now,amount:5,productId:'2'}]}),market)).realizedLosses).toBe(5);
});
test('daily equity is first observed, never raised by a winning trade or deposit', async () => {
  const f = fixture(), first = f.snapshot(); await f.context().scopeSnapshot(first,market);
  expect((await f.context().scopeSnapshot({...first,walletEquity:2000},market)).account?.dailyEquity).toBe(1000);
});
test('flat terminal entries release ownership, but orphan protection prevents reuse', async () => {
  const f = fixture(), ctx = await f.accepted();
  await expect(ctx.scopeSnapshot(f.snapshot({orders:[{symbol,reduceOnly:true} as Order]}),market)).rejects.toThrow('pending protection');
  expect(f.rows(COLLECTIONS.CryptoPositionOwners)[0]?.state).not.toBe('FLAT');
  await ctx.scopeSnapshot(f.snapshot(),market);
  expect(f.rows(COLLECTIONS.CryptoPositionOwners)[0]?.state).toBe('FLAT');expect(f.rows(COLLECTIONS.CryptoOwnershipPeriods)[0]?.endedAt).toBeInstanceOf(Date);
  await f.context('agent-b').recordSubmission(f.client('agent-b'),symbol,'sell',1,false);
  expect(f.rows(COLLECTIONS.CryptoPositionOwners)[0]?.agentId).toBe('agent-b');
});
test('verified reductions remain attributed to their owner and reconcile remaining contracts', async () => {
  const f = fixture(), ctx = await f.accepted();
  await ctx.scopeSnapshot(f.snapshot({positions:[f.position()],openSymbols:new Set([symbol])}),market);
  await ctx.assertOwnsPosition(symbol,f.position());
  await f.accepted('agent-a',1,0,'closed','sell',true,'close');
  await ctx.scopeSnapshot(f.snapshot({positions:[f.position(1)],openSymbols:new Set([symbol])}),market);
  expect(f.rows(COLLECTIONS.CryptoPositionOwners)[0]?.contracts).toBe(1);
  await expect(f.context('agent-b').recordSubmission(f.client('agent-b'),symbol,'sell',1,true)).rejects.toThrow('owner');
});
test('explicit refusals can reconcile flat; failed persistence cannot free the ticker for a competitor', async () => {
  const f = fixture(), ctx = f.context(); await ctx.recordSubmission(f.client(),symbol,'buy',1,false); await ctx.recordRefused(f.client()); await ctx.scopeSnapshot(f.snapshot(),market);
  expect(f.rows(COLLECTIONS.CryptoPositionOwners)[0]?.state).toBe('FLAT');
  const bad = fixture();bad.failOrderWrites();await expect(bad.context().recordSubmission(bad.client(),symbol,'buy',1,false)).rejects.toThrow('persistence');
  await expect(bad.context('agent-b').recordSubmission(bad.client('agent-b'),symbol,'buy',1,false)).rejects.toThrow('another agent');
});
