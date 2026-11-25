import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";
import { CredentialType } from "@/generated/prisma/enums";
import { encryptSecret } from "@/lib/security/encryption";
import { TRPCError } from "@trpc/server";

import { credentialCreateSchema, credentialUpdateSchema } from "../validation";
import {loadCredentialModels,searchCredentialModels} from './models';
import { COLLECTIONS } from "../../../../../shared/persistence/collections";

const ITEMS_PER_PAGE = 5;
const redactCredential = <T extends { apiKey: string }>(row: T) => ({ ...row, apiKey: "" });

export const credentialsRouter = createTRPCRouter({
  models: protectedProcedure.input(z.object({credentialId:z.string().regex(/^[a-f\d]{24}$/i),query:z.string().trim().max(100).default('')}))
    .query(async({ctx,input})=>searchCredentialModels(await loadCredentialModels(ctx.auth.user.id,input.credentialId),input.query)),
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * ITEMS_PER_PAGE;

      const matchedTypes = Object.values(CredentialType).filter((type) =>
        type.toLowerCase().replaceAll("_", " ").includes(input.search.trim().toLowerCase().replaceAll("_", " "))
      );

      const where = {
        userId: ctx.auth.user.id,
        OR: [
          { type: { in: matchedTypes } },
          { displayName: { contains: input.search.trim(), mode: "insensitive" as const } },
        ],
      };

      const [credentials, totalCount] = await Promise.all([
        prisma.credentials.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: ITEMS_PER_PAGE,
        }),
        prisma.credentials.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

      return {
        credentials: credentials.map(redactCredential),
        pagination: {
          page: input.page,
          totalPages,
          totalCount,
          hasNextPage: input.page < totalPages,
          hasPreviousPage: input.page > 1,
        },
      };
    }),
  listAll: protectedProcedure.query(async ({ ctx }) => {
    const rows = await prisma.credentials.findMany({
      where: { userId: ctx.auth.user.id },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(redactCredential);
  }),
  getByType: protectedProcedure
    .input(z.object({ type: z.enum(CredentialType) }))
    .query(async ({ ctx, input }) => {
      const credentials = await prisma.credentials.findMany({
        where: {
          userId: ctx.auth.user.id,
          type: input.type,
        },
      });
      return credentials.map(redactCredential);
    }),
  create: protectedProcedure
    .input(credentialCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const credentials = await prisma.credentials.create({
        data: {
          type: input.type,
          displayName: input.displayName || null,
          region: input.type === CredentialType.AMAZON_BEDROCK ? input.region : null,
          bedrockEndpoint: input.type === CredentialType.AMAZON_BEDROCK ? input.bedrockEndpoint ?? "runtime" : null,
          userId: ctx.auth.user.id,
          apiKey: encryptSecret(input.apiKey),
        },
      });
      return redactCredential(credentials);
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const credentials = await prisma.credentials.findUnique({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });
      return credentials ? redactCredential(credentials) : null;
    }),
  update: protectedProcedure
    .input(credentialUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const owned = await prisma.credentials.findFirst({ where: { id: input.id, userId: ctx.auth.user.id }, select: { id: true, type: true, region: true, bedrockEndpoint: true } });
      if (!owned) throw new TRPCError({ code: "NOT_FOUND", message: "Credential not found" });
      const changesExecution = owned.type !== input.type || Boolean(input.apiKey.trim()) ||
        (owned.type === CredentialType.AMAZON_BEDROCK && (
          input.region !== owned.region ||
          (input.bedrockEndpoint !== undefined && input.bedrockEndpoint !== (owned.bedrockEndpoint ?? 'runtime'))
        ));
      if (changesExecution) {
        const running = await prisma.agent.findFirst({where:{userId:ctx.auth.user.id,credentialId:input.id,status:'RUNNING'},select:{id:true}});
        if (running) throw new TRPCError({code:'PRECONDITION_FAILED',message:'Pause agents using this credential before changing its provider, API key, region or endpoint. Select a compatible model before resuming.'});
        const consumers = await prisma.agent.findMany({where:{userId:ctx.auth.user.id,credentialId:input.id},select:{id:true}});
        if (consumers.length) {
          const result = await prisma.$runCommandRaw({find:COLLECTIONS.ExecutionLocks,filter:{$or:[{_id:{$in:consumers.map(agent=>`agent:${agent.id}`)}},...consumers.map(agent=>({executionId:{$regex:`^${agent.id}-`}}))]},limit:1,batchSize:1,projection:{_id:1}});
          const cursor = result.cursor as {firstBatch?:unknown[];id?:number|{$numberLong:string}} | undefined;
          const cursorId = typeof cursor?.id === 'object' ? cursor.id.$numberLong : String(cursor?.id);
          if (result.ok !== 1 || !Array.isArray(cursor?.firstBatch) || cursorId !== '0' || cursor.firstBatch.length)
            throw new TRPCError({code:'CONFLICT',message:'Wait for credential consumers to finish their executions, or recover retained locks, before changing this credential.'});
        }
      }
      if (owned.type !== input.type && !input.apiKey.trim()) throw new TRPCError({code:"BAD_REQUEST",message:"Supply a new API key when changing provider type"});
      const credentials = await prisma.credentials.update({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        data: {
          type: input.type,
          ...(input.displayName !== undefined ? {displayName:input.displayName || null} : {}),
          region: input.type === CredentialType.AMAZON_BEDROCK ? input.region : null,
          bedrockEndpoint: input.type === CredentialType.AMAZON_BEDROCK ? input.bedrockEndpoint ?? owned.bedrockEndpoint ?? "runtime" : null,
          ...(input.apiKey.trim() ? { apiKey: encryptSecret(input.apiKey.trim()) } : {}),
        },
      });
      return redactCredential(credentials);
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const inUse = await prisma.agent.findFirst({ where: { userId: ctx.auth.user.id, credentialId: input.id }, select: { id: true } });
      if (inUse) throw new TRPCError({ code: "CONFLICT", message: "Reconfigure or delete agents using this credential before deleting it" });
      const credentials = await prisma.credentials.delete({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });
      return redactCredential(credentials);
    }),
});
// export type definition of API
export type CredentialsRouter = typeof credentialsRouter;
