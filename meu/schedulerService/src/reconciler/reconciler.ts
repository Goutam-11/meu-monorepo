import { ObjectId, type Db, type Document } from "mongodb";
import { logger, errMeta } from "@/lib/logger";
import { contractDrift, reviewIsSafe, staleClaimIsSafe, type Contract } from "./policy";
import { fetchDeltaContract } from "./deltaContract";

export type ReconcileLog = {
  info: (event: Record<string, unknown>, message?: string) => void;
  warn: (event: Record<string, unknown>, message?: string) => void;
  error: (event: Record<string, unknown>, message?: string) => void;
};

export type ReconcileNotification = Record<string, unknown>;

export type ReconcilerDeps = {
  now?: () => Date;
  log?: ReconcileLog;
  notify?: (notification: ReconcileNotification) => Promise<unknown>;
  readContract?: (agent: Document) => Promise<Contract>;
  isJobActive?: (executionId: string) => Promise<boolean>;
  reviewAfterMs?: number;
  staleAfterMs?: number;
  orphanAfterMs?: number;
  contractRefreshMs?: number;
};

export type ReconcileCounts = {
  reviewResolved: number;
  reviewEscalated: number;
  staleReleased: number;
  staleEscalated: number;
  orphanedReleased: number;
  contractDrift: number;
  contractVerified: number;
  contractErrors: number;
};

type ExecutionDoc = {
  _id: string;
  agentId: string;
  state: string;
  startedAt: Date;
  finishedAt?: Date;
  reviewReason?: string;
  outcome?: string;
  failure?: { brokerOperationRequested?: boolean; summary?: string } & Record<string, unknown>;
  reconcile?: { notifiedAt?: Date; resolvedAt?: Date; outcome?: string; reason?: string };
};

type LockDoc = { _id: string; executionId: string; createdAt: Date; kind?: string; state?: string };
type IntentDoc = { _id: string; executionId: string };
type AgentDoc = {
  _id: string | ObjectId;
  userId: string;
  status?: string;
  type?: string;
  strategy?: string;
  exchangeId?: string | ObjectId;
  market?: { symbols?: string[] };
  strategyConfig?: { contract?: Contract } & Record<string, unknown>;
  contractRefreshAt?: Date | null;
  contractDrift?: { fields: string[]; saved: Contract; live: Contract; detectedAt: Date; signature: string; lastCheckedAt?: Date } | null;
  contractDriftNotifiedAt?: Date | null;
  contractDriftSignature?: string | null;
};

function defaultLog(): ReconcileLog {
  return logger.child({ module: "reconciler" }) as unknown as ReconcileLog;
}

async function defaultNotify(notification: ReconcileNotification) {
  const { emitNotification } = await import("@/lib/notifications");
  return emitNotification(notification as never);
}

async function defaultReadContract(agent: Document) {
  const symbol = String((agent.market as { symbols?: string[] } | undefined)?.symbols?.[0] ?? "");
  if (!symbol) throw new Error("Agent has no ticker for contract refresh");
  return fetchDeltaContract(symbol);
}

async function defaultIsJobActive(executionId: string) {
  const { agentQueue } = await import("@/queue/queue");
  const job = await agentQueue.getJob(executionId);
  return !!job && await job.getState() === "active";
}

function agentFilter(agentId: string) {
  return ObjectId.isValid(agentId) ? { _id: new ObjectId(agentId) } : { _id: agentId };
}

