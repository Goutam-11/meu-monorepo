import { test, expect } from "bun:test";
import { notificationIterator, emitNotificationChange } from "../src/features/notifications/server/events";
import { validPushEndpoint, validPushKeys } from "../src/features/notifications/server/push-validation";

test("abort settles a blocked subscriber and subsequent events remain usable", async () => {
  const controller = new AbortController();
  const iterator = notificationIterator(controller.signal, "owner");
  await iterator.next();
  const pending = iterator.next();
  emitNotificationChange("other");
  controller.abort();
  expect(await pending).toEqual({ done: true, value: undefined });
  const nextController = new AbortController();
  const next = notificationIterator(nextController.signal, "owner");
  await next.next();
  const changed = next.next();
  emitNotificationChange("owner");
  expect((await changed).done).toBe(false);
  nextController.abort();
  await next.return(undefined);
});
test("push URL and key validation rejects arbitrary server targets and malformed keys", () => {
  expect(validPushEndpoint("https://fcm.googleapis.com/fcm/send/fake")).toBe(true);
  for (const url of ["http://fcm.googleapis.com/x", "https://127.0.0.1/x", "https://fcm.googleapis.com.evil.example/x", "https://user@fcm.googleapis.com/x", "https://fcm.googleapis.com:444/x"]) {
    expect(validPushEndpoint(url)).toBe(false);
  }
  expect(validPushKeys({ p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64)]).toString("base64url"), auth: Buffer.alloc(16).toString("base64url") })).toBe(true);
  expect(validPushKeys({ p256dh: "invalid", auth: "invalid" })).toBe(false);
});
