import { beforeEach, expect, mock, test } from 'bun:test';
import { createHash } from 'node:crypto';
const agentId = 'a'.repeat(24), exchangeId = 'b'.repeat(24);
const accountKey = `delta:india:${createHash('sha256').update('123').digest('hex')}`;
let agent: any, foreign = false, baseline = true, accountOwner = 'owner', linkAccount = accountKey;
let accountLimits: any, ownership: any[], usage: any[], siblings: any[], positions: any[], orders: any[];
let snapshotFailure = false, busy = false, connectionReads = 0, loss = 0;
let binance = false, invalidBaseline = false, quoteAge = 0;
const commands: any[] = [], brokerReads: string[] = [], writes: string[] = [];
const market = { symbol: 'BTC/USD:USD', id: 'BTCUSD', numericId: '1', active: true, contract: true, swap: true, linear: true, inverse: false, quote: 'USD', settle: 'USD', contractSize: 1, taker: 0.001, limits: { amount: { min: 1 }, cost: {} }, info: { maintenance_margin: 0.5, initial_margin: 1, max_leverage_notional: 1000000, initial_margin_scaling_factor: 0, maintenance_margin_scaling_factor: 0, settling_asset: { id: 1 } } };
const makeExchange = () => {
  const contract = binance ? { ...market, symbol: 'BTC/USDT:USDT', id: 'BTCUSDT', quote: 'USDT', settle: 'USDT', info: { ...market.info } } : market;
  return {
  id: binance ? 'binance' : 'delta', loadMarkets: async () => {}, market: () => contract,
  amountToPrecision: (_symbol: string, amount: number) => String(Math.floor(amount)),
  priceToPrecision: (_symbol: string, price: number) => price.toFixed(2),
  fetchTicker: async () => ({ bid: 100, ask: 100.2, timestamp: Date.now() - quoteAge }),
  fetchBalance: async () => { if (snapshotFailure) throw new Error('secret-api-key'); return { free: { USD: 1000, USDT: 1000 }, total: { USD: 1000, USDT: 1000 }, info: { multiAssetsMargin: false } }; },
  fetchPositions: async () => positions,
  fetchLeverage: async () => ({ marginMode: 'cross', longLeverage: 1, shortLeverage: 1 }),
  fetchLeverages: async () => ({ [contract.symbol]: { marginMode: 'isolated', longLeverage: 1, shortLeverage: 1 } }),
  fetchMarketLeverageTiers: async () => [{ minNotional: 0, maxNotional: 1000000, maintenanceMarginRate: 0.005, maxLeverage: 100 }],
  fetchPositionMode: async () => ({ hedged: false }),
  fetchLedger: async () => [],
  fetchOpenOrders: async () => [],
  parseOrder: (row: any) => row,
  request: async (path: string, _api: string, method: string) => {
    brokerReads.push(path); expect(method).toBe('GET');
    if (path === 'account/info') return { uid: 123 };
    if (path === 'profile') return { success: true, result: { id: 123 } };
    if (path === 'orders') return { success: true, result: orders, meta: { after: null } };
    if (path === 'users/trading_preferences') return { success: true, result: { default_auto_topup: true, deto_for_commission: false } };
    if (path === 'wallet/transactions') return { success: true, result: loss ? [{ id: 'loss', asset_id: 1, created_at: new Date().toISOString(), transaction_type: 'commission', amount: -loss }] : [], meta: { after: null } };
    throw new Error('Unexpected broker read');
  },
  createOrder: async () => { writes.push('order'); throw new Error('No order allowed'); },
  setLeverage: async () => { writes.push('leverage'); throw new Error('No settings allowed'); },
  setMarginMode: async () => { writes.push('margin'); throw new Error('No settings allowed'); },
}; };
mock.module('server-only', () => ({}));
mock.module('@/features/exchange/server/execution-account', () => ({
  executionConnection: async (_id: string, userId: string) => { expect(userId).toBe('owner'); connectionReads++; return { exchange: makeExchange(), connection: {} }; },
  linkedExchangeIds: async () => [exchangeId, 'c'.repeat(24)],
  registerExecutionAccount: () => { writes.push('register'); throw new Error('No registration allowed'); },
}));
mock.module('@/lib/db', () => ({ default: {
  agent: {
    findFirst: async ({ where }: any) => { expect(where.userId).toBe('owner'); return foreign ? null : agent; },
    findMany: async ({ where }: any) => { expect(where.exchangeId.in).toHaveLength(2); return siblings; },
    update: () => { writes.push('agent'); throw new Error('No DB writes allowed'); },
  },
  $runCommandRaw: async (command: any) => {
    commands.push(command);
    if (!command.find) { writes.push('raw'); throw new Error('No raw mutations allowed'); }
    const rows: Record<string, any[]> = {
      BrokerAccounts: [{ userId: accountOwner, limits: accountLimits }], BrokerAccountLinks: [{ userId: 'owner', accountKey: binance ? linkAccount.replace('delta:india:', 'binance:usdm:') : linkAccount }],
      CryptoAccountDailyEquity: baseline ? [{ equity: invalidBaseline ? -1 : 1000 }] : [], CryptoPositionOwners: ownership, ManagedCryptoOrders: [],
      AgentDailyRiskUsage: usage, ExecutionLocks: busy ? [{ _id: 'busy' }] : [],
    };
    return { ok: 1, cursor: { id: 0, firstBatch: rows[command.find] ?? [] } };
  },
} }));
const { entryPreview, entryPreviewSchema, boundPreviewReads } = await import('../src/features/agents/server/entry-preview');
const input = () => ({ agentId, symbol: 'BTCUSD', side: 'buy' as const, stopDistancePct: 1 });
beforeEach(() => {
  foreign = snapshotFailure = busy = binance = invalidBaseline = false; quoteAge = 0; baseline = true; accountOwner = 'owner'; linkAccount = accountKey; loss = connectionReads = 0;
  commands.length = brokerReads.length = writes.length = 0; ownership = usage = siblings = positions = orders = [];
  accountLimits = { maxOpenPositions: 5, maxMarginPct: 50, maxDailyLossPct: 20, maxNotionalMultiple: 5 };
  agent = { id: agentId, userId: 'owner', exchangeId, status: 'PAUSED', type: 'CRYPTO', strategy: 'LLM_TRADING', executionMode: null, updatedAt: new Date(), market: { symbols: ['BTCUSD'] }, capital: { allocated: 1000, currency: 'USD' }, risk: { maxRiskPerTradePct: 1, maxDailyLossPct: 10, maxOpenPositions: 5, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 }, strategyConfig: { sizing: { version: 1, mode: 'STOP_LOSS', leverage: 10, leverageMode: 'AUTO', autoSizing: 'TARGET_RISK', maxMarginPct: 10, maxExposureMultiple: 10, feeBps: 10, slippageBps: 5 } } };
});
test('fresh real sizing is a GET-only what-if without account registration, settings or reservations', async () => {
  const result = await entryPreview('owner', input());
  expect(result.ok).toBe(true); expect(result.scenario?.entryPrice).toBe(100); expect(result.scenario?.stopPrice).toBe(99);
  expect(result.sizing?.amount).toBe(7); expect(result.sizing?.selectedLeverage).toBe(8);
  expect(result.sizing!.marginRequired).toBeLessThanOrEqual(100); expect(result.sizing!.riskAtStop).toBeLessThanOrEqual(10);
  expect(result.notes.join(' ')).toContain('has not applied'); expect(result.notes.join(' ')).toContain('all account losses');
  expect(commands.every(c => c.find)).toBe(true); expect(writes).toEqual([]); expect(JSON.stringify(result)).not.toContain(accountKey);
});
test('ownership and paper/status restrictions are enforced before opening credentials', async () => {
  foreign = true; await expect(entryPreview('owner', input())).rejects.toMatchObject({ code: 'NOT_FOUND' }); foreign = false;
  for (const changes of [{ executionMode: 'PAPER' }, { status: 'RUNNING' }, { strategy: 'HYBRID' }]) {
    const previous = { ...agent }; Object.assign(agent, changes); expect((await entryPreview('owner', input())).ok).toBe(false); agent = previous;
  }
  expect((await entryPreview('owner', { ...input(), symbol: 'ETHUSD' })).ok).toBe(false); expect(connectionReads).toBe(0);
});
test('missing baseline is provisional without initialization; account budgets still bind', async () => {
  baseline = false; const result = await entryPreview('owner', input());
  expect(result.ok).toBe(true); expect(result.provisional).toBe(true); expect(result.notes.join(' ')).toContain('Current verified wallet equity'); expect(writes).toEqual([]);
  baseline = true; accountLimits.maxMarginPct = 0.05;
  expect((await entryPreview('owner', input())).ok).toBe(false);
  accountLimits.maxMarginPct = 50; loss = 100;
  expect((await entryPreview('owner', input())).ok).toBe(false);
});
test('physical account/link mismatch, conflicting owners and linked same-ticker agents refuse', async () => {
  accountOwner = 'other'; expect((await entryPreview('owner', input())).ok).toBe(false); accountOwner = 'owner';
  linkAccount = 'other-account'; expect((await entryPreview('owner', input())).ok).toBe(false); linkAccount = accountKey;
  ownership = [{ agentId: 'other', userId: 'owner', state: 'OPEN' }]; expect((await entryPreview('owner', input())).message).toContain('Another agent'); ownership = [];
  siblings = [{ executionMode: 'LIVE', market: { symbols: ['BTC/USD:USD'] } }]; expect((await entryPreview('owner', input())).message).toContain('Another live agent');
  expect(writes).toEqual([]);
});
test('actual positions, pending protection, daily counters and retained locks cannot be previewed as flat', async () => {
  positions = [{ symbol: market.symbol, contracts: 1, info: { size: 1, margin_mode: 'isolated', auto_topup: false, unrealized_pnl: 0, mark_price: 100, margin: 10 }, entryPrice: 100 }];
  expect((await entryPreview('owner', input())).message).toContain('flat'); positions = [];
  orders = [{ symbol: market.symbol, remaining: 1, reduceOnly: true }]; expect((await entryPreview('owner', input())).message).toContain('flat'); orders = [];
  usage = [{ tradesReserved: 10, positionsOpenedReserved: 0 }]; expect((await entryPreview('owner', input())).message).toContain('limit'); usage = [];
  busy = true; expect((await entryPreview('owner', input())).message).toContain('lock'); expect(writes).toEqual([]);
});
test('bound input and corrupt saved risk limits fail safely; broker errors do not leak secrets', async () => {
  expect(entryPreviewSchema.safeParse({ ...input(), stopDistancePct: Infinity }).success).toBe(false);
  expect(entryPreviewSchema.safeParse({ ...input(), stopDistancePct: 51 }).success).toBe(false);
  agent.risk.maxRiskPerTradePct = 101; expect((await entryPreview('owner', input())).ok).toBe(false); expect(connectionReads).toBe(0);
  agent.risk.maxRiskPerTradePct = 1; snapshotFailure = true; const result = await entryPreview('owner', input());
  expect(result.ok).toBe(false); expect(JSON.stringify(result)).not.toContain('secret-api-key');
});
test('transport rejects every write method and bounds read requests', async () => {
  let reads = 0;
  const exchange = boundPreviewReads({ request: async () => { reads++; return {}; } } as any);
  await expect(exchange.request('anything', 'private', 'POST')).rejects.toThrow('budget'); expect(reads).toBe(0);
  for (let i = 0; i < 32; i++) await exchange.request('anything', 'private', 'GET');
  await expect(exchange.request('anything', 'private', 'GET')).rejects.toThrow('budget'); expect(reads).toBe(32);
});

