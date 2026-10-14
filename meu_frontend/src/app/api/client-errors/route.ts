import { auth } from "@/lib/auth/server";
import { appLog, newRequestId } from "@/lib/logging/app-logger";
import { parseClientReport, readBoundedJsonBody } from "@/lib/logging/client-error-validation";

export const runtime = "nodejs";
const reportWindows = new Map<string, { startedAt: number; count: number }>();
const REPORT_WINDOW_MS = 60_000;
const REPORTS_PER_WINDOW = 10;
const MAX_TRACKED_USERS = 1_000;

function canReport(userId: string) {
  const now = Date.now();
  if (reportWindows.size >= MAX_TRACKED_USERS && !reportWindows.has(userId)) {
    for (const [id, window] of reportWindows) {
      if (now - window.startedAt >= REPORT_WINDOW_MS) reportWindows.delete(id);
    }
    if (reportWindows.size >= MAX_TRACKED_USERS) return false;
  }
  const current = reportWindows.get(userId);
  if (!current || now - current.startedAt >= REPORT_WINDOW_MS) {
    reportWindows.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= REPORTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const noStore = { "Cache-Control": "no-store" };
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin) return new Response(null, { status: 403, headers: noStore });
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return new Response(null, { status: 415, headers: noStore });
  }
  const contentLength = req.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > 512)) {
    return new Response(null, { status: 413, headers: noStore });
  }

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response(null, { status: 401, headers: noStore });

  const body = await readBoundedJsonBody(req, 512);
  if (!body.ok) return new Response(null, { status: body.reason === "too_large" ? 413 : 400, headers: noStore });
  const report = parseClientReport(body.payload);
  if (!report) return new Response(null, { status: 400, headers: noStore });
  if (!canReport(session.user.id)) return new Response(null, { status: 429, headers: noStore });

  appLog("warn", "client.error.reported", {
    requestId,
    source: report.source,
    code: report.code as "CLIENT_QUERY_FAILED" | "CLIENT_MUTATION_FAILED" | "CLIENT_SETTINGS_LOAD_FAILED" | "CLIENT_SETTINGS_SAVE_FAILED" | "CLIENT_RENDER_FAILED" | "CLIENT_SUBSCRIPTION_FAILED" | "CLIENT_PUSH_UNSUBSCRIBE_FAILED" | "CLIENT_PUSH_NOT_CONFIGURED",
  });
  return new Response(null, { status: 204, headers: noStore });
}
