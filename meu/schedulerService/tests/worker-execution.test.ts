import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { DeltaDataError, DeltaDataValidationError } from '../../../shared/trading/delta-data';
import { validateCryptoStrategy } from '../src/algorithms/crypto/cryptoStrategyConfig';
import { MissedLiveCandlesError } from '../src/algorithms/crypto/cryptoStrategyConfig';
import { ObjectId, type Db } from "mongodb";
import { OrderRejectedError, CryptoProtectionError, CryptoSettingsUncertainError, DeltaLeverageUncertainError, type ExecutionSafety } from "../src/execution/tradeGuard";
import { buildRunMemory, memoryContext } from "../src/agents/llm/runMemory";
import { COLLECTIONS } from "../../../shared/persistence/collections";

let runLive: (params:Record<string,unknown>)=>Promise<string> = async()=>"ALGO ok";
let runPaper: (params: Record<string, unknown>) => Promise<string> = async () => "PAPER ok";
let runAgent: (params: Record<string, unknown>) => Promise<string> = async () => "ok";
const scheduled: Array<{ agentId: string; userId: string; runAt: number }> = [];
const notices: unknown[] = [];
const logEvents: Array<Record<string, unknown>> = [];
const captureLog = (fields: Record<string, unknown>) => { logEvents.push(fields); };
type Processor = (job: { id: string; data: { agentId: string; userId: string; runAt: number } }) => Promise<void>;

let preparationFailure = false;
let ownerActive = false;
mock.module('@/algorithms/crypto/runCryptoStrategy', () => ({runPaperStrategy:(params:Record<string,unknown>)=>runPaper(params),runLiveCryptoStrategy:(params:Record<string,unknown>)=>runLive(params),validateCryptoStrategy}));
mock.module("@/queue/queue", () => ({ AGENT_QUEUE_NAME: "agent-execution", agentQueue: { getJob: async () => ({ getState: async () => ownerActive ? "active" : "failed" }), toKey: (key: string) => key } }));
mock.module("@/lib/redis", () => ({
  redis: { exists: async () => ownerActive ? 1 : 0 }, setAgentCached: async () => {}, deleteAgentCached: async () => {}, closeRedis: async () => {},
}));
mock.module("@/db/db", () => ({ connectDB: async () => ({}), closeDB: async () => {} }));
mock.module("@/config/config", () => ({
  exchangeMap: { DELTA: class {id='delta';async loadMarkets(){if(preparationFailure)throw Object.assign(new Error('network in market discovery'),{name:'RequestTimeout'});} market(){return{symbol:'BTC/USD:USD'};}}, BINANCE: class FakeExchange { timeframes = { "1m": "1m", "15m": "15m" }; async loadMarkets() {} } },
  configureCryptoExchange: () => {},
}));
mock.module('@/brokers/crypto/cryptoAccount',()=>({identifyDeltaAccount:async()=> 'delta:fixture',registerDeltaAccount:async()=>({limits:{}}),accountRiskSchema:{parse:()=>({})},createCryptoAccountContext:()=>({scopeSnapshot:async(snapshot:unknown)=>snapshot})}));
mock.module('@/brokers/crypto/cryptoRisk',()=>({cryptoEntrySnapshot:async()=>({}),cryptoEntryMarket:()=>({symbol:'BTC/USD:USD'})}));
mock.module("@/config/encryption", () => ({ decryptSecret: (value: string) => value }));
mock.module("@/agents/llm/vercelAgent", () => ({ tradingAgent: (params: Record<string, unknown>) => runAgent(params) }));
mock.module("@/agents/llm/zerodhaAgent", () => ({
  zerodhaTradingAgent: async () => "ok",
  getNseInstrumentMap: async () => [],
}));
mock.module("@/brokers/kite/kiteTokenManager", () => ({ getKiteForExchange: async () => null }));
mock.module("@/lib/marketHours", () => ({ isIndianMarketOpen: () => true, nextMarketOpen: () => new Date(Date.now() + 60_000) }));
mock.module("@/lib/notifications", () => ({ emitNotification: async (notice: unknown) => { notices.push(notice); }, setLegacyNotificationCollection: () => {} }));
mock.module("@/lib/logger", () => ({
  logger: { child: () => ({ error: captureLog, info: captureLog, warn: captureLog, fatal: captureLog }) }, errMeta: () => ({}), runWithLogContext: (_: unknown, operation: () => unknown) => operation(),
}));
mock.module("@/schedulers/scheduler", () => ({ scheduleAgentRun: async (...args: [string, string, number]) => { scheduled.push({ agentId: args[0], userId: args[1], runAt: args[2] }); } }));
mock.module("@/state/setStates", () => ({ toAgentCacheEntry: (a: Record<string, unknown>) => a }));

const agentId = new ObjectId();
const credentialId = new ObjectId();
const exchangeId = new ObjectId();
const runAt = Date.now() - 1000;
const owner = "owner-1";

