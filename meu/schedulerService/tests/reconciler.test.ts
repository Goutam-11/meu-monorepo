import { describe, expect, test } from "bun:test";
import type { Collection, Db, Document } from "mongodb";
import { reconcileOnce, type ReconcilerDeps } from "../src/reconciler/reconciler";

type AnyDoc = Record<string, any>;

function makeDb(seed: { executions?: AnyDoc[]; locks?: AnyDoc[]; intents?: AnyDoc[]; agents?: AnyDoc[] } = {}) {
  const docs = new Map<string, AnyDoc[]>([
    ["AgentExecutions", seed.executions ?? []],
    ["ExecutionLocks", seed.locks ?? []],
    ["OrderIntents", seed.intents ?? []],
    ["Agent", seed.agents ?? []],
  ]);
  const matches = (doc: AnyDoc, filter: AnyDoc) => Object.entries(filter).every(([key, value]) => doc[key] === value);
  const collection = (name: string): Collection<Document> => {
    const rows = docs.get(name) ?? [];
    docs.set(name, rows);
    return {
      find: (filter: AnyDoc = {}) => ({ toArray: async () => rows.filter(row => matches(row, filter)) }),
      findOne: async (filter: AnyDoc) => rows.find(row => matches(row, filter)) ?? null,
      countDocuments: async (filter: AnyDoc) => rows.filter(row => matches(row, filter)).length,
      updateOne: async (filter: AnyDoc, update: { $set: AnyDoc }) => {
        const row = rows.find(candidate => matches(candidate, filter));
        if (!row) return { modifiedCount: 0 };
        Object.assign(row, update.$set);
        return { modifiedCount: 1 };
      },
      deleteOne: async (filter: AnyDoc) => {
        const index = rows.findIndex(row => matches(row, filter));
        if (index < 0) return { deletedCount: 0 };
        rows.splice(index, 1);
        return { deletedCount: 1 };
      },
      deleteMany: async (filter: AnyDoc) => {
        const kept = rows.filter(row => !matches(row, filter));
        const deletedCount = rows.length - kept.length;
        docs.set(name, kept);
        return { deletedCount };
      },
    } as unknown as Collection<Document>;
  };
  return { db: { collection } as unknown as Db, rows: (name: string) => docs.get(name) ?? [] };
}

const now = new Date("2026-11-24T12:00:00Z");
const old = new Date("2026-11-24T10:00:00Z");
const savedContract = { symbol: "BTCUSD", contractSize: 0.001, minContracts: 1, maintenanceMarginRate: 0.005, settlement: "USD" as const };

function agent(overrides: AnyDoc = {}): AnyDoc {
  return {
    _id: "agent-1", userId: "owner", status: "PAUSED", type: "CRYPTO", strategy: "ALGO_TRADING", exchangeId: "ex-1",
    market: { symbols: ["BTCUSD"] },
    strategyConfig: { contract: { ...savedContract } },
    ...overrides,
  };
}

function dependencies(overrides: Partial<ReconcilerDeps> = {}) {
  const logs: AnyDoc[] = [];
  const notices: AnyDoc[] = [];
  const value: ReconcilerDeps = {
    now: () => now,
    log: { info: (event: AnyDoc) => logs.push(event), warn: (event: AnyDoc) => logs.push(event), error: (event: AnyDoc) => logs.push(event) },
    notify: async (notification: AnyDoc) => { notices.push(notification); return "queued"; },
    readContract: async () => ({ ...savedContract }),
    isJobActive: async () => false,
    reviewAfterMs: 60_000,
    staleAfterMs: 60_000,
    orphanAfterMs: 60_000,
    contractRefreshMs: 3_600_000,
    ...overrides,
  };
  return { value, logs, notices };
}

