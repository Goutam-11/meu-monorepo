import type { Db } from "mongodb";
import webpush from "web-push";
import { randomUUID } from "node:crypto";
import { validPushEndpoint, validPushKeys } from "./validation";
import { log, errMeta } from "../../infrastructure/logger";
import type { DeliveryContext } from "../../contracts/notification";

const PUSH_CONCURRENCY = 5;

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
