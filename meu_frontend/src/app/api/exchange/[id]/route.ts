import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { getExchangeData } from "@/lib/config";
import { auth } from "@/lib/auth";
import { appLog, newRequestId } from "@/lib/app-logger";
export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ error: "Invalid exchange ID" }, { status: 400 });
  try {
    const data = await getExchangeData(id, session.user.id, requestId);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    appLog("error", "exchange.route.failed", { requestId, operation: "exchange.snapshot", code: "REQUEST_FAILED" });
    const status = error instanceof TRPCError
      ? ({ NOT_FOUND: 404, BAD_REQUEST: 400, UNAUTHORIZED: 401 } as Record<string, number>)[error.code] ?? 503
      : 503;
    return NextResponse.json({ error: status === 404 ? "Exchange not found" : "Exchange data is unavailable" }, { status });
  }
}
