import { test, expect } from "bun:test";
import { validPushEndpoint, validPushKeys } from "../src/channels/web-push/validation";
test("consumer rejects untrusted stored destinations and invalid encryption keys", () => {
  expect(validPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/fake")).toBe(true);
  expect(validPushEndpoint("https://localhost/endpoint")).toBe(false);
  expect(validPushEndpoint("https://fcm.googleapis.com.evil.example/endpoint")).toBe(false);
  expect(validPushKeys({ auth: "invalid", p256dh: "invalid" })).toBe(false);
});
