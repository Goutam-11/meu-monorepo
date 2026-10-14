import { expect, mock, test } from "bun:test";
import type { Db } from "mongodb";

let attempts = 0;
let failures: number[] = [];
mock.module("web-push", () => ({ default: {
  setVapidDetails() {},
  generateRequestDetails(sub: {endpoint: string}) {return {endpoint: sub.endpoint, method: 'POST', headers: {}, body: null};},
} }));
const originalFetch = globalThis.fetch;
globalThis.fetch = (async () => { attempts++; return new Response(null, {status: failures.shift() ?? 201}); }) as unknown as typeof fetch;
const { sendPush } = await import("../src/channels/web-push/delivery");

test("transient push delivery retries only the subscription; expired subscriptions are deleted", async () => {
  const previousPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const previousPrivate = process.env.VAPID_PRIVATE_KEY;
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test";
  process.env.VAPID_PRIVATE_KEY = "test";
  const deleted: string[] = [];
  const key = Buffer.alloc(65); key[0] = 4;
  const db = { collection: () => ({
    find: () => ({ toArray: async () => [{ _id: "subscription", endpoint: "https://fcm.googleapis.com/send/example", p256dh: key.toString("base64url"), auth: Buffer.alloc(16).toString("base64url") }] }),
    deleteOne: async ({ _id }: { _id: string }) => { deleted.push(_id); },
  }) } as unknown as Db;
  try {
    attempts = 0; failures = [503, 429];
    await sendPush(db, "owner", { title: "example" });
    expect(attempts).toBe(3);
    expect(deleted).toEqual([]);
    attempts = 0; failures = [410];
    await sendPush(db, "owner", {});
    expect(attempts).toBe(1);
    expect(deleted).toEqual(["subscription"]);
    attempts = 0; failures = [503, 503, 503, 503];
    await sendPush(db, "owner", {});
    expect(attempts).toBe(3);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousPublic === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = previousPublic;
    if (previousPrivate === undefined) delete process.env.VAPID_PRIVATE_KEY;
    else process.env.VAPID_PRIVATE_KEY = previousPrivate;
  }
});
