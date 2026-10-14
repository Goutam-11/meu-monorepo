const reportCodes = {
  query: { query_failed: "CLIENT_QUERY_FAILED" },
  mutation: { mutation_failed: "CLIENT_MUTATION_FAILED" },
  settings: { settings_load_failed: "CLIENT_SETTINGS_LOAD_FAILED", settings_save_failed: "CLIENT_SETTINGS_SAVE_FAILED" },
  dashboard: { render_failed: "CLIENT_RENDER_FAILED" },
  notification: { subscription_failed: "CLIENT_SUBSCRIPTION_FAILED", push_unsubscribe_failed: "CLIENT_PUSH_UNSUBSCRIBE_FAILED", push_not_configured: "CLIENT_PUSH_NOT_CONFIGURED" },
} as const;

export type ClientReportSource = keyof typeof reportCodes;
export type ClientReport = { source: ClientReportSource; code: string };

export function parseClientReport(payload: unknown): ClientReport | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  if (!Object.hasOwn(payload, "source") || !Object.hasOwn(payload, "event")) return null;
  const { source, event } = payload as { source?: unknown; event?: unknown };
  if (typeof source !== "string" || !Object.hasOwn(reportCodes, source) || typeof event !== "string") return null;
  const codes = reportCodes[source as ClientReportSource] as Record<string, string>;
  if (!Object.hasOwn(codes, event)) return null;
  return { source: source as ClientReportSource, code: codes[event] };
}

export async function readBoundedJsonBody(req: Request, maxBytes = 512): Promise<{ ok: true; payload: unknown } | { ok: false; reason: "too_large" | "invalid" }> {
  const reader = req.body?.getReader();
  if (!reader) return { ok: false, reason: "invalid" };
  const decoder = new TextDecoder();
  let body = "";
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too_large" };
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return { ok: true, payload: JSON.parse(body) as unknown };
  } catch {
    return { ok: false, reason: "invalid" };
  } finally {
    reader.releaseLock();
  }
}
