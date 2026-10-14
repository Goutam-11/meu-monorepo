export type ClientErrorSource = "query" | "mutation" | "settings" | "dashboard" | "notification";
export type ClientErrorEvent =
  | "query_failed" | "mutation_failed" | "settings_load_failed" | "settings_save_failed" | "render_failed"
  | "subscription_failed" | "push_unsubscribe_failed" | "push_not_configured";

const recentReports = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60_000;

export function reportClientError(source: ClientErrorSource, event: ClientErrorEvent) {
  if (typeof window === "undefined") return;
  const key = `${source}:${event}`;
  const now = Date.now();
  const lastSent = recentReports.get(key);
  if (lastSent && now - lastSent < DEDUPE_WINDOW_MS) return;
  if (recentReports.size >= 32) {
    for (const [reportedKey, timestamp] of recentReports) {
      if (now - timestamp >= DEDUPE_WINDOW_MS) recentReports.delete(reportedKey);
    }
  }
  if (recentReports.size >= 32) return;
  recentReports.set(key, now);
  void fetch("/api/client-errors", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, event }),
    keepalive: true,
  }).catch(() => {
    // Diagnostic reporting must never interrupt the user's workflow.
  });
}