export async function reconcileOnce(db: Db, overrides: ReconcilerDeps = {}): Promise<ReconcileCounts> {
  const startedAt = Date.now();
  const now = overrides.now?.() ?? new Date();
  const log = overrides.log ?? defaultLog();
  const notify = overrides.notify ?? defaultNotify;
  const readContract = overrides.readContract ?? defaultReadContract;
  const isJobActive = overrides.isJobActive ?? defaultIsJobActive;
  const reviewAfterMs = overrides.reviewAfterMs ?? 10 * 60_000;
  const staleAfterMs = overrides.staleAfterMs ?? 15 * 60_000;
  const orphanAfterMs = overrides.orphanAfterMs ?? 60 * 60_000;
  const contractRefreshMs = overrides.contractRefreshMs ?? 6 * 60 * 60_000;

  const executions = db.collection<ExecutionDoc>("AgentExecutions");
  const locks = db.collection<LockDoc>("ExecutionLocks");
  const intents = db.collection<IntentDoc>("OrderIntents");
  const agents = db.collection<AgentDoc>("Agent");

  const counts: ReconcileCounts = {
    reviewResolved: 0, reviewEscalated: 0, staleReleased: 0, staleEscalated: 0,
    orphanedReleased: 0, contractDrift: 0, contractVerified: 0, contractErrors: 0,
  };

  const findAgent = async (agentId: string) => agents.findOne(agentFilter(agentId)) as Promise<AgentDoc | null>;
  const notifyReview = async (execution: ExecutionDoc, reason: string) => {
    if (execution.reconcile?.notifiedAt) return;
    const agent = await findAgent(execution.agentId);
    if (!agent) {
      log.warn({ event: "reconcile.review_notify_skipped", executionId: execution._id, agentId: execution.agentId, reason: "agent not found" }, "Could not notify for a manual review because the agent is missing");
      return;
    }
    try {
      await notify({
        type: "ERROR", source: "AGENT", code: "AGENT_REVIEW_REQUIRED", title: "Execution needs manual reconciliation",
        userId: agent.userId, agentId: String(agent._id), exchangeId: agent.exchangeId ? String(agent.exchangeId) : undefined,
        runId: execution._id,
        message: `Execution ${execution._id} cannot be released automatically: ${reason}. Review the account evidence before resuming.`,
        metadata: { executionId: execution._id, reviewReason: execution.reviewReason, reconcileReason: reason },
      });
      await executions.updateOne({ _id: execution._id }, { $set: { reconcile: { ...execution.reconcile, notifiedAt: now, outcome: "MANUAL_REVIEW", reason } } });
    } catch (error) {
      log.error({ event: "reconcile.review_notify_failed", ...errMeta(error), executionId: execution._id }, "Could not persist the manual-review notification");
    }
  };

  // Review sweep: only executions that provably requested no broker operation may be released.
  for (const execution of await executions.find({ state: "REVIEW_REQUIRED" }).toArray()) {
    const at = execution.finishedAt ?? execution.startedAt;
    if (!at || now.getTime() - new Date(at).getTime() < reviewAfterMs) continue;
    const intentCount = await intents.countDocuments({ executionId: String(execution._id) });
    const decision = reviewIsSafe(execution.failure ?? {}, intentCount);
    if (decision.safe) {
      await executions.updateOne({ _id: execution._id }, {
        $set: { state: "COMPLETED", finishedAt: now, outcome: "RESOLVED_NO_ACTION", reconcile: { resolvedAt: now, outcome: "RESOLVED_NO_ACTION", reason: decision.reason } },
      });
      const released = await locks.deleteMany({ executionId: String(execution._id) });
      counts.reviewResolved++;
      log.info({ event: "reconcile.review_resolved", executionId: execution._id, agentId: execution.agentId, locksReleased: released.deletedCount, reason: decision.reason }, "Review-required execution resolved without a broker action");
    } else {
      counts.reviewEscalated++;
      await notifyReview(execution, decision.reason);
      log.warn({ event: "reconcile.review_manual", executionId: execution._id, agentId: execution.agentId, reason: decision.reason }, "Review-required execution stays locked for manual reconciliation");
    }
  }

  // Stale claim sweep: a dead owner job with no order intent cannot have reached a venue.
  for (const execution of await executions.find({ state: "STARTED" }).toArray()) {
    if (!execution.startedAt || now.getTime() - new Date(execution.startedAt).getTime() < staleAfterMs) continue;
    if (await isJobActive(String(execution._id))) continue;
    const intentCount = await intents.countDocuments({ executionId: String(execution._id) });
    if (!staleClaimIsSafe(intentCount)) {
      counts.staleEscalated++;
      await notifyReview(execution, `${intentCount} order intent(s) exist for the abandoned claim`);
      log.warn({ event: "reconcile.stale_claim_manual", executionId: execution._id, agentId: execution.agentId, intentCount }, "Abandoned claim has order evidence and stays locked");
      continue;
    }
    await executions.updateOne({ _id: execution._id }, {
      $set: { state: "COMPLETED", finishedAt: now, outcome: "STALE_CLAIM_RELEASED", reconcile: { resolvedAt: now, outcome: "STALE_CLAIM_RELEASED", reason: "owning job is gone and no broker operation was requested" } },
    });
    const released = await locks.deleteMany({ executionId: String(execution._id) });
    counts.staleReleased++;
    log.info({ event: "reconcile.stale_claim_released", executionId: execution._id, agentId: execution.agentId, locksReleased: released.deletedCount }, "Abandoned claim released without a broker action");
  }

  // Orphaned locks: only non-edit locks with no execution and no order intent are provably safe.
  for (const lock of await locks.find({}).toArray()) {
    if (lock.kind || lock.state) continue;
    if (now.getTime() - new Date(lock.createdAt).getTime() < orphanAfterMs) continue;
    if (await executions.findOne({ _id: lock.executionId })) continue;
    const intentCount = await intents.countDocuments({ executionId: lock.executionId });
    if (intentCount) {
      log.warn({ event: "reconcile.orphaned_lock_manual", lockId: lock._id, executionId: lock.executionId, intentCount }, "Orphaned lock has order evidence and stays for manual review");
      continue;
    }
    const released = await locks.deleteOne({ _id: lock._id, executionId: lock.executionId });
    if (released.deletedCount) {
      counts.orphanedReleased++;
      log.info({ event: "reconcile.orphaned_lock_released", lockId: lock._id, executionId: lock.executionId }, "Orphaned execution lock released");
    }
  }

  // Contract refresh: detect drift, park, notify once, and schedule another bounded attempt.
  for (const agent of await agents.find({ type: "CRYPTO", strategy: "ALGO_TRADING", status: "PAUSED" }).toArray()) {
    const saved = agent.strategyConfig?.contract;
    if (!saved) continue;
    const due = agent.contractRefreshAt ? new Date(agent.contractRefreshAt) : null;
    if (!due || due.getTime() > now.getTime()) continue;
    let live: Contract;
    try {
      live = await readContract(agent as unknown as Document);
    } catch (error) {
      counts.contractErrors++;
      await agents.updateOne({ _id: agent._id }, { $set: { contractRefreshAt: new Date(now.getTime() + contractRefreshMs) } });
      log.warn({ event: "reconcile.contract_error", ...errMeta(error), agentId: String(agent._id) }, "Contract refresh failed; agent stays parked");
      continue;
    }
    const fields = contractDrift(saved, live);
    if (!fields.length) {
      await agents.updateOne({ _id: agent._id }, { $set: { contractRefreshAt: new Date(now.getTime() + contractRefreshMs), contractDrift: null, contractDriftNotifiedAt: null, contractDriftSignature: null } });
      counts.contractVerified++;
      log.info({ event: "reconcile.contract_verified", agentId: String(agent._id), exchangeId: agent.exchangeId ? String(agent.exchangeId) : undefined }, "Saved contract terms still match the venue");
      continue;
    }
    const signature = JSON.stringify({ fields, live });
    const shouldNotify = agent.contractDriftSignature !== signature || !agent.contractDriftNotifiedAt;
    const drift = {
      fields, saved, live, signature,
      detectedAt: agent.contractDrift?.detectedAt ?? now,
      lastCheckedAt: now,
    };
    const update: Record<string, unknown> = { contractDrift: drift, contractDriftSignature: signature, contractRefreshAt: new Date(now.getTime() + contractRefreshMs), status: "PAUSED" };
    if (shouldNotify) {
      try {
        await notify({
          type: "ERROR", source: "AGENT", code: "AGENT_CONTRACT_DRIFT", title: "Agent parked — venue contract changed",
          userId: agent.userId, agentId: String(agent._id), exchangeId: agent.exchangeId ? String(agent.exchangeId) : undefined,
          message: `Saved contract terms changed for ${saved.symbol}: ${fields.join(", ")}. The agent stays paused for manual review; no new strategy revision was created.`,
          metadata: { agentId: String(agent._id), fields, saved, live, nextAction: "Compare the saved contract with the venue product, then edit or create a replacement strategy revision before resuming." },
        });
        update.contractDriftNotifiedAt = now;
      } catch (error) {
        log.error({ event: "reconcile.contract_notify_failed", ...errMeta(error), agentId: String(agent._id) }, "Could not persist the contract-drift notification");
      }
    }
    await agents.updateOne({ _id: agent._id }, { $set: update });
    counts.contractDrift++;
    log.warn({ event: "reconcile.contract_drift", agentId: String(agent._id), fields, notified: shouldNotify, nextRefreshAt: (update.contractRefreshAt as Date).toISOString() }, "Contract drift parked the agent for manual review");
  }

  log.info({ event: "reconcile.sweep", ...counts, durationMs: Date.now() - startedAt }, "Reconciliation sweep completed");
  return counts;
}

export function startReconciler(db: Db, intervalMs = Number(process.env.RECONCILE_INTERVAL_MS) || 60_000) {
  let active = false;
  const tick = async () => {
    if (active) return;
    active = true;
    try { await reconcileOnce(db); }
    catch (error) { logger.error({ event: "reconcile.sweep_failed", ...errMeta(error) }, "Reconciliation sweep failed"); }
    finally { active = false; }
  };
  void tick();
  const timer = setInterval(() => { void tick(); }, intervalMs);
  timer.unref?.();
  return timer;
}
