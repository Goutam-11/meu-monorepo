import { ObjectId, type Collection, type Document } from "mongodb";
import { logger, errMeta } from "@/lib/logger";
import { setAgentCached, deleteAgentCached } from "@/lib/redis";
import { toAgentCacheEntry } from "@/state/setStates";

export function startWatcher(collection: Collection<Document>) {
  const log = logger.child({ module: "agentWatcher" });
  let attempt = 0;
  let stopped = false;
  let reconnect: ReturnType<typeof setTimeout> | undefined;
  let pending = Promise.resolve();
  let stream: ReturnType<typeof collection.watch>;
  function start() {
    if (stopped) return;
    stream = collection.watch([], { fullDocument: "updateLookup" });
    const current = stream;
    const retry = () => {
      if (stopped || reconnect || current !== stream) return;
      reconnect = setTimeout(() => { reconnect = undefined; start(); }, Math.min(1000 * 2 ** attempt++, 30000));
      void current.close().catch(() => {});
    };
    current.on("change", (change: Document) => {
      attempt = 0;
      pending = pending.then(async () => {
        if (!change.documentKey?._id) return;
        const id = String(change.documentKey._id);
        // Refetch current source-of-truth rather than applying a stale event snapshot.
        const doc = await collection.findOne({ _id: new ObjectId(id) });
        if (!doc || doc.status !== "RUNNING") await deleteAgentCached(id);
        else await setAgentCached(toAgentCacheEntry(doc));
      }).catch(err => { log.error(errMeta(err), "Agent change failed"); });
    });
    current.on("error", err => { log.error(errMeta(err), "Change stream error"); retry(); });
    current.on("end", retry);
    current.on("close", retry);
  }
  start();
  return async () => {
    stopped = true;
    clearTimeout(reconnect);
    await stream.close();
    await pending;
  };
}
