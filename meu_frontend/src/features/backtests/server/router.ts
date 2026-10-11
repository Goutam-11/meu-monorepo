import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/trpc/init';
import prisma from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { backtestInputSchema, configuredCryptoAgentSchema, type BacktestInput } from '../validation';
import { loadDeltaBacktestData } from './delta-data';
import { strategyCatalog, strategyStateKey, STRATEGY_VERSION } from '../../../../../shared/trading/strategies';
import { runPerpetualBacktest, type Contract } from '../../../../../shared/trading/perpetualBacktest';
import type { Candle } from '../../../../../shared/trading/emaCrossover';
type Snapshot = {
    config: BacktestInput;
    contract: Contract;
    candles: Candle[];
    dataHash: string;
    warnings: string[];
    result: ReturnType<typeof runPerpetualBacktest>;
};
// Per-process budget, with a global bound to avoid an unbounded user map.
const active = new Set<string>();
const recent = new Map<string, number>();
const idSchema = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i) });
function view(run: {
    id: string;
    createdAt: Date;
    symbol: string;
    timeframe: string;
    snapshot: unknown;
}) {
    const snapshot = run.snapshot as Snapshot;
    return { id: run.id, createdAt: run.createdAt, symbol: run.symbol, timeframe: run.timeframe, config: snapshot.config, result: snapshot.result, warnings: snapshot.warnings };
}
async function createPausedCryptoAgent(userId: string, input: z.infer<typeof configuredCryptoAgentSchema>, saved?: { contract: Contract; runId: string }) {
    if (await prisma.agent.count({ where: { userId } }) >= 100)
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Maximum 100 agents per account.' });
    const exchange = await prisma.exchange.findFirst({ where: { id: input.exchangeId, userId }, select: { id: true, name: true, sandbox: true, apiKey: true, secret: true } });
    if (!exchange || exchange.name.toUpperCase() !== 'DELTA' || exchange.sandbox)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Choose an owned production Delta India exchange.' });
    if (input.mode === 'LIVE' && (!exchange.apiKey || !exchange.secret))
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Live mode requires saved Delta API credentials.' });
    const { config } = input;
    let contract = saved?.contract;
    if (!contract) {
        // Resolve contract terms server-side. This is indicator history validation, not a backtest.
        const interval = { '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 }[config.timeframe];
        const end = Math.floor(Date.now() / 1000 / interval) * interval;
        const warmup = Math.max(config.strategy.slowPeriod, config.strategy.lookback, config.strategy.atrPeriod, 15) * 5 + 2;
        try {
            contract = (await loadDeltaBacktestData({ symbol: config.symbol, timeframe: config.timeframe, start: end - warmup * interval, end })).contract;
        } catch {
            throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Could not validate Delta contract and candle history. Check the ticker and try again.' });
        }
    }
    const agent = await prisma.agent.create({ data: {
        name: input.name, userId, status: 'PAUSED', lastRun: null, nextRunAt: null,
        credentialId: null, exchangeId: exchange.id, llmModel: '', temperature: 0.7,
        type: 'CRYPTO', strategy: 'ALGO_TRADING', executionMode: input.mode,
        market: { symbols: [config.symbol], agentCycles: input.agentCycles },
        risk: { maxRiskPerTradePct: config.simulation.riskPerTradePct, maxDailyLossPct: config.simulation.maxDailyLossPct, maxOpenPositions: 1, maxTradesPerDay: config.simulation.maxTradesPerDay, maxPositionsOpenedPerDay: config.simulation.maxPositionsOpenedPerDay },
        capital: { allocated: config.simulation.initialCapital, currency: 'USD' },
        strategyConfig: { ...config.strategy, timeframe: config.timeframe, simulation: config.simulation, contract, ...(saved ? { backtestRunId: saved.runId } : {}), activationAt: new Date().toISOString() } as unknown as Prisma.InputJsonValue,
    }, select: { id: true, name: true, executionMode: true, status: true } });
    return { ...agent, executionMode: input.mode };
}
export const backtestsRouter = createTRPCRouter({
    catalog: protectedProcedure.query(() => strategyCatalog),
    run: protectedProcedure.input(backtestInputSchema).mutation(async ({ ctx, input }) => {
        const userId = ctx.auth.user.id, now = Date.now();
        for (const [user, time] of recent)
            if (now - time > 60000)
                recent.delete(user);
        if (active.has(userId) || active.size >= 4 || (recent.get(userId) ?? 0) > now - 10000)
            throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Wait a few seconds before running another backtest.' });
        active.add(userId);
        recent.set(userId, now);
        try {
            if (await prisma.backtestRun.count({ where: { userId } }) >= 100)
                throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Delete an old run before saving another. Maximum 100 saved runs.' });
            const data = await loadDeltaBacktestData(input);
            let result: ReturnType<typeof runPerpetualBacktest>;
            try {
                result = runPerpetualBacktest(data.candles, data.contract, input.strategy, input.simulation);
            }
            catch {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'The contract or data is incompatible with these simulation settings.' });
            }
            const warnings = [...data.warnings, 'Funding uses your constant 8-hour rate assumption, not historical settlements.', 'Liquidation is an isolated-margin approximation using trade-price OHLC, not historical mark prices or margin tiers. Adverse intrabar events are prioritized.', 'One position per run; daily counters reset at India midnight (Asia/Kolkata). Risk exits always remain permitted.', 'Buy-and-hold is an unleveraged price-only benchmark without fees or funding. Taxes, spread and partial fills are not modeled.'];
            const snapshot: Snapshot = { config: input, contract: data.contract, candles: data.candles, dataHash: data.dataHash, result, warnings };
            const run = await prisma.backtestRun.create({ data: { userId, symbol: input.symbol, timeframe: input.timeframe, strategyId: input.strategy.id, netReturnPct: result.netReturnPct, maxDrawdownPct: result.maxDrawdownPct, tradeCount: result.tradeCount, snapshot: snapshot as unknown as Prisma.InputJsonValue } });
            return view(run);
        }
        catch (error) {
            if (error instanceof TRPCError)
                throw error;
            throw new TRPCError({ code: 'BAD_GATEWAY', message: 'Could not fetch or save the backtest. Check the symbol/date range and try again.' });
        }
        finally {
            active.delete(userId);
        }
    }),
    list: protectedProcedure.input(z.object({ page: z.number().int().min(1).max(100).default(1) })).query(async ({ ctx, input }) => {
        const where = { userId: ctx.auth.user.id };
        const [runs, total] = await Promise.all([prisma.backtestRun.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (input.page - 1) * 10, take: 10, select: { id: true, createdAt: true, symbol: true, timeframe: true, strategyId: true, netReturnPct: true, maxDrawdownPct: true, tradeCount: true } }), prisma.backtestRun.count({ where })]);
        return { runs, totalPages: Math.max(1, Math.ceil(total / 10)) };
    }),
    get: protectedProcedure.input(idSchema).query(async ({ ctx, input }) => {
        const run = await prisma.backtestRun.findFirst({ where: { id: input.id, userId: ctx.auth.user.id } });
        if (!run)
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Backtest not found' });
        return view(run);
    }),
    chart: protectedProcedure.input(idSchema).query(async ({ ctx, input }) => {
        const run = await prisma.backtestRun.findFirst({ where: { id: input.id, userId: ctx.auth.user.id }, select: { snapshot: true } });
        if (!run) throw new TRPCError({ code: 'NOT_FOUND', message: 'Backtest not found' });
        const snapshot = run.snapshot as Snapshot;
        if (!Array.isArray(snapshot.candles) || snapshot.candles.length > 10000)
            throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Chart history is unavailable for this saved run.' });
        return { candles: snapshot.candles, strategy: snapshot.config.strategy, trades: snapshot.result.trades };
    }),
    export: protectedProcedure.input(idSchema).query(async ({ ctx, input }) => {
        const run = await prisma.backtestRun.findFirst({ where: { id: input.id, userId: ctx.auth.user.id } });
        if (!run)
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Backtest not found' });
        return { id: run.id, createdAt: run.createdAt, ...run.snapshot as Snapshot };
    }),
    createAgent: protectedProcedure.input(z.object({
        runId: z.string().regex(/^[a-f0-9]{24}$/i),
        exchangeId: z.string().regex(/^[a-f0-9]{24}$/i),
        name: z.string().trim().min(2).max(100),
        mode: z.enum(['PAPER', 'LIVE']),
    })).mutation(async ({ ctx, input }) => {
        const userId = ctx.auth.user.id;
        const run = await prisma.backtestRun.findFirst({ where: { id: input.runId, userId } });
        if (!run) throw new TRPCError({ code: 'NOT_FOUND', message: 'Saved backtest not found' });
        const snapshotParsed = z.object({ config: backtestInputSchema, result: z.object({ strategyVersion: z.string() }) }).safeParse(run.snapshot);
        if (!snapshotParsed.success || snapshotParsed.data.result.strategyVersion !== STRATEGY_VERSION)
            throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'This run uses an unsupported strategy version. Run a new backtest before creating an agent.' });
        const { config } = snapshotParsed.data;
        return createPausedCryptoAgent(userId, { ...input, config, agentCycles: 60 }, { contract: (run.snapshot as Snapshot).contract, runId: run.id });
    }),
    createConfiguredAgent: protectedProcedure.input(configuredCryptoAgentSchema).mutation(async ({ ctx, input }) => {
        const userId = ctx.auth.user.id;
        for (const [user, time] of recent) if (Date.now() - time > 60000) recent.delete(user);
        if (active.has(userId) || active.size >= 4 || (recent.get(userId) ?? 0) > Date.now() - 10000)
            throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Wait a few seconds before creating another algorithm agent.' });
        active.add(userId);
        recent.set(userId, Date.now());
        try { return await createPausedCryptoAgent(userId, input); }
        finally { active.delete(userId); }
    }),
    paperSessions: protectedProcedure.input(z.object({agentId:z.string().regex(/^[a-f0-9]{24}$/i)})).query(async({ctx,input})=>{
        const agent=await prisma.agent.findFirst({where:{id:input.agentId,userId:ctx.auth.user.id},select:{id:true,executionMode:true,strategyConfig:true}});
        if(!agent)throw new TRPCError({code:'NOT_FOUND',message:'Agent not found'});
        if(agent.executionMode!=='PAPER')throw new TRPCError({code:'PRECONDITION_FAILED',message:'Paper history requires a paper agent.'});
        const currentStateId=strategyStateKey(agent.id,agent.strategyConfig as {stateId?:unknown}|null);
        const result=await prisma.$runCommandRaw({find:'PaperTradingState',filter:{userId:ctx.auth.user.id,$or:[{_id:agent.id},{agentId:agent.id}]},sort:{updatedAt:-1},limit:20,batchSize:20,projection:{_id:1,'config.id':1,'config.timeframe':1,updatedAt:1}});
        const rows=(result.cursor as {firstBatch?:{_id:string;config?:{id?:string;timeframe?:string};updatedAt?:{$date:string}}[]}|undefined)?.firstBatch;
        if(result.ok!==1||!Array.isArray(rows))throw new TRPCError({code:'BAD_GATEWAY',message:'Could not read paper portfolio history.'});
        return rows.map(row=>({id:row._id,current:row._id===currentStateId,algorithm:row.config?.id??'Previous configuration',timeframe:row.config?.timeframe??null,updatedAt:row.updatedAt?.$date??null}));
    }),
    paperState: protectedProcedure.input(z.object({ agentId: z.string().regex(/^[a-f0-9]{24}$/i), sessionId:z.string().min(1).max(80).optional() })).query(async ({ ctx, input }) => {
        const agent = await prisma.agent.findFirst({ where: { id: input.agentId, userId: ctx.auth.user.id }, select: { id: true, executionMode: true, strategyConfig: true } });
        if (!agent) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
        if (agent.executionMode !== 'PAPER') throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Paper state is available only for paper agents.' });
        let stateId = strategyStateKey(agent.id, agent.strategyConfig as {stateId?:unknown} | null);
        if (input.sessionId) {
            try { stateId=input.sessionId===agent.id ? agent.id : strategyStateKey(agent.id,{stateId:input.sessionId}); }
            catch { throw new TRPCError({code:'BAD_REQUEST',message:'Choose a portfolio belonging to this agent.'}); }
        }
        const result = await prisma.$runCommandRaw({ find: 'PaperTradingState', filter: { _id: stateId, userId: ctx.auth.user.id,...(stateId!==agent.id ? {agentId:agent.id}: {}) }, projection: { state: 1 }, limit: 1 });
        const batch = (result.cursor as { firstBatch?: unknown[] } | undefined)?.firstBatch;
        const row = batch?.[0];
        const state = row && typeof row === 'object' ? (row as Record<string, unknown>).state : null;
        if (!state || typeof state !== 'object' || Array.isArray(state)) return state;
        const safeState = { ...state as Record<string, unknown> };
        delete safeState.history;
        const portfolio = state as unknown as import('../../../../../shared/trading/paperTrading').PaperState;
        const last = portfolio.history?.at(-1);
        const unrealized = portfolio.position && last ? (last.close - portfolio.position.entry) * portfolio.position.units * portfolio.position.sign : 0;
        return { ...safeState, equity: portfolio.cash + unrealized, historyCount: portfolio.history?.length ?? 0 };
    }),
    delete: protectedProcedure.input(idSchema).mutation(async ({ ctx, input }) => {
        const result = await prisma.backtestRun.deleteMany({ where: { id: input.id, userId: ctx.auth.user.id } });
        if (!result.count)
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Backtest not found' });
        return { deleted: true };
    }),
});
