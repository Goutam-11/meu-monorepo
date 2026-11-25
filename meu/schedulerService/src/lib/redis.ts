import IORedis from "ioredis";
import { ObjectId, type Db } from "mongodb";
import { logger, errMeta } from "./logger";
import { COLLECTIONS } from "../../../../shared/persistence/collections";

const log = logger.child({ module: "redis" });

const redisOptions = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
};
export const redis = process.env.REDIS_SOCKET_PATH
  ? new IORedis({ path: process.env.REDIS_SOCKET_PATH, maxRetriesPerRequest: null })
  : process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new IORedis(redisOptions);

redis.on("error", (err) => {
  log.error(errMeta(err), "Redis connection error");
});
redis.on("connect", () => {
  log.info("Redis connected");
});

const AGENT_KEY_PREFIX = "meu:agent:";
const RUNNING_AGENTS_KEY = "meu:agents:running";
const EXCHANGE_KEY_PREFIX = "meu:exchange:";
export const EXCHANGE_CACHE_TTL_SECONDS = 60;
// Safety net: registry entries expire if neither the watcher nor scheduler
// refreshes them. The scheduler's reconcile pass touches them every tick.
export const AGENT_CACHE_TTL_SECONDS = parseInt(process.env.AGENT_CACHE_TTL_SECONDS || String(24 * 60 * 60));

/** Non-secret agent config cached in Redis. Never store credentials/secrets here. */
export type AgentCacheEntry = {
  id: string;
  userId: string;
  status: string;
  type?: string;
  strategy?: string;
  llmModel?: string;
  exchangeId?: string | null;
  credentialId?: string | null;
  market?: { symbols?: string[]; agentCycles?: number };
  temperature?: number;
  risk?: unknown;
  capital?: unknown;
  nextRunAt?: number;
};

export async function getAgentCached(id: string): Promise<AgentCacheEntry | null> {
  const raw = await redis.get(AGENT_KEY_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AgentCacheEntry;
  } catch (err) {
    log.warn({ agentId: id, ...errMeta(err) }, "Corrupt agent cache entry, deleting");
    await redis.del(AGENT_KEY_PREFIX + id).catch(() => {});
    return null;
  }
}

export async function setAgentCached(agent: AgentCacheEntry): Promise<void> {
  const key = AGENT_KEY_PREFIX + agent.id;
  const pipeline = redis.pipeline();
  pipeline.set(key, JSON.stringify(agent), "EX", AGENT_CACHE_TTL_SECONDS);
  if (agent.status === "RUNNING") {
    pipeline.sadd(RUNNING_AGENTS_KEY, agent.id);
  } else {
    pipeline.srem(RUNNING_AGENTS_KEY, agent.id);
  }
  await pipeline.exec();
}

/** Refresh the TTL on an agent's registry entry without rewriting its value. */
export async function touchAgentTtl(id: string): Promise<void> {
  await redis.expire(AGENT_KEY_PREFIX + id, AGENT_CACHE_TTL_SECONDS);
}

export async function deleteAgentCached(id: string): Promise<void> {
  await redis.del(AGENT_KEY_PREFIX + id);
  await redis.srem(RUNNING_AGENTS_KEY, id);
}

export async function listRunningAgentsCached(): Promise<string[]> {
  return redis.smembers(RUNNING_AGENTS_KEY);
}

/**
 * Cache-aside read of exchange metadata (name/urls only).
 * Secrets are NEVER cached — fetch them fresh from Mongo via getExchangeSecrets().
 */
export async function getExchangeCached(
  db: Db,
  exchangeId: string
): Promise<{ id: string; userId?: string; name: string; urls?: { public?: string; private?: string } } | null> {
  const key = EXCHANGE_KEY_PREFIX + exchangeId;
  const raw = await redis.get(key);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      await redis.del(key).catch(() => {});
    }
  }
  const doc = await db.collection(COLLECTIONS.Exchange).findOne(
    { _id: new ObjectId(exchangeId) },
    { projection: { name: 1, urls: 1, userId: 1 } }
  );
  if (!doc) return null;
  const entry = {
    id: exchangeId,
    userId: doc.userId,
    name: doc.name,
    urls: doc.urls,
  };
  await redis.set(key, JSON.stringify(entry), "EX", EXCHANGE_CACHE_TTL_SECONDS);
  return entry;
}

/** Invalidate the exchange cache entry (used by the change-stream watcher). */
export async function invalidateExchangeCached(id: string): Promise<void> {
  await redis.del(EXCHANGE_KEY_PREFIX + id);
}

export async function closeRedis(): Promise<void> {
  await redis.quit().catch(() => redis.disconnect());
}