function makeDb(options: { credentialOwner?: string; exchangeOwner?: string; agentStatus?: string; paper?: boolean; liveAlgo?:boolean } = {}) {
  const agent: Record<string, unknown> = {
    _id: agentId, userId: owner, status: options.agentStatus ?? "RUNNING", updatedAt: new Date(0), nextRunAt: new Date(runAt),
    strategy: "LLM_TRADING", credentialId, exchangeId, llmModel: "test-model", temperature: 0,
    market: { agentCycles: 60, symbols: ["BTC/USDT"] },
    risk: { maxRiskPerTradePct: 1, maxDailyLossPct: 5, maxOpenPositions: 2 },
    capital: { allocated: 1000, currency: "USDT" },
  };
  if(options.paper || options.liveAlgo)Object.assign(agent,{type:'CRYPTO',strategy:'ALGO_TRADING',executionMode:options.liveAlgo ? 'LIVE':'PAPER',market:{symbols:['BTCUSD'],agentCycles:60},capital:{allocated:1000,currency:'USD'},risk:{maxRiskPerTradePct:1,maxDailyLossPct:5,maxOpenPositions:1,maxTradesPerDay:10,maxPositionsOpenedPerDay:5},strategyConfig:{id:'ema',fastPeriod:2,slowPeriod:3,lookback:3,atrPeriod:2,stopAtr:2,rewardRisk:2,timeframe:'1h',contract:{symbol:'BTCUSD',settlement:'USD'},simulation:{initialCapital:1000,leverage:2,riskPerTradePct:1,maxDailyLossPct:5,maxMarginPct:10,feeBps:5,slippageBps:2,fundingRatePct8h:0,maxTradesPerDay:10,maxPositionsOpenedPerDay:5,direction:'both'}}});
  const records = new Map<string, Map<string, Record<string, unknown>>>();
  const runs: Record<string, unknown>[] = [];
  records.set(COLLECTIONS.AgentExecutions, new Map());
  records.set(COLLECTIONS.ExecutionLocks, new Map());
  records.set(COLLECTIONS.OrderIntents, new Map());

  const matches = (doc: Record<string, unknown> | undefined, filter: Record<string, unknown>) => {
    if (!doc) return false;
    return Object.entries(filter).every(([key, value]) => {
      const actual = doc[key];
      if (value instanceof ObjectId) return actual instanceof ObjectId && actual.equals(value);
      if (value instanceof Date) return actual instanceof Date && actual.getTime() === value.getTime();
      return actual === value;
    });
  };
  const collection = (name: string) => {
    const map = records.get(name) ?? new Map<string, Record<string, unknown>>();
    records.set(name, map);
    return {
      findOne: async (filter: Record<string, unknown>) => name === COLLECTIONS.Agent
        ? (matches(agent, filter) ? agent : null)
        : [...map.values()].find((doc) => matches(doc, filter)) ?? (name === COLLECTIONS.Credentials && matches({ _id: credentialId, userId: options.credentialOwner ?? owner }, filter) ? { _id: credentialId, userId: options.credentialOwner ?? owner, type: "OPENAI", apiKey: "key" } : null)
          ?? (name === COLLECTIONS.Exchange && matches({ _id: exchangeId, userId: options.exchangeOwner ?? owner }, filter) ? { _id: exchangeId, userId: options.exchangeOwner ?? owner, name: options.paper || options.liveAlgo ? "DELTA" : "BINANCE", apiKey: "key", secret: "secret", sandbox: false } : null),
      countDocuments: async (filter: Record<string, unknown>) => runs.filter(run => matches(run, filter)).length,
      find: (filter: Record<string, unknown>) => ({ toArray:async()=>[], sort: () => ({ limit: (count: number) => ({ toArray: async () => runs.filter(run => matches(run, filter)).sort((a, b) => Number(b.createdAt) - Number(a.createdAt)).slice(0, count) }) }) }),
      insertOne: async (doc: Record<string, unknown>) => {
        const key = String(doc._id);
        if (map.has(key)) throw Object.assign(new Error("duplicate"), { code: 11000 });
        map.set(key, doc);
        if (name === COLLECTIONS.AgentRuns) runs.push(doc);
        return { insertedId: doc._id };
      },
      updateOne: async (filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) => {
        const target = name === COLLECTIONS.Agent ? agent : map.get(String(filter._id));
        if (!matches(target, filter)) return { modifiedCount: 0 };
        if (!target) return { modifiedCount: 0 };
        Object.assign(target, update.$set);
        if (name === COLLECTIONS.AgentRuns) runs.push(target);
        return { modifiedCount: 1 };
      },
      deleteOne: async (filter: Record<string, unknown>) => {
        const current = map.get(String(filter._id));
        if (!matches(current, filter)) return { deletedCount: 0 };
        map.delete(String(filter._id));
        return { deletedCount: 1 };
      },
      _map: map,
    };
  };
  const db = { collection } as unknown as import("mongodb").Db;
  return { db, agent, executions: collection(COLLECTIONS.AgentExecutions)._map, locks: collection(COLLECTIONS.ExecutionLocks)._map, intents: collection(COLLECTIONS.OrderIntents)._map, runs };
}

beforeEach(() => { preparationFailure=false; ownerActive = false; scheduled.length = 0; notices.length = 0; logEvents.length = 0; runAgent = async () => "ok"; runPaper=async()=>"PAPER ok";runLive=async()=>"ALGO ok"; });
afterAll(() => mock.restore());

