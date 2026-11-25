import { MongoClient } from "mongodb";
import { emitNotificationChange } from "@/features/notifications/server/events";
import { COLLECTIONS } from "../../shared/persistence/collections";

const state = globalThis as typeof globalThis & { notificationWatcherStarted?: boolean };
async function startNotificationWatcher() {
  const uri = process.env.DATABASE_URL;
  if (!uri || state.notificationWatcherStarted) return;
  state.notificationWatcherStarted = true;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try { await client.connect(); }
  catch {
    await client.close();
    state.notificationWatcherStarted = false;
    console.error("[notification-watcher] connection failed; retrying");
    setTimeout(() => { void startNotificationWatcher(); }, 10000).unref();
    return;
  }
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  function watch() {
    const stream = client.db().collection(COLLECTIONS.Notification).watch([], { fullDocument: "updateLookup" });
    const reconnect = () => {
      if (retry) return;
      retry = setTimeout(() => { retry = undefined; watch(); }, Math.min(1000 * 2 ** attempt++, 30000));
      retry.unref();
      void stream.close().catch(() => {});
    };
    stream.on("change", event => {
      attempt = 0;
      if (["insert", "update", "replace", "delete"].includes(event.operationType)) {
        emitNotificationChange("fullDocument" in event ? event.fullDocument?.userId : undefined);
      }
    });
    stream.on("error", () => { console.error("[notification-watcher] stream failed; retrying"); reconnect(); });
    stream.on("end", reconnect);
    stream.on("close", reconnect);
  }
  watch();
}
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  void startNotificationWatcher();
}
