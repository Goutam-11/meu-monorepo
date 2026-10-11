import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";

const context = new AsyncLocalStorage<Record<string, unknown>>();
const sensitiveKey = /(?:secret|token|password|cookie|authorization|credential|api[_-]?key|llm[_-]?key|private[_-]?key|prompt|response|payload|headers)/i;
const errorNames = new Set(["Error", "TypeError", "RangeError", "SyntaxError", "OrderRejectedError", "ExchangeError", "NetworkError", "RequestTimeout", "AuthenticationError", "PermissionDenied", "InsufficientFunds", "InvalidOrder", "RateLimitExceeded", "MongoServerError", "AbortError", "TimeoutError", "DeltaDataError", "DeltaDataValidationError", "MissedLiveCandlesError"]);

// Broker/SDK errors can embed signed URLs, headers and credentials in arbitrary text.
// Preserve classification; never send their message, stack, cause or response to stdout.
export function errMeta(err: unknown) {
  const name = err instanceof Error && errorNames.has(err.name) ? err.name : "Error";
  const code = err && typeof err === "object" && "code" in err ? err.code : undefined;
  return { err: { name, ...(typeof code === "number" && Number.isSafeInteger(code) ? { code } : {}) } };
}

export function sanitizeLogValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) return errMeta(value).err;
  if (value === null || typeof value !== "object") return value;
  if (depth >= 12 || seen.has(value)) return "[OMITTED]";
  seen.add(value);
  if (Array.isArray(value)) return value.slice(0, 100).map(item => sanitizeLogValue(item, depth + 1, seen));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (/^(inputTokens|outputTokens|totalTokens)$/.test(key) && typeof item === "number" && Number.isFinite(item)) out[key] = item;
    else if (sensitiveKey.test(key) || /^(message|stack|cause|reason)$/i.test(key)) out[key] = "[REDACTED]";
    else if (/^(err|error)$/i.test(key)) {
      out[key] = item instanceof Error ? errMeta(item).err
        : item && typeof item === "object" ? sanitizeLogValue(item, depth + 1, seen) : "[REDACTED]";
    } else out[key] = sanitizeLogValue(item, depth + 1, seen);
  }
  return out;
}

export function getCurrentRunId(): string | undefined {
  const runId = context.getStore()?.runId;
  return typeof runId === "string" ? runId : undefined;
}

export function runWithLogContext<T>(bindings: Record<string, unknown>, operation: () => T): T {
  return context.run(sanitizeLogValue(bindings) as Record<string, unknown>, operation);
}

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "schedulerService" },
  mixin: () => ({ ...context.getStore() }),
  formatters: { bindings: bindings => sanitizeLogValue(bindings) as Record<string, unknown> },
  hooks: {
    logMethod(args, method) {
      // Call sites use static event messages; structured values are sanitized recursively.
      if (args[0] && typeof args[0] === "object") args[0] = sanitizeLogValue(args[0]);
      method.apply(this, args);
    },
  },
  ...(process.env.NODE_ENV !== "production" && process.env.PRETTY_LOGS !== "false"
    ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" } } }
    : {}),
});

// Pino deliberately resets its bindings formatter for children; sanitize before
// child creation too, including nested children created by module loggers.
const createChild = logger.child;
logger.child = function (this: typeof logger, bindings: pino.Bindings, options?: pino.ChildLoggerOptions) {
  return Reflect.apply(createChild, this, [sanitizeLogValue(bindings), options]);
} as typeof logger.child;

export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(sanitizeLogValue(bindings) as Record<string, unknown>);
}
