import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '@/trpc/init';
import prisma from '@/lib/db';
import { chartInputSchema, loadChartCandles, searchChartSymbols } from './data';
import { agentChartSymbol } from '../types';

// Only public market payloads are shared. Agent context is always owner-scoped and uncached.
const cache = new Map<string, { value: unknown; expires: number }>();
const pending = new Map<string, Promise<unknown>>();
async function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  for (const [key, value] of cache) if (value.expires <= now) cache.delete(key);
  const hit = cache.get(key);
  if (hit) return hit.value as T;
  const inflight = pending.get(key);
  if (inflight) return inflight as Promise<T>;
  if (pending.size >= 8) throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Chart data is busy. Retry shortly.' });
  const promise = load().then(value => {
    if (cache.size >= 128) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, expires: Date.now() + ttl });
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

export const chartsRouter = createTRPCRouter({
  candles: protectedProcedure.input(chartInputSchema).query(({ input }) => cached(`candles:${input.source}:${input.symbol}:${input.interval}`, 20_000, () => loadChartCandles(input))),
  search: protectedProcedure.input(z.object({ source: z.enum(['YAHOO', 'DELTA', 'BINANCE']), query: z.string().trim().max(80).default('') })).query(({ input }) => cached(`search:${input.source}:${input.query.toLowerCase()}`, 60_000, () => searchChartSymbols(input.source, input.query))),
  agents: protectedProcedure.query(async ({ ctx }) => {
    const agents = await prisma.agent.findMany({ where: { userId: ctx.auth.user.id }, take: 100, orderBy: { name: 'asc' }, select: { id: true, name: true, exchangeId: true, market: true } });
    const exchanges = await prisma.exchange.findMany({ where: { userId: ctx.auth.user.id, id: { in: agents.map(a => a.exchangeId) }, sandbox: false }, select: { id: true, name: true, displayName: true } });
    return agents.flatMap(agent => {
      const exchange = exchanges.find(e => e.id === agent.exchangeId);
      if (!exchange) return [];
      return agent.market.symbols.flatMap(ticker => {
        const mapped = agentChartSymbol(exchange.name, ticker);
        return mapped ? [{ ...mapped, agentId: agent.id, agentName: agent.name, exchangeName: exchange.displayName ?? exchange.name }] : [];
      });
    });
  }),
});
