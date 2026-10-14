import { test, expect, mock, beforeEach } from "bun:test";

let signedIn = true;
let failDelete = false;
let notices: { userId: string; status: string }[] = [];
const changes: string[] = [];
mock.module("server-only", () => ({}));
mock.module("@/lib/auth/server", () => ({ auth: { api: { getSession: async () => signedIn ? { user: { id: "owner" } } : null } } }));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));
mock.module("@/features/notifications/server/events", () => ({
  emitNotificationChange: (userId: string) => changes.push(userId),
  getNotificationVersion: () => 0,
  notificationIterator: async function* () {},
}));
mock.module("@/lib/db", () => ({ default: { notification: {
  deleteMany: async ({ where }: { where: { userId: string } }) => {
    if (failDelete) throw new Error("Database unavailable");
    expect(where).toEqual({ userId: "owner" });
    const count = notices.filter(item => item.userId === where.userId).length;
    notices = notices.filter(item => item.userId !== where.userId);
    return { count };
  },
} } }));
const { notificationsRouter } = await import("../src/features/notifications/server/router");
const caller = notificationsRouter.createCaller({} as never);
beforeEach(() => {
  signedIn = true; failDelete = false; changes.length = 0;
  notices = [{ userId: "owner", status: "READ" }, { userId: "owner", status: "UNREAD" }, { userId: "other", status: "UNREAD" }];
});
test("delete all removes the owner's read and unread notifications and preserves another user's alerts", async () => {
  expect(await caller.deleteAll()).toEqual({ count: 2 });
  expect(notices).toEqual([{ userId: "other", status: "UNREAD" }]);
  expect(changes).toEqual(["owner"]);
  expect(await caller.deleteAll()).toEqual({ count: 0 });
  expect(changes).toEqual(["owner"]);
});
test("unauthenticated deletion and failed database writes never broadcast a deletion", async () => {
  signedIn = false;
  await expect(caller.deleteAll()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  expect(notices).toHaveLength(3);
  signedIn = true; failDelete = true;
  await expect(caller.deleteAll()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  expect(notices).toHaveLength(3);
  expect(changes).toHaveLength(0);
});
