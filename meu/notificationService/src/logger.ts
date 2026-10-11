import pino from "pino";

const events = new Set([
  "notification.started", "notification.invalid", "notification.persisted", "notification.processed", "notification.failed",
  "push.skipped", "push.started", "push.retry", "push.delivered", "push.failed", "push.expired", "push.invalid", "push.summary",
  "db.connected", "redis.connected", "redis.failed", "worker.ready", "worker.failed", "worker.error", "worker.stalled",
  "service.started", "service.stopping", "service.stopped", "service.shutdown_failed", "service.startup_failed",
]);
const errorNames = new Set(["Error", "TypeError", "RangeError", "SyntaxError", "WebPushError", "MongoServerError", "MongoNetworkError", "AbortError"]);

export function errMeta(err: unknown) {
  const name = err instanceof Error && errorNames.has(err.name) ? err.name : "Error";
  const status = err && typeof err === "object" && "statusCode" in err ? err.statusCode : undefined;
  const code = err && typeof err === "object" && "code" in err ? err.code : undefined;
  return { err: {
    name,
    ...(typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599 ? { statusCode: status } : {}),
    ...(typeof code === "number" && Number.isSafeInteger(code) || code === "PUSH_DELIVERY_TIMEOUT" ? { code } : {}),
  } };
}

// Log only operational metadata, never SDK responses or notification/subscription objects.
function safeFields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const fields = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (typeof fields.event === "string" && events.has(fields.event)) out.event = fields.event;
  if (fields.service === "notificationService") out.service = fields.service;
  for (const key of ["deliveryId", "runId", "jobId", "subscriptionId", "agentId", "exchangeId"]) {
    if (typeof fields[key] === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(fields[key])) out[key] = fields[key];
  }
  for (const key of ["durationMs", "attempt", "retryDelayMs", "count", "delivered", "failed", "expired", "invalid", "issueCount", "concurrency"]) {
    if (typeof fields[key] === "number" && Number.isFinite(fields[key]) && fields[key] >= 0) out[key] = fields[key];
  }
  if (fields.reasonCode === "push_disabled" || fields.reasonCode === "no_subscriptions") out.reasonCode = fields.reasonCode;
  if (fields.notificationType === "ERROR" || fields.notificationType === "WARNING" || fields.notificationType === "INFO") out.notificationType = fields.notificationType;
  if (fields.queue === "notifications") out.queue = fields.queue;
  if (typeof fields.inserted === "boolean") out.inserted = fields.inserted;
  if (fields.err instanceof Error) out.err = errMeta(fields.err).err;
  else if (fields.err && typeof fields.err === "object") {
    const error = fields.err as Record<string, unknown>;
    out.err = errMeta(Object.assign(new Error(), {
      name: typeof error.name === "string" ? error.name : "Error", code: error.code, statusCode: error.statusCode,
    })).err;
  }
  return out;
}

export const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "notificationService" },
  formatters: { bindings: safeFields },
  hooks: {
    logMethod(args, method) {
      if (args[0] && typeof args[0] === "object") args[0] = safeFields(args[0]);
      method.apply(this, args);
    },
  },
  ...(process.env.PRETTY_LOGS === "true" && process.env.NODE_ENV !== "production"
    ? { transport: { target: "pino-pretty" } } : {}),
});
// Pino resets the bindings formatter on child creation.
const createChild = log.child;
log.child = function (this: typeof log, bindings: pino.Bindings, options?: pino.ChildLoggerOptions) {
  return Reflect.apply(createChild, this, [safeFields(bindings), options]);
} as unknown as typeof log.child;
