import IORedis from "ioredis";
import { validPushEndpoint, validPushKeys } from "./push-validation";
import { Worker, type Job } from "bullmq";
import { MongoClient, type Db } from "mongodb";
import webpush from "web-push";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { log, errMeta } from "./logger";

const NOTIFICATION_QUEUE_NAME = "notifications";
const CONCURRENCY = 5;
const PUSH_CONCURRENCY = 5;

// ── Payload contract with schedulerService ─────────────────────────────
const notificationSchema = z.object({
  deliveryId: z.string().uuid().optional(),
  runId: z.string().max(128).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  type: z.enum(["ERROR", "WARNING", "INFO"]),
  source: z.enum(["AGENT", "EXCHANGE", "SCHEDULER", "SYSTEM"]).catch("SYSTEM"),
  status: z.string().optional(),
  title: z.string(),
  code: z.string(),
  message: z.string().optional(),
  metadata: z.unknown().optional(),
  userId: z.string().min(1),
  agentId: z.string().nullable().optional(),
  exchangeId: z.string().nullable().optional(),
});

/** Scheduler may emit SCHEDULER as a source; the DB enum only knows AGENT|SYSTEM|EXCHANGE */
const sourceMap = {
  AGENT: "AGENT",
  EXCHANGE: "EXCHANGE",
  SCHEDULER: "SYSTEM",
  SYSTEM: "SYSTEM",
} as const;

function redisConnection() {
  if (process.env.REDIS_SOCKET_PATH) return new IORedis({path:process.env.REDIS_SOCKET_PATH,maxRetriesPerRequest:null});
  return process.env.REDIS_URL
    ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
    : new IORedis({ host: process.env.REDIS_HOST ?? "localhost", port: Number(process.env.REDIS_PORT ?? 6379), maxRetriesPerRequest: null });
}

function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return false;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@meu.dev",
    publicKey,
    privateKey
  );
  return true;
}

type DeliveryContext = { deliveryId: string; runId?: string; jobId?: string; agentId?: string; exchangeId?: string };

