import { reconciliationReport, readRows } from './reconciliation';
import { recoverDeltaExecution } from './recover-execution';
import { randomUUID } from 'node:crypto';
import { accountRiskSchema, defaultAccountRisk } from '../../../../../meu/schedulerService/src/brokers/crypto/cryptoAccount';
import { executionConnection, registerExecutionAccount, linkedExchangeIds } from './execution-account';
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";
import { exchangeKiteRequestToken, kiteLoginUrl } from "@/features/exchange/server/kite";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";
import { TRPCError } from "@trpc/server";
import {loadMarketCatalog, searchMarkets} from '@/features/markets/server/catalog';
import { COLLECTIONS } from "../../../../../shared/persistence/collections";

const ITEMS_PER_PAGE = 5;
const redactExchange = <T extends { apiKey: string; secret: string; accessToken?: string | null }>(row: T) => {
  const safe = { ...row, apiKey: "", secret: "" };
  delete safe.accessToken;
  return safe;
};

export const exchangeRouter = createTRPCRouter({
  markets: protectedProcedure.input(z.object({exchangeId:z.string().regex(/^[a-f0-9]{24}$/i).optional(),venue:z.literal('DELTA').optional(),scope:z.enum(['CRYPTO','STOCKS']),query:z.string().trim().max(80).default('')})).query(async({ctx,input})=>searchMarkets(await loadMarketCatalog(ctx.auth.user.id,input),input.query)),
  reconciliation: protectedProcedure.input(z.object({id:z.string().regex(/^[a-f0-9]{24}$/i)})).mutation(({ctx,input})=>reconciliationReport(input.id,ctx.auth.user.id)),
  pauseForRecovery: protectedProcedure.input(z.object({id:z.string().regex(/^[a-f0-9]{24}$/i)})).mutation(async({ctx,input})=>{
    const userId=ctx.auth.user.id;
    const connection=await prisma.exchange.findFirst({where:{id:input.id,userId},select:{id:true,name:true}});
    if(!connection || !['DELTA','BINANCE'].includes(connection.name.toUpperCase()))throw new TRPCError({code:'NOT_FOUND',message:'Supported crypto connection not found.'});
    const [link]=await readRows<{accountKey:string}>({find:COLLECTIONS.BrokerAccountLinks,filter:{_id:input.id,userId}},1);
    const ids=link ? await linkedExchangeIds(link.accountKey,userId) : [input.id];
    const result=await prisma.agent.updateMany({where:{userId,exchangeId:{in:ids},status:'RUNNING',OR:[{executionMode:null},{executionMode:{isSet:false}},{executionMode:{not:'PAPER'}}]},data:{status:'PAUSED',updatedAt:new Date()}});
    return {message:`Paused ${result.count} live agents. Any in-flight run must finish before recovery; pausing does not cancel broker orders.`};
  }),
  recoverExecution: protectedProcedure.input(z.object({id:z.string().regex(/^[a-f0-9]{24}$/i)})).mutation(async({ctx,input})=>{
    const userId=ctx.auth.user.id;
    if(!await prisma.exchange.findFirst({where:{id:input.id,userId},select:{id:true}}))throw new TRPCError({code:'NOT_FOUND',message:'Exchange connection not found.'});
    const [lock]=await readRows<{executionId:string;kind?:string}>({find:COLLECTIONS.ExecutionLocks,filter:{_id:`exchange:${input.id}`},projection:{executionId:1,kind:1}},1);
    if(!lock) return {message:'No retained execution lock exists on this connection.'};
    if(lock.kind)throw new TRPCError({code:'PRECONDITION_FAILED',message:'Account preparation or another recovery is in progress. Its lock cannot be released here.'});
    const [execution]=await readRows<{agentId:string}>({find:COLLECTIONS.AgentExecutions,filter:{_id:lock.executionId},projection:{agentId:1}},1);
    const agent=execution ? await prisma.agent.findFirst({where:{id:execution.agentId,userId,exchangeId:input.id,status:'PAUSED'}}) : null;
    if(!agent)throw new TRPCError({code:'PRECONDITION_FAILED',message:'The holding execution is active or its agent is unavailable. Scan the account to inspect its run ID.'});
    return {message:await recoverDeltaExecution(agent,userId)};
  }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const rows = await prisma.exchange.findMany({
      where: {
        userId: ctx.auth.user.id,
      },
    });
    return rows.map(redactExchange);
  }),
  getPaginated: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * ITEMS_PER_PAGE;

      const where = {
        userId: ctx.auth.user.id,
        OR: [
          { name: { contains: input.search.trim(), mode: "insensitive" as const } },
          { displayName: { contains: input.search.trim(), mode: "insensitive" as const } },
        ],
      };

      const [exchanges, totalCount] = await Promise.all([
        prisma.exchange.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: ITEMS_PER_PAGE,
        }),
        prisma.exchange.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

      return {
        exchanges: exchanges.map(redactExchange),
        pagination: {
          page: input.page,
          totalPages,
          totalCount,
          hasNextPage: input.page < totalPages,
          hasPreviousPage: input.page > 1,
        },
      };
    }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.enum(["BINANCE", "BYBIT", "KRAKEN", "KUCOIN", "DELTA", "ZERODHA"]),
        displayName: z.string().trim().max(80).optional(),
        apiKey: z.string().min(1),
        secret: z.string().min(1),
        sandbox: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const created = await prisma.exchange.create({
        data: {
          userId: ctx.auth.user.id,
          name: input.name,
          displayName: input.displayName || null,
          apiKey: encryptSecret(input.apiKey),
          secret: encryptSecret(input.secret),
          sandbox: input.sandbox,
          urls: { public: "", private: "" },
        },
      });
      return redactExchange(created);
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const exchange = await prisma.exchange.findFirst({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });
      return exchange ? redactExchange(exchange) : null;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.enum(["BINANCE", "BYBIT", "KRAKEN", "KUCOIN", "DELTA", "ZERODHA"]),
        displayName: z.string().trim().max(80).optional(),
        apiKey: z.string().optional().default(""),
        secret: z.string().optional().default(""),
        sandbox: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: { displayName?:string|null; name: string; apiKey?: string; secret?: string; sandbox: boolean } = {
        ...(input.displayName !== undefined ? {displayName:input.displayName || null} : {}),
        name: input.name,
        sandbox: input.sandbox,
      };
      if (input.apiKey.trim()) data.apiKey = encryptSecret(input.apiKey.trim());
      if (input.secret.trim()) data.secret = encryptSecret(input.secret.trim());
      const exchange = await prisma.exchange.update({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        data,
      });
      return redactExchange(exchange);
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const inUse = await prisma.agent.findFirst({ where: { userId: ctx.auth.user.id, exchangeId: input.id }, select: { id: true } });
      if (inUse) throw new TRPCError({ code: "CONFLICT", message: "Reconfigure or delete agents using this exchange before deleting it" });
      const exchange = await prisma.exchange.delete({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });
      return redactExchange(exchange);
    }),
  executionState: protectedProcedure.input(z.object({ id:z.string() })).query(async ({ ctx,input }) => {
    const connection = await prisma.exchange.findFirst({ where:{id:input.id,userId:ctx.auth.user.id},select:{id:true,name:true} });
    if (!connection) throw new TRPCError({code:'NOT_FOUND',message:'Exchange not found'});
    const links = await prisma.$runCommandRaw({find:COLLECTIONS.BrokerAccountLinks,filter:{_id:input.id,userId:ctx.auth.user.id},limit:1});
    const link = (links.cursor as {firstBatch?:{accountKey:string}[]})?.firstBatch?.[0];
    if (!link) return { initialized:false,limits:defaultAccountRisk,positions:[],orders:[] };
    const account = await prisma.$runCommandRaw({find:COLLECTIONS.BrokerAccounts,filter:{_id:link.accountKey,userId:ctx.auth.user.id},limit:1});
    const limits = accountRiskSchema.parse((account.cursor as {firstBatch?:{limits:unknown}[]})?.firstBatch?.[0]?.limits);
    const [owners,orderRows] = await Promise.all([
      prisma.$runCommandRaw({find:COLLECTIONS.CryptoPositionOwners,filter:{accountKey:link.accountKey,userId:ctx.auth.user.id,state:{$ne:'FLAT'}},limit:101}),
      prisma.$runCommandRaw({find:COLLECTIONS.ManagedCryptoOrders,filter:{accountKey:link.accountKey,userId:ctx.auth.user.id},sort:{createdAt:-1},limit:50}),
    ]);
    type OwnerRow={agentId:string;symbol:string;state:string;contracts?:number;side?:string;entryPrice?:number;collateral?:number;lastVerifiedAt?:{$date:string}};
    type OrderRow={clientOrderId:string;agentId:string;symbol:string;state:string;brokerOrderId?:string;brokerStatus?:string;filled?:number;remaining?:number;side:string;amount:number;reduceOnly:boolean};
    const positions = (owners.cursor as {firstBatch?:OwnerRow[]})?.firstBatch??[];
    if (positions.length>100) throw new TRPCError({code:'PRECONDITION_FAILED',message:'Too many positions to display safely'});
    const orders = (orderRows.cursor as {firstBatch?:OrderRow[]})?.firstBatch??[];
    const agents = await prisma.agent.findMany({where:{userId:ctx.auth.user.id,id:{in:[...new Set([...positions,...orders].map(row=>row.agentId))]}},select:{id:true,name:true,strategy:true}});
    const label = (id:string) => agents.find(a=>a.id===id)?.name??'Deleted agent';
    return { initialized:true,limits,
      positions:positions.map(p=>({agentId:p.agentId,agentName:label(p.agentId),symbol:p.symbol,state:p.state,contracts:p.contracts??null,side:p.side??null,entryPrice:p.entryPrice??null,collateral:p.collateral??null,lastVerifiedAt:p.lastVerifiedAt?.$date??null})),
      orders:orders.map(o=>({clientOrderId:o.clientOrderId,agentId:o.agentId,agentName:label(o.agentId),symbol:o.symbol,state:o.state,brokerOrderId:o.brokerOrderId??null,brokerStatus:o.brokerStatus??null,filled:o.filled??null,remaining:o.remaining??null,side:o.side,amount:o.amount,reduceOnly:o.reduceOnly})),
    };
  }),
  updateAccountRisk: protectedProcedure.input(z.object({id:z.string(),limits:accountRiskSchema})).mutation(async ({ctx,input}) => {
    const {exchange} = await executionConnection(input.id,ctx.auth.user.id);
    const {accountKey} = await registerExecutionAccount(exchange,input.id,ctx.auth.user.id);
    const ids = await linkedExchangeIds(accountKey,ctx.auth.user.id);
    const executionId=`risk:${randomUUID()}`,lockId=`account:${accountKey}`;
    const lock = await prisma.$runCommandRaw({insert:COLLECTIONS.ExecutionLocks,documents:[{_id:lockId,executionId,kind:'START_PREFLIGHT',state:'PREPARING',createdAt:{$date:new Date().toISOString()}}]});
    if(lock.ok!==1||lock.n!==1||(Array.isArray(lock.writeErrors)&&lock.writeErrors.length)) throw new TRPCError({code:'CONFLICT',message:'Account execution is busy or requires reconciliation'});
    try {
      if(await prisma.agent.count({where:{userId:ctx.auth.user.id,exchangeId:{in:ids},status:'RUNNING',OR:[{executionMode:null},{executionMode:{isSet:false}},{executionMode:{not:'PAPER'}}]}}))
        throw new TRPCError({code:'PRECONDITION_FAILED',message:'Pause all live agents on this broker account before changing shared limits'});
      const result = await prisma.$runCommandRaw({update:COLLECTIONS.BrokerAccounts,updates:[{q:{_id:accountKey,userId:ctx.auth.user.id},u:{$set:{limits:input.limits,updatedAt:{$date:new Date().toISOString()}}}}]});
      if(result.ok!==1||result.n!==1||(Array.isArray(result.writeErrors)&&result.writeErrors.length)) throw new TRPCError({code:'INTERNAL_SERVER_ERROR',message:'Account limits were not saved'});
      return {limits:input.limits};
    } finally {
      const release=await prisma.$runCommandRaw({delete:COLLECTIONS.ExecutionLocks,deletes:[{q:{_id:lockId,executionId},limit:1}]});
      if(release.ok!==1||release.n!==1) throw new TRPCError({code:'CONFLICT',message:'Account settings lock could not be released; reconcile before starting'});
    }
  }),
  // Zerodha daily re-auth: exchange a login request_token for an access token
  kiteAuth: protectedProcedure
    .input(z.object({ id: z.string(), requestToken: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      return await exchangeKiteRequestToken(
        input.id,
        ctx.auth.user.id,
        input.requestToken.trim(),
      );
    }),
  kiteLoginUrl: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const exchange = await prisma.exchange.findFirst({
        where: { id: input.id, userId: ctx.auth.user.id },
        select: { apiKey: true, name: true },
      });
      if (!exchange) return { loginUrl: null };
      return { loginUrl: kiteLoginUrl(decryptSecret(exchange.apiKey ?? "")) };
    }),
});
// export type definition of API
export type ExchangeRouter = typeof exchangeRouter;
