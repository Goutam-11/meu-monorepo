import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";
import { Status } from "@/generated/prisma/enums";
import { TRPCError } from "@trpc/server";
import { agentConfigSchema, requireOwnedReferences } from "../validation";
import { editCryptoAgent, editCryptoAgentSchema } from './edit-crypto-agent';
import {assertMarketSymbols} from '@/features/markets/server/catalog';
import { entryPreview, entryPreviewSchema } from './entry-preview';

const ITEMS_PER_PAGE = 5;
async function assertOwnedReferences(
  userId: string,
  exchangeId: string,
  credentialId: string | null,
  strategy: "ALGO_TRADING" | "LLM_TRADING" | "HYBRID",
  type: "STOCKS" | "CRYPTO",
  capitalCurrency: string,
  nativeStopSizing = false,
) {
  const exchangeRecord = await prisma.exchange.findFirst({
    where: { id: exchangeId, userId },
    select: { id: true, name: true },
  });
  const owned = await requireOwnedReferences(userId, exchangeId, credentialId, async (ownerId, exchangeRef, credentialRef) => {
    const credential = credentialRef
      ? await prisma.credentials.findFirst({ where: { id: credentialRef, userId: ownerId }, select: { id: true } })
      : null;
    return { exchange: Boolean(exchangeRecord && exchangeRecord.id === exchangeRef && ownerId === userId), credential: Boolean(credential) };
  });
  if (!owned) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Select an exchange and any required credential you own" });
  }
  if (strategy !== "LLM_TRADING" && (type !== "STOCKS" || exchangeRecord?.name?.toUpperCase() !== "ZERODHA")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Algorithmic and hybrid strategies currently require a Zerodha stocks exchange" });
  }
  if (type === 'STOCKS' && exchangeRecord?.name?.toUpperCase() !== 'ZERODHA')
    throw new TRPCError({code:'BAD_REQUEST',message:'Stock agents require a Zerodha exchange connection.'});
  const exchangeName = exchangeRecord?.name?.toUpperCase();
  if (type === 'CRYPTO' && exchangeName === 'ZERODHA')
    throw new TRPCError({code:'BAD_REQUEST',message:'Crypto agents require a crypto exchange connection.'});
  if (nativeStopSizing && (type !== 'CRYPTO' || !['DELTA','BINANCE'].includes(exchangeName ?? '')))
    throw new TRPCError({code:'BAD_REQUEST',message:'Native-stop sizing supports Delta India and Binance USD-M. Zerodha currently uses full-notional sizing and broker margin previews.'});
  const settlement = exchangeName === "DELTA" ? "USD" : exchangeName === "BINANCE" ? "USDT" : exchangeName === 'ZERODHA' ? 'INR' : undefined;
  if (settlement && capitalCurrency !== settlement) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `${exchangeName === "DELTA" ? "Delta India" : exchangeName === 'ZERODHA' ? 'Zerodha' : "Binance perpetuals"} allocation must use ${settlement} API wallet units` });
  }
}

