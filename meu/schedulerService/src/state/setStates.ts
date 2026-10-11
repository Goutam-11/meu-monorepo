import type { Document } from "mongodb";
import { logger } from "@/lib/logger";
import { setAgentCached, deleteAgentCached, listRunningAgentsCached, type AgentCacheEntry } from "@/lib/redis";

const log = logger.child({ module: "bootstrap" });

export function toAgentCacheEntry(a: Document & { market?: { agentCycles?: number } }): AgentCacheEntry {
  const id = a._id.toString();
  return {
    id,
    userId: a.userId,
    status: a.status,
    type: a.type,
    llmModel: a.llmModel,
    strategy: a.strategy,
    temperature: a.temperature,
    exchangeId: a.exchangeId?.toString() ?? null,
    credentialId: a.credentialId?.toString() ?? null,
    market: a.market,
    risk: a.risk,
    capital: a.capital,
    nextRunAt: a.nextRunAt ? new Date(a.nextRunAt).getTime() : undefined,
  };
}

export async function bootstrapAgents(agentsCol: Document[]) {
  for (const a of agentsCol) {
    await setAgentCached(toAgentCacheEntry(a));
  }
  log.info({ count: agentsCol.length }, "Bootstrapped running agents into Redis registry");
}

/**
 * Reconcile the Redis registry against Mongo (source of truth).
 * Called periodically so state self-heals even if change streams die.
 */
export async function reconcileAgents(agentCollection: import("mongodb").Collection<Document>) {
  const running = await agentCollection
    .find({ status: "RUNNING" })
    .project({
      _id: 1, userId: 1, status: 1, type: 1, strategy: 1, market: 1, risk: 1,
      capital: 1, temperature: 1, llmModel: 1, credentialId: 1, exchangeId: 1, nextRunAt: 1,
    })
    .toArray();

  const mongoIds = new Set<string>();
  for (const a of running) {
    mongoIds.add(a._id.toString());
    await setAgentCached(toAgentCacheEntry(a));
  }

  // Remove registry entries that are no longer RUNNING in Mongo
  const cachedIds = await listRunningAgentsCached();
  const stale = cachedIds.filter((id) => !mongoIds.has(id));
  for (const id of stale) {
    await deleteAgentCached(id);
  }
  if (stale.length > 0) {
    log.info({ removed: stale.length }, "Reconcile removed stale agents from Redis registry");
  }

  return running;
}
