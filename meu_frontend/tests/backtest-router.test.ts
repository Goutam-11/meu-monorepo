import { test, expect, mock } from 'bun:test';
let owner = 'alice';
let createdAgent:Record<string,unknown>|undefined;
const saved: {
    id: string;
    createdAt: Date;
    userId: string;
    symbol: string;
    timeframe: string;
    snapshot: unknown;
}[] = [];
mock.module('server-only', () => ({}));
mock.module('next/headers', () => ({ headers: async () => new Headers() }));
mock.module('../src/lib/auth/server', () => ({ auth: { api: { getSession: async () => ({ user: { id: owner } }) } } }));
mock.module('../src/lib/db', () => ({ default: { agent:{count:async()=>0,create:async({data}:{data:Record<string,unknown>})=>{createdAgent=data;return {id:'c'.repeat(24),name:data.name,executionMode:data.executionMode,status:data.status};},findFirst:async({where}:{where:{userId:string}})=>where.userId==='alice'?{id:'c'.repeat(24),executionMode:'PAPER'}:null},exchange:{findFirst:async({where}:{where:{id:string;userId:string}})=>where.userId==='alice'&&where.id==='d'.repeat(24)?{id:where.id,name:'DELTA',sandbox:false,apiKey:'encrypted-not-used',secret:'encrypted-not-used'}:null},$runCommandRaw:async()=>({cursor:{firstBatch:[]}}),backtestRun: {
            count: async () => saved.length,
            create: async ({ data }: {
                data: Omit<(typeof saved)[number], 'id' | 'createdAt'>;
            }) => { const run = { ...data, id: 'a'.repeat(24), createdAt: new Date() }; saved.push(run); return run; },
            findFirst: async ({ where }: {
                where: {
                    userId: string;
                    id: string;
                };
            }) => saved.find(r => r.id === where.id && r.userId === where.userId) ?? null,
            deleteMany: async ({ where }: {
                where: {
                    userId: string;
                    id: string;
                };
            }) => { const index = saved.findIndex(r => r.id === where.id && r.userId === where.userId); if (index < 0)
                return { count: 0 }; saved.splice(index, 1); return { count: 1 }; },
        } } }));
