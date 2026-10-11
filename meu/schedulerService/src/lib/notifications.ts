import { randomUUID } from "node:crypto";
import { Queue } from "bullmq";
import type { Collection, Document } from "mongodb";
import { redis } from "@/lib/redis";
import { logger, errMeta, getCurrentRunId } from "@/lib/logger";

const log = logger.child({ module: "notifications" });

export const NOTIFICATION_QUEUE_NAME = "notifications";

/**
 * Domain event emitted by this service. The notification service owns the
 * Notification collection; this service never writes it directly (except in
 * legacy NOTIFICATION_TRANSPORT=db mode).
 */
export type AgentNotification = {
  deliveryId?: string;
  runId?: string;
  type: "ERROR" | "WARNING" | "INFO";
  source: "AGENT" | "EXCHANGE" | "SCHEDULER";
  status?: "UNREAD";
  title: string;
  code: string;
  message?: string;
  metadata?: unknown;
  userId: string;
  agentId?: string | null;
  exchangeId?: string | null;
};

export const notificationQueue = new Queue<AgentNotification>(NOTIFICATION_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { count: 5000 },
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

notificationQueue.on("error", (err) => {
  log.error(errMeta(err), "Notification queue error");
});

let legacyCollection: Collection<Document> | null = null;

/** Register the legacy direct-to-Mongo target (NOTIFICATION_TRANSPORT=db). */
export function setLegacyNotificationCollection(collection: Collection<Document>) {
  legacyCollection = collection;
}

/**
 * Emit a notification event. Default transport is the `notifications` BullMQ
 * queue consumed by the notification service. Set NOTIFICATION_TRANSPORT=db
 * to write straight to Mongo (legacy behaviour, for use before the
 * notification service consumer exists).
 */
export async function emitNotification(doc: AgentNotification): Promise<void> {
  const deliveryId = doc.deliveryId ?? randomUUID();
  const runId = getCurrentRunId() ?? doc.runId;
  const notification = { ...doc, deliveryId, ...(runId ? { runId } : {}) };
  try {
    if (process.env.NOTIFICATION_TRANSPORT === "db") {
      if (!legacyCollection) {
        log.warn({ event: "notification.skipped", deliveryId, runId, skipReason: "missing_collection" }, "DB transport selected but no collection registered; dropping notification");
        return;
      }
      await legacyCollection.insertOne({
        ...notification,
        status: "UNREAD",
        readAt: null,
        createdAt: new Date(),
      } as Document);
      log.info({ event: "notification.persisted", deliveryId, runId, agentId: doc.agentId }, "Notification persisted through legacy transport");
      return;
    }

    const job = await notificationQueue.add("notification", { ...notification, status: "UNREAD" });
    log.info({ event: "notification.queued", deliveryId, runId, jobId: job.id, agentId: doc.agentId, exchangeId: doc.exchangeId }, "Notification queued");
  } catch (err) {
    // Never let notification failures crash the calling flow
    log.error({ event: "notification.emit_failed", ...errMeta(err), deliveryId, runId, agentId: doc.agentId }, "Failed to emit notification");
  }
}