export async function sendPush(db: Db, userId: string, payload: unknown, context: DeliveryContext = { deliveryId: randomUUID() }) {
  const deliveryLog = log.child(context);
  const startedAt = Date.now();
  if (!configureWebPush()) {
    deliveryLog.warn({ event: "push.skipped", reasonCode: "push_disabled" }, "Web push skipped");
    return;
  }
  const subs = await db.collection("PushSubscription").find({ userId }).toArray();
  if (subs.length === 0) {
    deliveryLog.info({ event: "push.skipped", reasonCode: "no_subscriptions" }, "Web push skipped");
    return;
  }
  let delivered = 0;
  let expired = 0;
  let invalid = 0;
  let failed = 0;
  // Queue concurrency limits jobs, not subscriptions within each job. Bound
  // HTTP fanout so a large subscription list cannot exhaust service sockets.
  for (let offset = 0; offset < subs.length; offset += PUSH_CONCURRENCY) {
    const results = await Promise.allSettled(subs.slice(offset, offset + PUSH_CONCURRENCY).map(async (sub) => {
      const subscriptionLog = deliveryLog.child({ subscriptionId: String(sub._id) });
      const subscriptionStartedAt = Date.now();
      try {
        if (!validPushEndpoint(sub.endpoint) || !validPushKeys({ p256dh: sub.p256dh, auth: sub.auth })) {
          invalid++;
          subscriptionLog.warn({ event: "push.invalid" }, "Stored push subscription is invalid");
          throw new Error("Invalid stored push destination or keys");
        }
        for (let attempt = 0; ; attempt++) {
          subscriptionLog.info({ event: "push.started", attempt: attempt + 1 }, "Push delivery attempt started");
          try {
            const details = webpush.generateRequestDetails(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
            const controller = new AbortController();
            let deadline: ReturnType<typeof setTimeout> | undefined;
            try {
              // Use native fetch: SDK socket timeouts were hanging in Bun and
              // occupying all notification slots. Abort the request as well as
              // bounding the promise, including connection establishment.
              const response = await Promise.race([
                fetch(details.endpoint, { method: details.method, headers: details.headers,
                  body: details.body, redirect: 'error', signal: controller.signal }),
                new Promise<never>((_, reject) => {
                  deadline = setTimeout(() => {
                    const error = Object.assign(new Error('Push delivery deadline exceeded'), { code: 'PUSH_DELIVERY_TIMEOUT' });
                    reject(error); controller.abort(error);
                  }, 12_000);
                }),
              ]);
              await response.body?.cancel();
              if (!response.ok) throw Object.assign(new Error('Push provider rejected delivery'), { statusCode: response.status });
            } finally { clearTimeout(deadline); }
            delivered++;
            subscriptionLog.info({ event: "push.delivered", attempt: attempt + 1, durationMs: Date.now() - subscriptionStartedAt }, "Push provider accepted notification");
            break;
          } catch (err) {
            const status = (err as { statusCode?: number } | null)?.statusCode;
            const transient = status == null || status === 429 || status >= 500;
            if (!transient || attempt >= 2) throw err;
            const retryDelayMs = 250 * 2 ** attempt;
            subscriptionLog.warn({ event: "push.retry", attempt: attempt + 1, retryDelayMs, ...errMeta(err) }, "Retrying transient push delivery failure");
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          }
        }
      } catch (err) {
        const status = (err as { statusCode?: number } | null)?.statusCode;
        if (status === 404 || status === 410) {
          try {
            await db.collection("PushSubscription").deleteOne({ _id: sub._id });
            expired++;
            subscriptionLog.info({ event: "push.expired", durationMs: Date.now() - subscriptionStartedAt, ...errMeta(err) }, "Expired push subscription removed");
          } catch (cleanupError) {
            subscriptionLog.error({ event: "push.failed", ...errMeta(cleanupError) }, "Expired push subscription cleanup failed");
            throw cleanupError;
          }
        } else {
          subscriptionLog.error({ event: "push.failed", durationMs: Date.now() - subscriptionStartedAt, ...errMeta(err) }, "Push subscription delivery failed");
          throw err;
        }
      }
    }));
    failed += results.filter(result => result.status === "rejected").length;
  }
  const summary = { event: "push.summary", count: subs.length, delivered, expired, invalid, failed, durationMs: Date.now() - startedAt };
  if (failed) deliveryLog.warn(summary, "Push delivery finished with failures");
  else deliveryLog.info(summary, "Push delivery finished");
}

export function createNotificationProcessor(db: Db) {
  return async (job: Job) => {
    const startedAt = Date.now();
    const parsed = notificationSchema.safeParse(job.data);
    if (!parsed.success) {
      log.error({ event: "notification.invalid", jobId: String(job.id), issueCount: parsed.error.issues.length }, "Invalid notification payload dropped");
      return;
    }
    const data = parsed.data;
    const context: DeliveryContext = {
      deliveryId: data.deliveryId ?? `${job.timestamp}-${job.id}`, jobId: String(job.id), runId: data.runId,
      agentId: data.agentId ?? undefined, exchangeId: data.exchangeId ?? undefined,
    };
    const deliveryLog = log.child(context);
    deliveryLog.info({ event: "notification.started", attempt: job.attemptsMade + 1, notificationType: data.type }, "Notification processing started");
    try {
      const result = await db.collection("Notification").updateOne(
        { deliveryJobId: context.deliveryId },
        { $setOnInsert: {
          userId: data.userId, agentId: data.agentId ?? null, exchangeId: data.exchangeId ?? null,
          type: data.type, source: sourceMap[data.source], status: "UNREAD", title: data.title,
          message: data.message ?? "", code: data.code,
          metadata: data.metadata == null ? null : typeof data.metadata === "string" ? data.metadata : JSON.stringify(data.metadata),
          readAt: null, createdAt: new Date(),
        } }, { upsert: true });
      deliveryLog.info({ event: "notification.persisted", inserted: result.upsertedCount > 0 }, "Notification persistence confirmed");
      try {
        await sendPush(db, data.userId, { title: data.title, body: data.message ?? "", tag: `${data.code}-${String(job.id)}` }, context);
      } catch (err) {
        // Optional push failure must not invalidate successful persistence.
        deliveryLog.error({ event: "push.failed", ...errMeta(err) }, "Web push delivery failed");
      }
      deliveryLog.info({ event: "notification.processed", durationMs: Date.now() - startedAt }, "Notification processing completed");
    } catch (err) {
      deliveryLog.error({ event: "notification.failed", durationMs: Date.now() - startedAt, ...errMeta(err) }, "Notification processing failed");
      throw err;
    }
  };
}

async function main() {
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

if (import.meta.main) main().catch((err) => {
  log.fatal({ event: "service.startup_failed", ...errMeta(err) }, "Notification service startup failed");
  process.exit(1);
});