describe("worker replay and durable claims", () => {
  test("rejects an invalid queue payload before any database or lock access", async () => {
    const state = makeDb();
    const processor = (await import("../src/workers/worker")).createRunProcessor(state.db) as Processor;
    await expect(processor({ id: "invalid-job", data: { agentId: "not-an-object-id", userId: owner, runAt } } as never)).rejects.toThrow();
    expect(state.executions.size).toBe(0);
    expect(state.locks.size).toBe(0);
  });

  test("only five compatible memories reach the LLM and its decision and broker receipts are saved separately", async () => {
    const state = makeDb();
    const context = memoryContext(state.agent, { name: "BINANCE", sandbox: false });
    const agentKey = agentId.toHexString();
    for (let index = 0; index < 7; index++) state.runs.push({ agentId: agentKey, memoryContext: context, createdAt: new Date(index * 1000), memory: buildRunMemory(`RUN_SUMMARY: compatible-${index}`, []) });
    state.runs.push({ agentId: agentKey, memoryContext: "old-config", createdAt: new Date(9000), memory: buildRunMemory("OUTDATED", []) });
    state.runs.push({ agentId: "someone-else", memoryContext: context, createdAt: new Date(10000), memory: buildRunMemory("OTHER AGENT", []) });
    runAgent = async (params) => {
      const memories = params.recentRuns as string[];
      expect(memories).toHaveLength(5);
      expect(memories[0]).toContain("compatible-6");
      expect(memories[4]).toContain("compatible-2");
      expect(memories.join()).not.toContain("OUTDATED");
      expect(memories.join()).not.toContain("OTHER AGENT");
      const safety = params.safety as ExecutionSafety;
      await safety.executeOrder({ symbol: "BTC/USDT", action: "entry" }, async () => ({ id: "accepted-not-filled" }));
      return '<MEU_MEMORY>{"action":"opened","symbols":["BTC/USDT"],"rationale":"Entry submitted.","watchFor":"Check fill.","nextReview":"Verify position."}</MEU_MEMORY>';
    };
    const processor = (await import("../src/workers/worker")).createRunProcessor(state.db) as Processor;
    await processor({ id: "memory-run", data: { agentId: agentKey, userId: owner, runAt } });
    const saved = state.runs.at(-1)!;
    expect(saved.memoryContext).toBe(context);
    expect(saved.executionId).toBe("memory-run");
    expect((saved.memory as ReturnType<typeof buildRunMemory>).confirmedCount).toBe(1);
    expect((saved.memory as ReturnType<typeof buildRunMemory>).summary!.rationale).toBe("Entry submitted.");
  });

  test("missed-candle failures retain locks and persist a machine-readable recovery reason", async () => {
    const state = makeDb();
    runAgent = async () => { throw new MissedLiveCandlesError(); };
    const processor = (await import("../src/workers/worker")).createRunProcessor(state.db) as Processor;
    await expect(processor({id:'missed-candles',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toMatchObject({code:'MISSED_LIVE_CANDLES'});
    expect(state.agent.status).toBe('PAUSED');expect(state.intents.size).toBe(0);
    expect(state.executions.get('missed-candles')).toMatchObject({state:'REVIEW_REQUIRED',reviewReason:'MISSED_LIVE_CANDLES'});
    expect(state.locks.size).toBe(3);
  });

  test('typed algorithm history failures before broker operations release locks after recording the failure',async()=>{
    for(const error of [new MissedLiveCandlesError(),new DeltaDataValidationError('Missing candle interval')]) {
      const state=makeDb({liveAlgo:true});runLive=async()=>{throw error;};
      const processor=(await import('../src/workers/worker')).createRunProcessor(state.db) as Processor;
      await expect(processor({id:'safe-history-failure',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toBe(error);
      expect(state.agent.status).toBe('PAUSED');expect(state.intents.size).toBe(0);expect(state.locks.size).toBe(0);
      expect(state.executions.get('safe-history-failure')).toMatchObject({state:'COMPLETED',outcome:'STRATEGY_DATA_REJECTED',reviewReason:error.code});
      expect(notices.at(-1)).toMatchObject({title:'Algorithm paused — candle history needs refresh'});
      expect(JSON.stringify(notices.at(-1))).toContain('other agents can continue');
    }
  });

  test('a typed history error after a broker operation still retains review locks',async()=>{
    const state=makeDb({liveAlgo:true});
    runLive=async(params)=>{await (params.safety as ExecutionSafety).executeOrder({symbol:'BTCUSD',action:'entry'},async()=>({id:'submitted'}));throw new DeltaDataValidationError('Invalid history');};
    const processor=(await import('../src/workers/worker')).createRunProcessor(state.db) as Processor;
    await expect(processor({id:'history-after-order',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toMatchObject({code:'DELTA_DATA_INVALID'});
    expect(state.executions.get('history-after-order')).toMatchObject({state:'REVIEW_REQUIRED'});expect(state.locks.size).toBe(3);
  });

  test('an execution guard failure before any order pauses only its agent and releases account locks',async()=>{
    const state=makeDb({liveAlgo:true});runLive=async()=>{throw new OrderRejectedError('Sizing snapshot is unavailable');};
    const processor=(await import('../src/workers/worker')).createRunProcessor(state.db) as Processor;
    await expect(processor({id:'guard-before-order',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toBeInstanceOf(OrderRejectedError);
    expect(state.agent.status).toBe('PAUSED');expect(state.locks.size).toBe(0);expect(state.intents.size).toBe(0);
    expect(state.executions.get('guard-before-order')).toMatchObject({state:'COMPLETED',outcome:'GUARD_REJECTED_BEFORE_ORDER'});
    expect(notices.at(-1)).toMatchObject({title:'Agent paused — execution guard rejected the run'});
  });

  test('temporary paper data failure retains RUNNING, schedules backoff and stores identical safe details in notification and execution',async()=>{
    const state=makeDb({paper:true});runPaper=async()=>{throw new DeltaDataError('DELTA_DATA_TIMEOUT','candle history',3);};
    const processor=(await import('../src/workers/worker')).createRunProcessor(state.db) as Processor;
    await processor({id:'paper-timeout',data:{agentId:agentId.toHexString(),userId:owner,runAt}});
    expect(state.agent.status).toBe('RUNNING');expect(state.locks.size).toBe(0);expect(state.runs).toHaveLength(0);expect(state.agent.lastRun).toBeUndefined();
    expect(scheduled).toHaveLength(1);expect(scheduled[0]!.runAt).toBeGreaterThan(Date.now()+59000);
    const execution=state.executions.get('paper-timeout')!;
    expect(execution).toMatchObject({state:'COMPLETED',outcome:'DATA_UNAVAILABLE',failure:{code:'DELTA_DATA_TIMEOUT',stage:'execute_strategy',attempts:3,candleTimeframe:'1h'}});
    expect(notices[0]).toMatchObject({type:'WARNING',code:'DELTA_DATA_TIMEOUT',metadata:execution.failure});
    expect(JSON.stringify(notices)).toContain('Simulation state was not advanced');
  });
  test('contract metadata drift parks the agent and schedules a reconciler refresh',async()=>{
    const state=makeDb({paper:true});
    runPaper=async()=>{throw new Error('Contract terms changed; review the strategy before resuming');};
    const processor=(await import('../src/workers/worker')).createRunProcessor(state.db) as Processor;
    await expect(processor({id:'contract-drift',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toThrow('Contract terms changed');
    expect(state.agent.status).toBe('PAUSED');
    expect(state.agent.contractRefreshAt).toBeInstanceOf(Date);
    expect(state.executions.get('contract-drift')).toMatchObject({state:'REVIEW_REQUIRED'});
    expect(state.locks.size).toBe(1);
  });

  test('paper rate limits honor Retry-After and invalid responses still pause for review',async()=>{
    const state=makeDb({paper:true});runPaper=async()=>{throw new DeltaDataError('DELTA_DATA_RATE_LIMIT','product details',1,429,10*60_000);};
    const processor=(await import('../src/workers/worker')).createRunProcessor(state.db) as Processor;
    await processor({id:'rate-limit',data:{agentId:agentId.toHexString(),userId:owner,runAt}});
    expect(scheduled[0]!.runAt).toBeGreaterThan(Date.now()+599000);expect(state.locks.size).toBe(0);
    const invalid=makeDb({paper:true});runPaper=async()=>{throw new DeltaDataError('DELTA_DATA_RESPONSE','candle history',1);};
    await expect(((await import('../src/workers/worker')).createRunProcessor(invalid.db) as Processor)({id:'invalid-data',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toThrow('invalid');
    expect(invalid.agent.status).toBe('PAUSED');expect(invalid.locks.size).toBe(1);expect(invalid.executions.get('invalid-data')).toMatchObject({failure:{code:'DELTA_DATA_RESPONSE',stage:'execute_strategy'}});
  });
  test('data errors outside the supported pre-save algorithm path retain review',async()=>{
    const state=makeDb();runAgent=async()=>{throw new DeltaDataError('DELTA_DATA_NETWORK','candle history',3);};
    await expect(((await import('../src/workers/worker')).createRunProcessor(state.db) as Processor)({id:'live-data',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toThrow('could not connect');
    expect(state.agent.status).toBe('PAUSED');expect(state.locks.size).toBe(3);expect(scheduled).toHaveLength(0);
    expect(notices[0]).toMatchObject({type:'ERROR',code:'DELTA_DATA_NETWORK',metadata:{mode:'LIVE',runId:'live-data'}});
  });

  test("a successful run advances its pointer and a redelivery cannot rerun the agent", async () => {
    const state = makeDb();
    const processor = (await import("../src/workers/worker")).createRunProcessor(state.db) as Processor;
    let agentCalls = 0;
    let brokerCalls = 0;
    runAgent = async (params) => {
      agentCalls++;
      const safety = params.safety as { executeOrder: <T>(intent: Record<string, unknown>, execute: () => Promise<T>) => Promise<T> };
      await safety.executeOrder({ symbol: "BTC/USDT", side: "buy", amount: 1 }, async () => { brokerCalls++; return { id: "order-1" }; });
      return "completed";
    };
    const job = { id: `job-${runAt}`, data: { agentId: agentId.toHexString(), userId: owner, runAt } };
    await processor(job);
    const pointerAfterFirst = (state.agent.nextRunAt as Date).getTime();
    await processor(job);

    expect(agentCalls).toBe(1);
    expect(brokerCalls).toBe(1);
    expect(state.runs).toHaveLength(1);
    expect(logEvents.map(entry => entry.event)).toContain("run.completed");
    expect(logEvents.map(entry => entry.event)).toContain("order.confirmed");
    expect(logEvents.map(entry => entry.event)).toContain("lock.released");
    expect(state.executions.get(job.id)?.state).toBe("COMPLETED");
    expect(state.intents.get(`${job.id}-1`)?.state).toBe("CONFIRMED");
    expect(state.locks.size).toBe(0);
    expect(pointerAfterFirst).toBeGreaterThan(runAt);
    expect((state.agent.nextRunAt as Date).getTime()).toBe(pointerAfterFirst);
  });

  test("an ambiguous accepted order pauses the agent, retains its lock, and blocks redelivery", async () => {
    const state = makeDb();
    const processor = (await import("../src/workers/worker")).createRunProcessor(state.db) as Processor;
    let agentCalls = 0;
    let brokerCalls = 0;
    runAgent = async (params) => {
      agentCalls++;
      const safety = params.safety as { executeOrder: <T>(intent: Record<string, unknown>, execute: () => Promise<T>) => Promise<T> };
      try {
        await safety.executeOrder({ symbol: "BTC/USDT", side: "buy", amount: 1 }, async () => {
          brokerCalls++;
          throw new Error("response lost after broker acceptance");
        });
      } catch { /* production tools convert rejected operations to tool results */ }
      return "agent continued";
    };
    const recoveryWrites:unknown[]=[];
    const job = { id: `ambiguous-${runAt}`, data: { agentId: agentId.toHexString(), userId: owner, runAt },updateData:async(data:unknown)=>{recoveryWrites.push(data);} };
    await expect(processor(job)).rejects.toThrow("reconcile OrderIntents");
    await processor(job);

    expect(agentCalls).toBe(1);
    expect(brokerCalls).toBe(1);
    expect(state.agent.status).toBe("PAUSED");
    expect(state.executions.get(job.id)?.state).toBe("REVIEW_REQUIRED");
    expect(state.intents.get(`${job.id}-1`)?.state).toBe("PENDING");
    expect(recoveryWrites).toHaveLength(0);
    expect(state.locks.size).toBe(3);
    expect(logEvents.map(entry => entry.event)).toContain("order.uncertain");
    expect(logEvents.map(entry => entry.event)).toContain("lock.retained");
    expect(logEvents.map(entry => entry.event)).toContain("run.review_required");
    expect((state.agent.nextRunAt as Date).getTime()).toBe(runAt);
  });

  test("foreign credential or exchange records stop before provider calls and claims", async () => {
    for (const options of [{ credentialOwner: "victim" }, { exchangeOwner: "victim" }]) {
      const state = makeDb(options);
      const processor = (await import("../src/workers/worker")).createRunProcessor(state.db) as Processor;
      let providerCalls = 0;
      runAgent = async () => { providerCalls++; return "must not run"; };
      const job = { id: `foreign-${runAt}`, data: { agentId: agentId.toHexString(), userId: owner, runAt } };
      await expect(processor(job)).rejects.toThrow("must belong to its owner");
      expect(providerCalls).toBe(0);
      expect(state.agent.status).toBe("PAUSED");
      expect([...state.executions.values()][0]).toMatchObject({state:'COMPLETED',outcome:'BLOCKED_BEFORE_EXECUTION',failure:{stage:'validate_configuration'}});
      expect(state.locks.size).toBe(0);
    }
  });

  test("a known pre-order refusal records REFUSED and completes without retaining account locks", async () => {
    const state = makeDb();
    const processor = (await import("../src/workers/worker")).createRunProcessor(state.db) as Processor;
    runAgent = async (params) => {
      const safety = params.safety as ExecutionSafety;
      try { await safety.executeOrder({ action: "crypto-entry" }, async () => { throw new OrderRejectedError("daily cap reached"); }); }
      catch { /* a tool returns its refusal to the agent */ }
      return "held after refusal";
    };
    const job = { id: `refused-${runAt}`, data: { agentId: agentId.toHexString(), userId: owner, runAt } };
    await processor(job);
    expect(state.intents.get(`${job.id}-1`)?.state).toBe("REFUSED");
    expect(logEvents.map(entry => entry.event)).toContain("order.refused");
    expect(state.agent.status).toBe("RUNNING");
    expect(state.executions.get(job.id)?.state).toBe("COMPLETED");
    expect(state.locks.size).toBe(0);
  });

  test("active account contention defers without pausing or provider calls", async () => {
    const state = makeDb(); ownerActive = true;
    const holder = `exchange:${exchangeId}`;
    state.locks.set(holder, { _id: holder, executionId: 'other-ticker-job', createdAt: new Date() });
    const processor = (await import("../src/workers/worker")).createRunProcessor(state.db) as Processor;
    let calls = 0; runAgent = async () => { calls++; return 'must not run'; };
    await processor({ id: 'contending-job', data: { agentId: agentId.toHexString(), userId: owner, runAt } });
    expect(state.agent.status).toBe('RUNNING'); expect(calls).toBe(0); expect(notices).toHaveLength(0);
    expect(scheduled).toHaveLength(1); expect(state.locks.size).toBe(1); expect(state.locks.get(holder)?.executionId).toBe('other-ticker-job');
    expect(state.executions.size).toBe(0);
  });

  test("current, retained and abandoned Start locks defer the waiter without taking over the lock", async () => {
    for (const kind of ['active', 'retained', 'abandoned']) {
      const state = makeDb(); const holder = `exchange:${exchangeId}`;
      state.locks.set(holder, { _id: holder, executionId: 'start:other-ticker', kind: 'START_PREFLIGHT', state: kind === 'retained' ? 'REVIEW_REQUIRED' : 'PREPARING', createdAt: new Date(Date.now() - (kind === 'abandoned' ? 360_000 : 0)) });
      const processor = (await import("../src/workers/worker")).createRunProcessor(state.db) as Processor;
      const promise = processor({ id: `setup-${kind}`, data: { agentId: agentId.toHexString(), userId: owner, runAt } });
      if (kind === 'active') { await promise; expect(state.agent.status).toBe('RUNNING'); expect(scheduled).toHaveLength(1); }
      else { await promise; expect(state.agent.status).toBe('RUNNING');expect(scheduled).toHaveLength(1);expect(state.executions.get(`setup-${kind}`)).toMatchObject({outcome:'WAITING_ON_LOCK'}); }
      expect(state.locks.size).toBe(1); expect(state.locks.get(holder)?.executionId).toBe('start:other-ticker');
      scheduled.length = 0;
    }
  });

  test("a retained execution remains blocked even if its queue job appears active", async () => {
    const state = makeDb(); ownerActive = true; const holder = `exchange:${exchangeId}`;
    state.locks.set(holder, { _id: holder, executionId: 'review-job', createdAt: new Date() });
    state.executions.set('review-job', { _id: 'review-job', state: 'REVIEW_REQUIRED', agentId: agentId.toHexString(), startedAt: new Date(0) });
    const processor = (await import("../src/workers/worker")).createRunProcessor(state.db) as Processor;
    await processor({ id:'blocked-job',data:{agentId:agentId.toHexString(),userId:owner,runAt} });
    expect(state.agent.status).toBe('RUNNING');expect(scheduled).toHaveLength(1);expect(state.locks.size).toBe(1);
    expect(state.locks.get(holder)?.executionId).toBe('review-job');
    expect(state.executions.get('blocked-job')).toMatchObject({outcome:'WAITING_ON_LOCK',failure:{blockedLockScope:'exchange',lockOwnerExecutionId:'review-job',lockOwnerState:'REVIEW_REQUIRED'}});
    expect(notices[0]).toMatchObject({type:'WARNING',code:'AGENT_WAITING_ON_EXECUTION'});
  });

  test("a stale status is rejected before provider calls", async () => {
    const state = makeDb({ agentStatus: "PAUSED" });
    const processor = (await import("../src/workers/worker")).createRunProcessor(state.db) as Processor;
    let providerCalls = 0;
    runAgent = async () => { providerCalls++; return "must not run"; };
    await processor({ id: `paused-${runAt}`, data: { agentId: agentId.toHexString(), userId: owner, runAt } });
    expect(providerCalls).toBe(0);
    expect(state.executions.size).toBe(0);
    expect(state.locks.size).toBe(0);
  });
});

test('LLM network failure before tools reschedules, but a failure after an order request retains review',async()=>{
 const state=makeDb();runAgent=async()=>{throw Object.assign(new Error('private upstream message'),{name:'NetworkError'});};
 const processor=(await import('../src/workers/worker')).createRunProcessor(state.db) as Processor;
 await processor({id:'llm-network',data:{agentId:agentId.toHexString(),userId:owner,runAt}});
 expect(state.agent.status).toBe('RUNNING');expect(state.locks.size).toBe(0);expect(state.executions.get('llm-network')).toMatchObject({outcome:'PROVIDER_UNAVAILABLE',failure:{code:'EXECUTION_NETWORK_FAILED'}});
 const afterOrder=makeDb();runAgent=async(params)=>{const safety=params.safety as ExecutionSafety;await safety.executeOrder({symbol:'BTC/USDT',action:'entry'},async()=>({id:'accepted'}));throw Object.assign(new Error('network after entry'),{name:'NetworkError'});};
 await expect(((await import('../src/workers/worker')).createRunProcessor(afterOrder.db) as Processor)({id:'llm-after-order',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toThrow('network after entry');
 expect(afterOrder.agent.status).toBe('PAUSED');expect(afterOrder.locks.size).toBe(3);expect(afterOrder.executions.get('llm-after-order')?.state).toBe('REVIEW_REQUIRED');
});

test('live Delta algorithm data timeout before orders reschedules and releases all three execution scopes',async()=>{
 const state=makeDb({liveAlgo:true});runLive=async()=>{throw new DeltaDataError('DELTA_DATA_TIMEOUT','candle history',3);};
 const processor=(await import('../src/workers/worker')).createRunProcessor(state.db) as Processor;
 await processor({id:'delta-live-timeout',data:{agentId:agentId.toHexString(),userId:owner,runAt}});
 expect(state.agent.status).toBe('RUNNING');expect(state.locks.size).toBe(0);expect(state.intents.size).toBe(0);expect(state.runs).toHaveLength(0);expect(state.agent.lastRun).toBeUndefined();
 expect(state.executions.get('delta-live-timeout')).toMatchObject({state:'COMPLETED',outcome:'DATA_UNAVAILABLE',failure:{mode:'LIVE',attempts:3}});
 expect(notices[0]).toMatchObject({type:'WARNING',code:'DELTA_DATA_TIMEOUT'});expect(scheduled).toHaveLength(1);
});

test('temporary exchange preparation failure reschedules before claiming an execution',async()=>{
 const state=makeDb({liveAlgo:true});preparationFailure=true;
 await ((await import('../src/workers/worker')).createRunProcessor(state.db) as Processor)({id:'preparation-timeout',data:{agentId:agentId.toHexString(),userId:owner,runAt}});
 expect(state.agent.status).toBe('RUNNING');expect(state.locks.size).toBe(0);expect(state.intents.size).toBe(0);expect(scheduled).toHaveLength(1);
 expect(state.executions.get('preparation-timeout')).toMatchObject({outcome:'SERVICE_UNAVAILABLE_BEFORE_CLAIM',failure:{stage:'validate_configuration',code:'EXECUTION_NETWORK_FAILED'}});
});

test('LLM validation refusal before any tool pauses only the agent and releases execution locks',async()=>{
 const state=makeDb();runAgent=async()=>{throw Object.assign(new Error('private validation'),{name:'AI_APICallError',statusCode:400,responseBody:'{"message":"Operation not allowed"}'});};
 const processor=(await import('../src/workers/worker')).createRunProcessor(state.db) as Processor;
 await expect(processor({id:'llm-rejected',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toThrow('private validation');
 expect(state.agent.status).toBe('PAUSED');expect(state.locks.size).toBe(0);
 expect(state.executions.get('llm-rejected')).toMatchObject({state:'COMPLETED',outcome:'PROVIDER_REQUEST_REJECTED',failure:{code:'LLM_OPERATION_NOT_ALLOWED',stage:'llm_request',brokerOperationRequested:false}});
 expect(notices.at(-1)).toMatchObject({code:'LLM_OPERATION_NOT_ALLOWED',title:'LLM request rejected — agent paused'});
 const afterOrder=makeDb();runAgent=async(params)=>{await (params.safety as ExecutionSafety).executeOrder({symbol:'BTC/USDT',action:'entry'},async()=>({id:'accepted'}));throw Object.assign(new Error('step two rejected'),{name:'AI_APICallError',statusCode:400});};
 await expect(((await import('../src/workers/worker')).createRunProcessor(afterOrder.db) as Processor)({id:'llm-rejected-after-order',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toThrow('step two rejected');
 expect(afterOrder.locks.size).toBe(3);expect(afterOrder.executions.get('llm-rejected-after-order')?.state).toBe('REVIEW_REQUIRED');
});

test('a repeated LLM deadline notifies despite an inherited failure count, reschedules and frees the account',async()=>{
 const state=makeDb();state.agent.dataFailureCount=2;runAgent=async()=>{throw new DOMException('request expired','TimeoutError');};
 await ((await import('../src/workers/worker')).createRunProcessor(state.db) as Processor)({id:'llm-timeout',data:{agentId:agentId.toHexString(),userId:owner,runAt}});
 expect(state.agent.status).toBe('RUNNING');expect(state.locks.size).toBe(0);
 expect(state.executions.get('llm-timeout')).toMatchObject({state:'COMPLETED',outcome:'PROVIDER_UNAVAILABLE',failure:{code:'LLM_REQUEST_TIMEOUT',stage:'llm_request',consecutiveFailures:3}});
 expect(notices.at(-1)).toMatchObject({type:'WARNING',code:'LLM_REQUEST_TIMEOUT',title:'LLM run delayed — provider unavailable'});
});

test('worker forwards the owned Bedrock endpoint and region to the agent and failure details',async()=>{
 const state=makeDb();const row={_id:credentialId,userId:owner,type:'AMAZON_BEDROCK',apiKey:'fixture',region:'us-east-1',bedrockEndpoint:'mantle'};
 (state.db.collection(COLLECTIONS.Credentials) as any)._map.set(String(credentialId),row);
 state.agent.llmModel='openai.gpt-oss-20b';
 runAgent=async(params)=>{expect(params.providerId).toBe('bedrock');expect(params.providerRegion).toBe('us-east-1');expect(params.providerEndpoint).toBe('mantle');expect(params.model).toBe('openai.gpt-oss-20b');throw new DOMException('fixture','TimeoutError');};
 await ((await import('../src/workers/worker')).createRunProcessor(state.db) as Processor)({id:'mantle-forwarding',data:{agentId:agentId.toHexString(),userId:owner,runAt}});
 expect(state.executions.get('mantle-forwarding')).toMatchObject({failure:{llmProvider:'bedrock',llmEndpoint:'mantle',llmModel:'openai.gpt-oss-20b'}});
 expect(state.locks.size).toBe(0);
});

test('blank LLM output is explicit, warns, and does not replay or retain locks',async()=>{
 const state=makeDb();runAgent=async()=>"\n\n\n";
 const {createRunProcessor}=await import('../src/workers/worker');
 await createRunProcessor(state.db as never)({id:`${agentId}-${runAt}`,data:{agentId:String(agentId),userId:owner,runAt}} as never);
 expect(state.runs[0]?.llmResponse).toContain('no readable decision summary');
 expect(notices).toContainEqual(expect.objectContaining({code:'LLM_OUTPUT_MISSING'}));
 expect(state.agent.status).toBe('RUNNING');
 expect(scheduled).toHaveLength(1);
 expect(state.locks.size).toBe(0);
});


test('known refused setting preflight does not leave an unnecessary account execution lock',async()=>{
 const state=makeDb({liveAlgo:true});
 runLive=async params=>{
  const safety=params.safety as ExecutionSafety;
  try{await safety.executeOrder({action:'delta-leverage',symbol:'BTCUSD',leverage:1},async()=>{throw new OrderRejectedError('No setting write was requested');});}catch{}
  throw new OrderRejectedError('Agent paused before the entry');
 };
 const processor=(await import('../src/workers/worker')).createRunProcessor(state.db) as Processor;
 await expect(processor({id:'refused-setting',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toBeInstanceOf(OrderRejectedError);
 expect(state.locks.size).toBe(0);expect(state.executions.get('refused-setting')).toMatchObject({state:'COMPLETED',outcome:'GUARD_REJECTED_BEFORE_ORDER'});
 expect([...state.intents.values()][0]).toMatchObject({state:'REFUSED'});
});


test('unverified automatic leverage retains its pending intent and account locks with precise failure details',async()=>{
 const state=makeDb({liveAlgo:true});
 runLive=async params=>{
  const safety=params.safety as ExecutionSafety;
  await safety.executeOrder({action:'delta-leverage',symbol:'BTCUSD',leverage:1,leverageCeiling:2},async()=>{throw new DeltaLeverageUncertainError('BTCUSD',1);});
  return 'unreachable';
 };
 const processor=(await import('../src/workers/worker')).createRunProcessor(state.db) as Processor;
 await expect(processor({id:'uncertain-setting',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toBeInstanceOf(DeltaLeverageUncertainError);
 expect(state.locks.size).toBe(3);expect(state.executions.get('uncertain-setting')).toMatchObject({state:'REVIEW_REQUIRED',failure:{code:'DELTA_LEVERAGE_UNCERTAIN',entryOrderRequested:false,targetLeverage:1}});
 expect([...state.intents.values()][0]).toMatchObject({state:'PENDING'});expect(state.runs).toHaveLength(0);expect((notices.at(-1) as {message?:string}|undefined)?.message).toContain('No entry order was sent');
});


test('LLM-swallowed protection failures preserve typed reason and account locks',async()=>{
 const state=makeDb();
 runAgent=async params=>{try {await (params.safety as ExecutionSafety).executeOrder({action:'crypto-entry',symbol:'BTC/USDT',clientOrderId:'owned'},async()=>{throw new CryptoProtectionError('BTC/USDT');});}catch{}return 'held after tool failure';};
 const processor=(await import('../src/workers/worker')).createRunProcessor(state.db) as Processor;
 await expect(processor({id:'protection-failure',data:{agentId:agentId.toHexString(),userId:owner,runAt}})).rejects.toBeInstanceOf(CryptoProtectionError);
 expect(state.locks.size).toBe(3);expect(state.executions.get('protection-failure')).toMatchObject({state:'REVIEW_REQUIRED',failure:{code:'CRYPTO_PROTECTION_UNVERIFIED'}});
});

 test('LLM configured candle horizon is independent of review cadence and includes accurate review context', async () => {
  for (const timeframe of [undefined, '15m']) {
    const state = makeDb(); state.agent.market = { symbols: ['BTC/USDT'], agentCycles: 300 };
    state.agent.strategyConfig = timeframe ? { analysisTimeframe: timeframe } : {};
    state.agent.lastRun = new Date('2026-10-09T12:00:00Z');
    state.runs.push({ agentId: String(agentId), createdAt: state.agent.lastRun });
    runAgent = async params => {
      expect(params.analysisTimeframe).toBe(timeframe ?? '1m');
      expect(params.reviewContext).toMatchObject({ reviewCadenceSeconds: 300, lastSuccessfulReviewAt: '2026-10-09T12:00:00.000Z', completedReviewCount: 1, nextScheduledReviewAt: null, scheduledReviewAt: new Date(runAt).toISOString() });
      expect(params.cycles).toBeUndefined(); return 'HOLD';
    };
    await ((await import('../src/workers/worker')).createRunProcessor(state.db) as Processor)({ id: `timeframe-${timeframe}`, data: { agentId: String(agentId), userId: owner, runAt } });
    expect(state.agent.status).toBe('RUNNING');
  }
 });

 test('typed primary LLM candle failures wait and release locks before any broker request', async () => {
  const { LlmMarketDataError } = await import('../src/market-data/cryptoAnalysis');
  for (const code of ['LLM_MARKET_DATA_STALE', 'LLM_MARKET_DATA_INVALID', 'LLM_MARKET_DATA_INSUFFICIENT', 'LLM_MARKET_DATA_UNAVAILABLE'] as const) {
    const state = makeDb(); state.agent.strategyConfig = { analysisTimeframe: '15m' };
    runAgent = async () => { throw new LlmMarketDataError(code, '15m'); };
    await ((await import('../src/workers/worker')).createRunProcessor(state.db) as Processor)({ id: code, data: { agentId: String(agentId), userId: owner, runAt } });
    expect(state.agent.status).toBe('RUNNING'); expect(state.locks.size).toBe(0); expect(state.intents.size).toBe(0); expect(state.runs).toHaveLength(0);
    expect(state.executions.get(code)).toMatchObject({ state: 'COMPLETED', outcome: 'DATA_UNAVAILABLE', failure: { code, candleTimeframe: '15m', brokerOperationRequested: false } });
  }
 });

test('database failure after a read-only timeout preserves recovery evidence independently in the queue',async()=>{
 const state=makeDb();const captured:Record<string,unknown>[]=[];
 const brokenDb={collection:(name:string)=>{const col=state.db.collection(name);return name===COLLECTIONS.AgentExecutions?{...col,updateOne:async()=>{throw new Error('database unavailable');}}:col;}} as unknown as Db;
 runAgent=async()=>{throw Object.assign(new Error('provider timed out'),{name:'TimeoutError'});};
 const job={id:'orphan-readonly-timeout',data:{agentId:String(agentId),userId:owner,runAt},updateData:async(data:Record<string,unknown>)=>{captured.push(data);}};
 await expect(((await import('../src/workers/worker')).createRunProcessor(brokenDb) as Processor)(job)).rejects.toThrow('database unavailable');
 expect(captured[0]).toMatchObject({recoveryFailure:{version:1,runId:job.id,brokerOperationRequested:false,code:'LLM_REQUEST_TIMEOUT'}});
 expect(state.executions.get(job.id)?.state).toBe('STARTED');expect(state.intents.size).toBe(0);expect(state.locks.size).toBeGreaterThan(0);expect(state.agent.status).toBe('PAUSED');
});