const start = 1699920000;
const candles = Array.from({ length: 24 }, (_, i) => ({ timestamp: start + i * 3600, open: i < 5 ? 100 : 110, high: i < 5 ? 101 : 111, low: i < 5 ? 99 : 109, close: i < 5 ? 100 : 110, volume: 1, closed: true }));
const { backtestsRouter } = await import('../src/features/backtests/server/router');
const caller = backtestsRouter.createCaller({ userId: 'ignored', requestId: 'b'.repeat(36) });
const input = { symbol: 'BTCUSD', timeframe: '1h' as const, start, end: start + 24 * 3600, strategy: { id: 'ema' as const, fastPeriod: 2, slowPeriod: 3, lookback: 3, atrPeriod: 2, stopAtr: 2, rewardRisk: 2 }, simulation: { initialCapital: 1000, leverage: 2, riskPerTradePct: 1, maxMarginPct: 25, feeBps: 5, slippageBps: 2, fundingRatePct8h: 0, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5, maxDailyLossPct: 5, direction: 'both' as const } };
test('authenticated run saves reproducible snapshot and prevents another owner reading/deleting it', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: URL | string) => { const u = new URL(String(url)); const result = u.pathname.includes('/products/') ? { symbol: 'BTCUSD', contract_type: 'perpetual_futures', notional_type: 'vanilla', is_quanto: false, contract_value: '0.001', maintenance_margin: '0.25', settling_asset: { symbol: 'USD' } } : candles.map(c => ({ time: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume })); return new Response(JSON.stringify({ success: true, result })); }) as typeof fetch;
    let run;
    try {
        run = await caller.run(input);
    }
    finally {
        globalThis.fetch = originalFetch;
    }
    expect(run.result.strategyVersion).toBe('1.1.0');
    expect(saved[0]!.userId).toBe('alice');
    const exported = await caller.export({ id: run.id });
    expect(exported.candles).toHaveLength(24);
    expect(exported.dataHash).toHaveLength(64);
    const chart = await caller.chart({ id: run.id });
    expect(chart.candles).toHaveLength(24);
    expect(chart.trades).toEqual(run.result.trades);
    expect(chart).not.toHaveProperty('dataHash');
    const snapshot = saved[0]!.snapshot as { candles: unknown[] };
    const originalCandles = snapshot.candles;
    try {
        snapshot.candles = Array(10001).fill(candles[0]);
        await expect(caller.chart({ id: run.id })).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    } finally { snapshot.candles = originalCandles; }
    await expect(caller.run(input)).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
    const agent=await caller.createAgent({runId:run.id,exchangeId:'d'.repeat(24),name:'Paper test',mode:'PAPER'});
    expect(agent.executionMode).toBe('PAPER');expect(createdAgent!.status).toBe('PAUSED');expect(createdAgent!.nextRunAt).toBeNull();expect(createdAgent!.credentialId).toBeNull();
    await expect(caller.createAgent({runId:run.id,exchangeId:'e'.repeat(24),name:'Foreign',mode:'LIVE'})).rejects.toMatchObject({code:'BAD_REQUEST'});
    owner = 'bob';
    await expect(caller.createAgent({runId:run.id,exchangeId:'d'.repeat(24),name:'Foreign',mode:'LIVE'})).rejects.toMatchObject({code:'NOT_FOUND'});
    await expect(caller.paperState({agentId:agent.id})).rejects.toMatchObject({code:'NOT_FOUND'});
    await expect(caller.get({ id: run.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(caller.chart({ id: run.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(caller.export({ id: run.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(caller.delete({ id: run.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(saved).toHaveLength(1);
    owner = 'alice';
    await caller.delete({ id: run.id });
    expect(saved).toHaveLength(0);
});

test('direct configuration validates owned Delta metadata and creates a paused agent without a saved run', async () => {
    const originalFetch = globalThis.fetch, originalNow = Date.now;
    const now = originalNow(); Date.now = () => now + 11000;
    let fetchCount = 0;
    globalThis.fetch = (async (url: URL | string) => {
        fetchCount++;
        const u = new URL(String(url));
        const from = Number(u.searchParams.get('start')), end = Number(u.searchParams.get('end'));
        const result = u.pathname.includes('/products/') ? { symbol: 'BTCUSD', contract_type: 'perpetual_futures', notional_type: 'vanilla', is_quanto: false, contract_value: '0.001', maintenance_margin: '0.25', settling_asset: { symbol: 'USD' } } : Array.from({ length: Math.ceil((end - from) / 3600) }, (_, i) => ({ time: from + i * 3600, open: 100, high: 101, low: 99, close: 100, volume: 1 }));
        return new Response(JSON.stringify({ success: true, result }));
    }) as typeof fetch;
    const request = { name: 'Direct test', exchangeId: 'd'.repeat(24), mode: 'LIVE' as const, agentCycles: 60, config: { symbol: input.symbol, timeframe: input.timeframe, strategy: input.strategy, simulation: input.simulation } };
    try {
        owner = 'bob';
        const before = createdAgent;
        await expect(caller.createConfiguredAgent(request)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
        expect(fetchCount).toBe(0); expect(createdAgent).toBe(before);
        owner = 'alice';
        const agent = await caller.createConfiguredAgent(request);
        expect(agent.status).toBe('PAUSED'); expect(agent.executionMode).toBe('LIVE');
        expect(createdAgent!.nextRunAt).toBeNull(); expect(createdAgent!.lastRun).toBeNull();
        expect(createdAgent!.credentialId).toBeNull();
        expect(createdAgent!.capital).toEqual({ allocated: 1000, currency: 'USD' });
        expect(createdAgent!.market).toEqual({ symbols: ['BTCUSD'], agentCycles: 60 });
        expect(createdAgent!.strategyConfig).toMatchObject({ timeframe: '1h', simulation: input.simulation, contract: { symbol: 'BTCUSD', contractSize: 0.001, settlement: 'USD' } });
        expect(createdAgent!.strategyConfig).not.toHaveProperty('backtestRunId');
        expect(saved).toHaveLength(0);
        await expect(caller.createConfiguredAgent(request)).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
    } finally { owner = 'alice'; globalThis.fetch = originalFetch; Date.now = originalNow; }
});