test('legacy auto sizing retains first tradable leverage; target sizing funds more without raising budgets', async () => {
  const target = await entryPreview('owner', input());
  delete agent.strategyConfig.sizing.autoSizing;
  const legacy = await entryPreview('owner', input());
  expect(legacy.ok).toBe(true); expect(legacy.sizing?.selectedLeverage).toBe(2);
  expect(legacy.sizing!.amount).toBeLessThan(target.sizing!.amount);
  expect(legacy.sizing!.riskAtStop).toBeLessThanOrEqual(10); expect(writes).toEqual([]);
});
test('Binance IOC scenarios use ask for buys and bid for sells; Delta passive sells use ask', async () => {
  expect((await entryPreview('owner', { ...input(), side: 'sell' })).scenario?.entryPrice).toBe(100.2);
  binance = true; agent.market.symbols = ['BTCUSDT']; agent.capital.currency = 'USDT';
  const buy = await entryPreview('owner', { ...input(), symbol: 'BTCUSDT' });
  expect(buy.ok).toBe(true); expect(buy.scenario?.entryPrice).toBe(100.2);
  const sell = await entryPreview('owner', { ...input(), symbol: 'BTCUSDT', side: 'sell' });
  expect(sell.ok).toBe(true); expect(sell.scenario?.entryPrice).toBe(100);
  expect(writes).toEqual([]);
});
test('invalid saved baseline and stale quotes cannot produce an approved sizing scenario', async () => {
  invalidBaseline = true;
  expect((await entryPreview('owner', input())).message).toContain('baseline is invalid');
  invalidBaseline = false; quoteAge = 120000;
  expect((await entryPreview('owner', input())).message).toContain('fresh, valid bid');
  expect(writes).toEqual([]);
});
