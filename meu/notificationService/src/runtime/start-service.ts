import { Worker } from "bullmq";
import { MongoClient } from "mongodb";
import { redisConnection } from "../infrastructure/redis";
import { createNotificationProcessor } from "../workers/notification-processor";
import { log, errMeta } from "../infrastructure/logger";

const NOTIFICATION_QUEUE_NAME = "notifications";
const CONCURRENCY = 5;

export async function main() {
  // ── Mongo ──
  const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  const dbName = process.env.DATABASE_NAME ?? "meu";

  const mongo = new MongoClient(uri);
  await mongo.connect();
  const db = mongo.db(dbName);
  log.info({ event: "db.connected" }, "Connected to MongoDB");

  await db.collection("Notification").createIndex({ deliveryJobId: 1 }, { unique: true, partialFilterExpression: { deliveryJobId: { $type: "string" } } });

  // ── BullMQ consumer ──
  const connection = redisConnection();
  connection.on("connect", () => log.info({ event: "redis.connected" }, "Redis connected"));
  connection.on("error", err => log.error({ event: "redis.failed", ...errMeta(err) }, "Redis connection failed"));
  const worker = new Worker(
    NOTIFICATION_QUEUE_NAME,
    createNotificationProcessor(db),
    { connection, concurrency: CONCURRENCY, lockDuration: 60_000 }
  );

  worker.on("failed", (job, err) => {
    log.error({ event: "worker.failed", jobId: job?.id, ...errMeta(err) }, "Job failed");
  });

  worker.on("error", err => log.error({ event: "worker.error", ...errMeta(err) }, "Notification worker error"));
  worker.on("stalled", jobId => log.warn({ event: "worker.stalled", jobId }, "Notification job stalled"));
  worker.on("ready", () => log.info({ event: "worker.ready" }, "Notification worker ready"));

  log.info(
    { event: "service.started", queue: NOTIFICATION_QUEUE_NAME, concurrency: CONCURRENCY },
    "Notification service started"
  );

  // ── Graceful shutdown ──
  const shutdown = async () => {
    log.info({ event: "service.stopping" }, "Notification service shutting down");
    try {
      await worker.close(); await mongo.close(); await connection.quit();
      log.info({ event: "service.stopped" }, "Notification service stopped");
      process.exit(0);
    } catch (err) {
      log.error({ event: "service.shutdown_failed", ...errMeta(err) }, "Notification service shutdown failed");
      process.exit(1);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