describe("execution reconciler", () => {
  test("resolves a review-required execution with no broker operation and releases its locks", async () => {
    const db = makeDb({
      executions: [{ _id: "exec-review", agentId: "agent-1", state: "REVIEW_REQUIRED", startedAt: old, finishedAt: old, failure: { brokerOperationRequested: false } }],
      locks: [{ _id: "agent:agent-1", executionId: "exec-review", createdAt: old }],
      agents: [agent()],
    });
    const deps = dependencies();
    const counts = await reconcileOnce(db.db, deps.value);
    expect(db.rows("AgentExecutions")[0]!).toMatchObject({ state: "COMPLETED", outcome: "RESOLVED_NO_ACTION" });
    expect(db.rows("ExecutionLocks")).toHaveLength(0);
    expect(counts.reviewResolved).toBe(1);
    expect(deps.logs.some(event => event.event === "reconcile.review_resolved")).toBe(true);
  });

  test("never releases a review that may have reached a venue and notifies once", async () => {
    const db = makeDb({
      executions: [{ _id: "exec-manual", agentId: "agent-1", state: "REVIEW_REQUIRED", startedAt: old, finishedAt: old, failure: { brokerOperationRequested: true } }],
      locks: [{ _id: "agent:agent-1", executionId: "exec-manual", createdAt: old }],
      agents: [agent()],
    });
    const deps = dependencies();
    await reconcileOnce(db.db, deps.value);
    await reconcileOnce(db.db, deps.value);
    expect(db.rows("AgentExecutions")[0]!.state).toBe("REVIEW_REQUIRED");
    expect(db.rows("ExecutionLocks")).toHaveLength(1);
    expect(deps.notices).toHaveLength(1);
    expect(deps.notices[0]!.code).toBe("AGENT_REVIEW_REQUIRED");
    expect(deps.logs.some(event => event.event === "reconcile.review_manual")).toBe(true);
  });

  test("releases a stale STARTED claim only when its job is gone and no order intent exists", async () => {
    const db = makeDb({
      executions: [{ _id: "exec-stale", agentId: "agent-1", state: "STARTED", startedAt: old }],
      locks: [{ _id: "agent:agent-1", executionId: "exec-stale", createdAt: old }],
      agents: [agent()],
    });
    const deps = dependencies();
    const counts = await reconcileOnce(db.db, deps.value);
    expect(db.rows("AgentExecutions")[0]!).toMatchObject({ state: "COMPLETED", outcome: "STALE_CLAIM_RELEASED" });
    expect(db.rows("ExecutionLocks")).toHaveLength(0);
    expect(counts.staleReleased).toBe(1);
    expect(deps.logs.some(event => event.event === "reconcile.stale_claim_released")).toBe(true);
  });

  test("keeps a stale claim that has an order intent", async () => {
    const db = makeDb({
      executions: [{ _id: "exec-stale", agentId: "agent-1", state: "STARTED", startedAt: old }],
      locks: [{ _id: "agent:agent-1", executionId: "exec-stale", createdAt: old }],
      intents: [{ _id: "intent-1", executionId: "exec-stale" }],
      agents: [agent()],
    });
    const deps = dependencies();
    await reconcileOnce(db.db, deps.value);
    expect(db.rows("AgentExecutions")[0]!.state).toBe("STARTED");
    expect(db.rows("ExecutionLocks")).toHaveLength(1);
  });

  test("releases orphaned execution locks but leaves locks with order intents", async () => {
    const db = makeDb({
      locks: [
        { _id: "agent:missing", executionId: "missing-exec", createdAt: old },
        { _id: "agent:uncertain", executionId: "uncertain-exec", createdAt: old },
      ],
      intents: [{ _id: "intent-1", executionId: "uncertain-exec" }],
    });
    const deps = dependencies();
    await reconcileOnce(db.db, deps.value);
    expect(db.rows("ExecutionLocks").map(lock => lock._id)).toEqual(["agent:uncertain"]);
    expect(deps.logs.some(event => event.event === "reconcile.orphaned_lock_released")).toBe(true);
  });

  test("parks a drifted contract, schedules another attempt and notifies once", async () => {
    const db = makeDb({ agents: [agent({ contractRefreshAt: old })] });
    const deps = dependencies({ readContract: async () => ({ ...savedContract, contractSize: 0.002 }) });
    await reconcileOnce(db.db, deps.value);
    const parked = db.rows("Agent")[0]!;
    expect(parked.status).toBe("PAUSED");
    expect(parked.contractDrift.fields).toEqual(["contractSize"]);
    expect(new Date(parked.contractRefreshAt).getTime()).toBeGreaterThan(now.getTime());
    expect(deps.notices).toHaveLength(1);
    expect(deps.notices[0]!.code).toBe("AGENT_CONTRACT_DRIFT");

    parked.contractRefreshAt = old;
    await reconcileOnce(db.db, deps.value);
    expect(deps.notices).toHaveLength(1);
    expect(deps.logs.filter(event => event.event === "reconcile.contract_drift")).toHaveLength(2);
  });

  test("clears drift once saved and venue terms agree again", async () => {
    const db = makeDb({
      agents: [agent({
        contractRefreshAt: old,
        contractDrift: { fields: ["contractSize"], detectedAt: old },
        contractDriftNotifiedAt: old,
        contractDriftSignature: "old",
      })],
    });
    const deps = dependencies();
    await reconcileOnce(db.db, deps.value);
    expect(db.rows("Agent")[0]!.contractDrift).toBeNull();
    expect(deps.logs.some(event => event.event === "reconcile.contract_verified")).toBe(true);
  });
});
