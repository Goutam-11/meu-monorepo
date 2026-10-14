import IORedis from "ioredis";

export function redisConnection() {
  if (process.env.REDIS_SOCKET_PATH) return new IORedis({path:process.env.REDIS_SOCKET_PATH,maxRetriesPerRequest:null});
  return process.env.REDIS_URL
    ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new IORedis({ host: process.env.REDIS_HOST ?? "localhost", port: Number(process.env.REDIS_PORT ?? 6379), maxRetriesPerRequest: null });
}
