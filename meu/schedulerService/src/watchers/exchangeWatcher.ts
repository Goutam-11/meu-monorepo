import { type Collection, type Document } from "mongodb";
import { logger, errMeta } from "@/lib/logger";
import { invalidateExchangeCached } from "@/lib/redis";

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

export function startExchangeWatcher(collection: Collection<Document>) {
  const log = logger.child({ module: "exchangeWatcher" });
  let reconnectAttempt = 0;

  const pipeline = [{
    $match: {
      operationType: {
        $in: ["insert", "update", "replace", "delete"]
      }
    }
  }];

  // Exchanges use short-TTL cache-aside; the watcher only invalidates keys so
  // updates are picked up immediately instead of waiting for TTL expiry.
  async function handleChange(change: Document) {
    const id = change.documentKey._id.toString();
    await invalidateExchangeCached(id);
    log.debug({ exchangeId: id, op: change.operationType }, "Exchange cache invalidated");
  }

  function start() {
    const changeStream = collection.watch(pipeline, {
      fullDocument: "updateLookup",
    });

    changeStream.on("change", async (change: Document) => {
      try {
        await handleChange(change);
      } catch (err) {
        log.error({ ...errMeta(err) }, "Failed to process exchange change event");
      }
    });

    changeStream.on("error", (err: Error & { code?: string }) => {
      log.error(errMeta(err), "Exchange change stream error");
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt++, RECONNECT_MAX_MS);
      log.warn({ delayMs: delay, attempt: reconnectAttempt }, "Reconnecting exchange change stream");
      changeStream.close().catch(() => {});
      setTimeout(start, delay);
    });

    changeStream.on("end", () => {
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt++, RECONNECT_MAX_MS);
      log.warn({ delayMs: delay }, "Exchange change stream ended, reconnecting");
      setTimeout(start, delay);
    });

    reconnectAttempt = 0;
    log.info("Exchange change stream watcher started");
  }

  start();
}
