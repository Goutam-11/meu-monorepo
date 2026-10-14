import { validPushEndpoint, validPushKeys } from "@/features/notifications/server/push-validation";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import prisma from "@/lib/db";
import { appLog, newRequestId } from "@/lib/logging/app-logger";
import { readBoundedJsonBody } from "@/lib/logging/client-error-validation";

const registrationWindows = new Map<string, { startedAt: number; count: number }>();
const activeRegistrations = new Set<string>();
function allowRegistration(userId: string) {
  const now = Date.now();
  for (const [id, window] of registrationWindows) if (now - window.startedAt >= 60_000) registrationWindows.delete(id);
  if (activeRegistrations.has(userId) || (!registrationWindows.has(userId) && registrationWindows.size >= 1_000)) return false;
  const window = registrationWindows.get(userId);
  if (window && window.count >= 10) return false;
  registrationWindows.set(userId, {startedAt:window?.startedAt ?? now,count:(window?.count ?? 0)+1});
  return true;
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const startedAt = Date.now();
  let activeUser: string | undefined;
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const origin = req.headers.get('origin');
    if (!origin || origin !== new URL(req.url).origin) return NextResponse.json({error:'Invalid origin'}, {status:403});
    if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return NextResponse.json({error:'JSON body required'}, {status:415});
    if (!allowRegistration(session.user.id)) return NextResponse.json({error:'Wait before registering another notification device'}, {status:429});
    activeUser = session.user.id;
    activeRegistrations.add(activeUser);
    const parsed = await readBoundedJsonBody(req, 8_192);
    if (!parsed.ok) return NextResponse.json({error:'Invalid subscription body'}, {status:parsed.reason === 'too_large' ? 413 : 400});
    const body = parsed.payload && typeof parsed.payload === 'object' ? parsed.payload as Record<string, unknown> : {};
    const endpoint = body.endpoint;
    const keys = body.keys as {p256dh?:unknown;auth?:unknown} | undefined;
    if (
      typeof endpoint !== "string" ||
      typeof keys?.p256dh !== "string" ||
      typeof keys?.auth !== "string" || !validPushEndpoint(endpoint) || !validPushKeys(keys)
    ) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const updated = await prisma.pushSubscription.updateMany({
      where: { endpoint, userId: session.user.id },
      data: { p256dh: keys.p256dh, auth: keys.auth },
    });
    if (!updated.count) {
      if (await prisma.pushSubscription.count({where:{userId:session.user.id}}) >= 10)
        return NextResponse.json({error:'Maximum 10 notification devices. Disable notifications on an old device before adding another.'}, {status:409});
      try {
        await prisma.pushSubscription.create({ data: {
          userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth,
          userAgent: req.headers.get("user-agent")?.slice(0,512),
        } });
      } catch (error) {
        if ((error as { code?: string }).code === "P2002") {
          return NextResponse.json({ error: "Subscription ownership conflict" }, { status: 409 });
        }
        throw error;
      }
    }

    appLog("info", "push.request.completed", {
      requestId,
      operation: "push.subscribe",
      durationMs: Date.now() - startedAt,
      status: 200,
    });
    return NextResponse.json({ ok: true });
  } catch {
    appLog("error", "push.request.failed", {
      requestId,
      operation: "push.subscribe",
      durationMs: Date.now() - startedAt,
      status: 500,
      code: "REQUEST_FAILED",
    });
    return NextResponse.json({ error: "Push subscription is unavailable" }, { status: 500 });
  } finally {
    if (activeUser) activeRegistrations.delete(activeUser);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = newRequestId();
  const startedAt = Date.now();
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const endpoint = new URL(req.url).searchParams.get("endpoint");
    if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    });

    appLog("info", "push.request.completed", {
      requestId,
      operation: "push.unsubscribe",
      durationMs: Date.now() - startedAt,
      status: 200,
    });
    return NextResponse.json({ ok: true });
  } catch {
    appLog("error", "push.request.failed", {
      requestId,
      operation: "push.unsubscribe",
      durationMs: Date.now() - startedAt,
      status: 500,
      code: "REQUEST_FAILED",
    });
    return NextResponse.json({ error: "Push subscription is unavailable" }, { status: 500 });
  }
}
