import { auth } from '@/lib/auth';
import { initTRPC, TRPCError } from '@trpc/server';
import { headers } from 'next/headers';
import { cache } from 'react';
import superjson from 'superjson';
import { appLog, newRequestId, safeLogCode, safeProcedureName } from '@/lib/app-logger';
export const createTRPCContext = cache(async (requestId?: string) => {
  return { userId: 'user_123', requestId: requestId ?? newRequestId() };
});
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
});
const loggingMiddleware = t.middleware(async ({ ctx, type, path, next }) => {
  const startedAt = Date.now();
  const result = await next();
  const durationMs = Date.now() - startedAt;
  if (type === 'mutation') {
    const level = result.ok ? 'info' : result.error.code === 'INTERNAL_SERVER_ERROR' ? 'error' : 'warn';
    appLog(level, 'trpc.mutation.completed', {
      requestId: ctx.requestId,
      operation: safeProcedureName(path),
      durationMs,
      ...(result.ok ? {} : { code: safeLogCode(result.error.code) }),
    });
  } else if (type === 'query' && result.ok) {
    appLog('info', 'trpc.query.completed', {
      requestId: ctx.requestId,
      operation: safeProcedureName(path),
      durationMs,
    });
  } else if (!result.ok) {
    appLog(result.error.code === 'INTERNAL_SERVER_ERROR' ? 'error' : 'warn', 'trpc.query.failed', {
      requestId: ctx.requestId,
      operation: safeProcedureName(path),
      durationMs,
      code: safeLogCode(result.error.code),
    });
  }

  return result;
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure.use(loggingMiddleware);
export const protectedProcedure = baseProcedure.use(async ({ctx, next}) => {
  const session = await auth.api.getSession({
    headers: await headers()
  })
  if(!session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this route.'
    })
  }
  return next(
    { 
      ctx: {...ctx, auth: session,
      },
    });
});
