import { agentQueue } from "@/queue/queue";
import { reconcileAgents, toAgentCacheEntry } from "@/state/setStates";
import { setAgentCached } from "@/lib/redis";
import { TICK_MS } from "@/config/config";
import { logger, errMeta } from "@/lib/logger";
import type { Collection, Document } from "mongodb";

const log = logger.child({ module: "scheduler" });
export function jobIdFor(agentId: string, runAt: number): string {
  return `${agentId}-${runAt}`;
}
export async function scheduleAgentRun(agentId: string, userId: string, runAt: number) {
  if (!Number.isSafeInteger(runAt)) throw new Error("Invalid scheduled time");
  await agentQueue.add("run-agent", { agentId, userId, runAt }, {
    jobId: jobIdFor(agentId, runAt), delay: Math.max(0, runAt - Date.now()), attempts: 1,
  });
  log.info({ event: "run.scheduled", agentId, runId: jobIdFor(agentId, runAt), scheduledAt: runAt, delayMs: Math.max(0, runAt - Date.now()) }, "Agent run queued");
}
export async function reconcileOnce(collection: Collection<Document>) {
  const running = await reconcileAgents(collection);
  for (const doc of running) {
    try {
      const cycles = Number(doc.market?.agentCycles);
      if (!Number.isSafeInteger(cycles) || cycles < 1) throw new Error("Invalid agent cadence");
      if (!doc.nextRunAt) {
        await collection.updateOne({ _id: doc._id, status: "RUNNING", nextRunAt: null }, {
          $set: { nextRunAt: new Date(Date.now() + cycles * 1000) },
        });
      }
      const fresh = await collection.findOne({ _id: doc._id, status: "RUNNING" });
      if (!fresh?.nextRunAt) continue;
      const agent = toAgentCacheEntry(fresh);
      await setAgentCached(agent);
      const runAt = new Date(fresh.nextRunAt).getTime();
      // Keep the pointer on the pending/active run until the worker advances it.
      const job = await agentQueue.getJob(jobIdFor(agent.id, runAt));
      if (!job) await scheduleAgentRun(agent.id, agent.userId, runAt);
      else if (["completed", "failed"].includes(await job.getState())) {
        await collection.updateOne({ _id: fresh._id, status: "RUNNING", nextRunAt: fresh.nextRunAt }, {
          $set: { nextRunAt: new Date(Date.now() + cycles * 1000) },
        });
      }
    } catch (err) {
      log.error({ ...errMeta(err), agentId: String(doc._id) }, "Agent reconcile failed");
    }
  }
}
export function startScheduler(collection: Collection<Document>) {
  let active = false;
  const tick = async () => {
    if (active) return;
    active = true;
    try { await reconcileOnce(collection); }
    catch (err) { log.error(errMeta(err), "Reconcile failed"); }
    finally { active = false; }
  };
  void tick();
  return setInterval(() => { void tick(); }, TICK_MS);
}
