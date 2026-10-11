import "server-only";
import { randomUUID } from "node:crypto";
import type { LogCode, LogEvent, LogLevel, LogOperation, LogSource } from "@/lib/log-safety";
import { isRequestId } from "@/lib/log-safety";
export { safeLogCode, safeProcedureName } from "@/lib/log-safety";

export function newRequestId() {
  return randomUUID();
}

export function appLog(
  level: LogLevel,
  event: LogEvent,
  fields: { requestId?: string; operation?: LogOperation; durationMs?: number; code?: LogCode; status?: number; source?: LogSource },
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: "meu_frontend",
    event,
    ...(isRequestId(fields.requestId) ? { requestId: fields.requestId } : {}),
    ...(fields.operation ? { operation: fields.operation } : {}),
    ...(Number.isFinite(fields.durationMs) ? { durationMs: Math.max(0, Math.round(fields.durationMs!)) } : {}),
    ...(fields.code ? { code: fields.code } : {}),
    ...(Number.isInteger(fields.status) && fields.status! >= 100 && fields.status! <= 599 ? { status: fields.status } : {}),
    ...(fields.source ? { source: fields.source } : {}),
  };
  const output = JSON.stringify(entry);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.info(output);
}