export const agentsRouter = createTRPCRouter({
  entryPreview: protectedProcedure.input(entryPreviewSchema).query(({ ctx, input }) => entryPreview(ctx.auth.user.id, input)),
  updateCryptoAlgorithm: protectedProcedure.input(editCryptoAgentSchema).mutation(({ctx,input})=>editCryptoAgent(ctx.auth.user.id,input)),
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * ITEMS_PER_PAGE;

      // Get paginated data
      const [agents, totalCount] = await Promise.all([prisma.agent.findMany({
        where: {
          userId: ctx.auth.user.id,
          name: {
            contains: input.search,
            mode: "insensitive", // case-insensitive
          }
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: ITEMS_PER_PAGE,
      }),
        prisma.agent.count({ where: {
          userId: ctx.auth.user.id,
          name: { contains: input.search, mode: "insensitive" },
        } })]);

      const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

      return {
        agents,
        pagination: {
          page: input.page,
          totalPages,
          totalCount,
          hasNextPage: input.page < totalPages,
          hasPreviousPage: input.page > 1,
        },
      };
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
    return await prisma.agent.findUnique({
      where: {
        id: input.id,
        userId: ctx.auth.user.id,
      },
    });
  }),
  create: protectedProcedure
    .input(
      agentConfigSchema,
    )
    .mutation(async ({ ctx, input }) => {
  
      const credentialId = input.strategy === "ALGO_TRADING" ? null : input.credentialId;
      await assertOwnedReferences(ctx.auth.user.id, input.exchangeId, credentialId, input.strategy, input.type, input.capital.currency, input.strategyConfig.sizing?.mode === 'STOP_LOSS');
      await assertMarketSymbols(ctx.auth.user.id,input.exchangeId,input.type,input.market.symbols);
      return await prisma.agent.create({
        data: {
          name: input.name,
          status: "PAUSED",
          lastRun: null,
          nextRunAt: null,
          type: input.type,
          strategy: input.strategy,
          credentialId,
          exchangeId: input.exchangeId,
          temperature: input.temperature,
          market: {
            symbols: input.market.symbols,
            agentCycles: input.market.agentCycles,
          },
          risk: {
            maxRiskPerTradePct: input.risk.maxRiskPerTradePct,
            maxDailyLossPct: input.risk.maxDailyLossPct,
            maxOpenPositions: input.risk.maxOpenPositions,
            maxTradesPerDay: input.risk.maxTradesPerDay,
            maxPositionsOpenedPerDay: input.risk.maxPositionsOpenedPerDay,
          },
          capital: {
            allocated: input.capital.allocated,
            currency: input.capital.currency,
          },
          strategyConfig: input.strategyConfig,
          llmModel: input.strategy === "ALGO_TRADING" ? "" : input.llmModel,
          userId: ctx.auth.user.id,
        },
      });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const saved = await prisma.agent.findFirstOrThrow({where:{id:input.id,userId:ctx.auth.user.id}});
      if (saved.status !== 'PAUSED') throw new TRPCError({code:'PRECONDITION_FAILED',message:'Pause the agent before deleting it.'});
      const locks = await prisma.$runCommandRaw({find:'ExecutionLocks',filter:{$or:[{_id:`agent:${saved.id}`},{executionId:{$regex:`^${saved.id}-`}}]},projection:{_id:1},limit:1});
      const cursor = locks.cursor as {firstBatch?: unknown[]} | undefined;
      if (locks.ok !== 1 || !Array.isArray(cursor?.firstBatch) || cursor.firstBatch.length)
        throw new TRPCError({code:'PRECONDITION_FAILED',message:'This agent has an active or retained execution lock. Recover or reconcile it before deleting.'});
      return await prisma.agent.delete({
        where: {id:input.id,userId:ctx.auth.user.id,status:'PAUSED',updatedAt:saved.updatedAt},
      });
    }),
  statusChange: protectedProcedure
    .input(z.object({ id: z.string(), status: z.enum(Status) }))
    .mutation(async ({ ctx, input }) => {
      const current = await prisma.agent.findFirst({ where: { id: input.id, userId: ctx.auth.user.id } });
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      if (input.status === "RUNNING" && current.status === "RUNNING") return current;
      const cryptoAlgorithm = current.type === "CRYPTO" && current.strategy === "ALGO_TRADING" && ["PAPER", "LIVE"].includes(current.executionMode ?? "");
      if (input.status === "RUNNING" && current.executionMode !== "PAPER") {
        const siblings = await prisma.agent.findMany({ where: { userId: ctx.auth.user.id, exchangeId: current.exchangeId, status: "RUNNING", id: { not: current.id } } });
        const canonical = (symbol: string) => symbol.split(":")[0].replace(/[^a-z0-9]/gi, "").toUpperCase();
        if (siblings.some(other => other.executionMode !== "PAPER" && other.market.symbols.some(symbol => current.market.symbols.map(canonical).includes(canonical(symbol))))) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Pause the other live agent covering this symbol first." });
        }
      }
      const nativeStopSizing = (current.strategyConfig as {sizing?:{mode?:string}} | null)?.sizing?.mode === 'STOP_LOSS';
      if ((cryptoAlgorithm && current.executionMode === "LIVE" || nativeStopSizing) && input.status === "RUNNING") {
        const { startDeltaAgent } = await import('./start-delta-agent');
        return startDeltaAgent(current, ctx.auth.user.id, ctx.requestId);
      }
      if (cryptoAlgorithm && current.executionMode === 'PAPER' && input.status === 'RUNNING') {
        const {recoverPaperDataAgent} = await import('./recover-delta-agent');
        await recoverPaperDataAgent(current,ctx.auth.user.id,ctx.requestId);
      }
      return await prisma.agent.update({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
          updatedAt: current.updatedAt,
          status: current.status,
        },
        data: {
          status: input.status,
          ...(input.status === "RUNNING" ? { nextRunAt: null } : {}),
          ...(cryptoAlgorithm && input.status === "RUNNING" ? { strategyStartedAt: current.strategyStartedAt ?? new Date() } : {}),
        },
      });
    }),
  update: protectedProcedure
    .input(
      agentConfigSchema.extend({ id: z.string() }),
    )
    .mutation(async ({ ctx, input }) => {
     
      const saved = await prisma.agent.findFirstOrThrow({ where: { id: input.id, userId: ctx.auth.user.id }, select: { id: true, executionMode: true, status: true, updatedAt: true, market: true, exchangeId: true, type: true } });
      if (saved.executionMode) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Use the crypto algorithm editor for this saved Paper/Live agent." });
      if (saved.status !== 'PAUSED') throw new TRPCError({code:'PRECONDITION_FAILED',message:'Pause the agent before changing its settings.'});
      const editId = `edit:${randomUUID()}`;
      const lockId = `agent:${saved.id}`;
      let acquired = false;
      try {
        const claim = await prisma.$runCommandRaw({insert:'ExecutionLocks',documents:[{_id:lockId,executionId:editId,kind:'AGENT_EDIT',state:'PREPARING',createdAt:{$date:new Date().toISOString()}}]});
        if (claim.ok !== 1 || claim.n !== 1 || (Array.isArray(claim.writeErrors) && claim.writeErrors.length))
          throw new TRPCError({code:'CONFLICT',message:'An execution or retained lock is using this agent. Wait for the run or recover it before editing.'});
        acquired = true;
        const executionRead = await prisma.$runCommandRaw({find:'AgentExecutions',filter:{agentId:saved.id,state:{$ne:'COMPLETED'}},limit:1,batchSize:1});
        const executionCursor = executionRead.cursor as {firstBatch?:unknown[];id?:number|{$numberLong:string}} | undefined;
        const executionCursorId = typeof executionCursor?.id === 'object' ? executionCursor.id.$numberLong : String(executionCursor?.id);
        if (executionRead.ok !== 1 || !Array.isArray(executionCursor?.firstBatch) || executionCursorId !== '0' || executionCursor.firstBatch.length)
          throw new TRPCError({code:'PRECONDITION_FAILED',message:'This agent has unfinished execution history. Inspect account recovery before changing its settings.'});
        const routingChanged = saved.exchangeId !== input.exchangeId || saved.type !== input.type ||
          JSON.stringify([...saved.market.symbols].sort()) !== JSON.stringify([...input.market.symbols].sort());
        if (routingChanged) {
          for (const [collection, filter] of [
            ['CryptoPositionOwners',{agentId:saved.id,userId:ctx.auth.user.id,state:{$ne:'FLAT'}}],
            ['ManagedCryptoOrders',{agentId:saved.id,userId:ctx.auth.user.id,state:'SUBMITTING'}],
          ] as const) {
            const result = await prisma.$runCommandRaw({find:collection,filter,limit:1,batchSize:1});
            const cursor = result.cursor as {firstBatch?:unknown[];id?:number|{$numberLong:string}} | undefined;
            const cursorId = typeof cursor?.id === 'object' ? cursor.id.$numberLong : String(cursor?.id);
            if (result.ok !== 1 || !Array.isArray(cursor?.firstBatch) || cursorId !== '0')
              throw new TRPCError({code:'CONFLICT',message:'Could not verify position ownership. Keep the agent paused and inspect account reconciliation before changing its ticker or exchange.'});
            if (cursor.firstBatch.length)
              throw new TRPCError({code:'PRECONDITION_FAILED',message:'Resolve this agent’s tracked position or uncertain order before changing its ticker, exchange or market type.'});
          }
        }

        const credentialId = input.strategy === "ALGO_TRADING" ? null : input.credentialId;
        await assertOwnedReferences(ctx.auth.user.id, input.exchangeId, credentialId, input.strategy, input.type, input.capital.currency, input.strategyConfig.sizing?.mode === 'STOP_LOSS');
        await assertMarketSymbols(ctx.auth.user.id,input.exchangeId,input.type,input.market.symbols);
        return await prisma.agent.update({
          where: { id: input.id, userId: ctx.auth.user.id, status: saved.status, updatedAt: saved.updatedAt },
          data: {
            ...(saved.market.agentCycles !== input.market.agentCycles ? { nextRunAt: null } : {}),
            name: input.name, 
            type: input.type,
            strategy: input.strategy,
            credentialId,
            temperature: input.temperature,
            exchangeId: input.exchangeId,
            market: {
              symbols: input.market.symbols,
              agentCycles: input.market.agentCycles,
            },
            risk: {
              maxRiskPerTradePct: input.risk.maxRiskPerTradePct,
              maxDailyLossPct: input.risk.maxDailyLossPct,
              maxOpenPositions: input.risk.maxOpenPositions,
              maxTradesPerDay: input.risk.maxTradesPerDay,
              maxPositionsOpenedPerDay: input.risk.maxPositionsOpenedPerDay,
            },
            capital: {
              allocated: input.capital.allocated,
              currency: input.capital.currency,
            },
            strategyConfig: input.strategyConfig,
            llmModel: input.strategy === "ALGO_TRADING" ? "" : input.llmModel,
          },
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({code:'CONFLICT',message:'Could not verify or save this edit. Reload the agent and inspect recovery before retrying.'});
      } finally {
        try {
          const released = await prisma.$runCommandRaw({delete:'ExecutionLocks',deletes:[{q:{_id:lockId,executionId:editId},limit:1}]});
          if (released.ok !== 1 || typeof released.n !== 'number' || (acquired && released.n !== 1) || (Array.isArray(released.writeErrors) && released.writeErrors.length))
            throw new Error('Edit lock release was not confirmed');
        } catch {
          throw new TRPCError({code:'CONFLICT',message:'The edit lock could not be released. Keep the agent paused and inspect account recovery.'});
        }
      }
    }),
  runs: protectedProcedure
    .input(z.object({ agentId: z.string(), page: z.number().int().min(1).default(1) }))
    .query(async ({ ctx, input }) => {
      const agent = await prisma.agent.findFirst({ where: { id: input.agentId, userId: ctx.auth.user.id }, select: { id: true } });
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      return await prisma.agentRuns.findMany({
        where: {
          agentId: input.agentId,
        },
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      });
    }),
});
// export type definition of API
export type AgentRouter = typeof agentsRouter;
