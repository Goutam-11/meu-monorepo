import type { Db } from "mongodb";
import type { Job } from "bullmq";
import { notificationSchema, sourceMap, type DeliveryContext } from "../contracts/notification";
import { sendPush } from "../channels/web-push/delivery";
import { log, errMeta } from "../infrastructure/logger";
import { COLLECTIONS } from "../../../../shared/persistence/collections";

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
      const result = await db.collection(COLLECTIONS.Notification).updateOne(
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
