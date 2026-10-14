import { exchangeRouter } from '@/features/exchange/server/router';
import { createTRPCRouter, protectedProcedure } from '../init';
import { agentsRouter } from '@/features/agents/server/router';
import { credentialsRouter } from '@/features/credentials/server/router';
import { notificationsRouter } from '@/features/notifications/server/router';
import { settingsRouter } from '@/features/settings/server/router';
import z from 'zod';
import { getExchangeData } from '@/features/exchange/server/exchange-data';
import { backtestsRouter } from '@/features/backtests/server/router';
import { chartsRouter } from '@/features/charts/server/router';
export const appRouter = createTRPCRouter({
  agents: agentsRouter,
  backtests: backtestsRouter,
  charts: chartsRouter,
  exchange: exchangeRouter,
  credentials: credentialsRouter,
  notifications: notificationsRouter,
  settings: settingsRouter,
  exData: createTRPCRouter({
    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const data = await getExchangeData(input.id, ctx.auth.user.id, ctx.requestId);
  
        return {
          ...data,
          hasError:
            data.positionsError ||
            data.tradesError ||
            data.balanceError,
        };
      }),
  }),
});
// export type definition of API
export type AppRouter = typeof appRouter;
