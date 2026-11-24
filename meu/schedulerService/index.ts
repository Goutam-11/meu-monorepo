import { connectDB, closeDB } from "@/db/db";
import { startWatcher } from "@/watchers/watcher";
import { startScheduler } from "@/schedulers/scheduler";
import { startReconciler } from "@/reconciler/reconciler";
// TODO: re-enable once exchange sync logic exists (queue + worker are disabled)
// import { startExchangeWatcher } from "@/watchers/exchangeWatcher";
// import { startExchangeScheduler } from "@/schedulers/exchangeScheduler";
import { bootstrapAgents } from "@/state/setStates";
import { logger, errMeta } from "@/lib/logger";

const log = logger.child({ module: "main" });

async function main() {
  const db = await connectDB();
  const agentCollection = db.collection("Agent");
  const agents = await agentCollection
    .find({ status: "RUNNING" })
    .project({
      _id: 1,
      userId: 1,
      status: 1,
      type: 1,
      strategy: 1,
      market: 1,
      risk: 1,
      capital: 1,
      temperature: 1,
      llmModel: 1,
      credentialId: 1,
      exchangeId: 1,
      nextRunAt: 1,
    })
    .toArray();

  log.info({ count: agents.length }, "Loaded running agents from Mongo");

  await bootstrapAgents(agents);
  startWatcher(agentCollection);
  startScheduler(agentCollection);
  startReconciler(db);

  // startExchangeWatcher(exchangeCollection);
  // startExchangeScheduler();
}

const shutdown = async () => {
  log.info("Shutting down scheduler...");
  try {
    await closeDB();
  } catch (err) {
    log.warn(errMeta(err), "Error while closing DB connection");
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((err) => {
  log.fatal(errMeta(err), "Bootstrap failed");
  process.exit(1);
});
