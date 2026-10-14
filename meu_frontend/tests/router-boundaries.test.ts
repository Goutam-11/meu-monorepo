import { afterAll, describe, expect, mock, test } from "bun:test";
import { decryptSecret } from "../src/lib/security/encryption";
import { AgentStrategy, AgentType } from "../src/generated/prisma/enums";

const rows: { credentials: Record<string, unknown>[]; exchanges: Record<string, unknown>[] } = { credentials: [], exchanges: [] };
let agentUpdateWhere: Record<string, unknown> | undefined;
let agentUpdateData: Record<string, unknown> | undefined;
let agentLookupWhere: Record<string, unknown> | undefined;
let savedCadence = 60;
let savedStatus = "PAUSED";
let editLockBusy = false;
let credentialAgentRunning = false;
let editLockReleased = false;
let activeOwnership = false;
let unfinishedExecution = false;
let credentialConsumers: {id:string}[] = [];
let deleteLocks: unknown[] = [];
let deletedWhere: Record<string,unknown> | undefined;
const savedUpdatedAt = new Date("2026-10-08T00:00:00Z");
let agentCreateCalls = 0;
let agentCreateData: Record<string, unknown> | undefined;
let credentialLookupCalls = 0;

const prismaStub = {
  $runCommandRaw: async (command: Record<string, unknown>) => {
    if (command.insert === 'ExecutionLocks') return editLockBusy ? {ok:1,n:0,writeErrors:[{code:11000}]} : {ok:1,n:1};
    if (command.delete === 'ExecutionLocks') {
      const deletion=(command.deletes as {q:{_id:string;executionId:string};limit:number}[])[0]!;
      expect(deletion.q._id).toBe('agent:agent-1');expect(deletion.q.executionId).toStartWith('edit:');expect(deletion.limit).toBe(1);
      editLockReleased = true; return {ok:1,n:editLockBusy?0:1};
    }
    return {ok:1,cursor:{id:0,firstBatch:command.find==='AgentExecutions' && unfinishedExecution ? [{state:'REVIEW_REQUIRED'}] : command.find==='CryptoPositionOwners' && activeOwnership ? [{state:'OPEN'}] : command.find==='ManagedCryptoOrders' ? [] : deleteLocks}};
  },
  agent: {
    findFirst: async () => credentialAgentRunning ? {id:"linked-agent"} : null,
    findMany: async () => credentialConsumers,
    findFirstOrThrow: async ({ where }: { where: Record<string, unknown> }) => {
      agentLookupWhere = where;
      if (where.userId !== "owner" || where.id !== "agent-1") throw new Error("not found");
      return { id: where.id, status: savedStatus, updatedAt: savedUpdatedAt, market: {agentCycles: savedCadence,symbols:["BTC/USDT"]},exchangeId:"exchange-2",type:"CRYPTO" };
    },
    delete: async ({where}: {where: Record<string,unknown>}) => {deletedWhere=where;return {id:where.id};},
    update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      agentUpdateWhere = where;
      agentUpdateData = data;
      return { id: where.id, ...data };
    },
    create: async ({ data }: { data: Record<string, unknown> }) => { agentCreateCalls++; agentCreateData = data; return data; },
  },
  exchange: {
    findFirst: async ({ where }: { where: Record<string, unknown> }) => where.userId === "owner" && ["exchange-1", "exchange-2", "delta-india"].includes(String(where.id))
      ? { id: where.id, name: where.id === "exchange-1" ? "ZERODHA" : where.id === "delta-india" ? "DELTA" : "BINANCE" }
      : null,
    update: async ({where,data}: {where:Record<string,unknown>;data:Record<string,unknown>}) => {
      expect(where.userId).toBe('owner');const row=rows.exchanges.find(r=>r.id===where.id);if(!row)throw new Error('not found');Object.assign(row,data);return row;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `exchange-${rows.exchanges.length + 1}`, accessToken: "encrypted-token", ...data };
      rows.exchanges.push(row);
      return row;
    },
  },
  credentials: {
    findFirst: async ({ where }: { where: Record<string, unknown> }) => {
      credentialLookupCalls++;
      return where.userId === "owner" && (where.id === "credential-1" || rows.credentials.some(r=>r.id===where.id)) ? { id: where.id, ...(rows.credentials.find(r=>r.id===where.id) ?? {type:"OPENAI"}) } : null;
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `credential-${rows.credentials.length + 1}`, ...data };
      rows.credentials.push(row);
      return row;
    },
    update: async ({where,data}: {where:Record<string,unknown>;data:Record<string,unknown>}) => {
      expect(where.userId).toBe('owner');const row=rows.credentials.find(r=>r.id===where.id);if(!row)throw new Error('not found');Object.assign(row,data);return row;
    },
    findMany: async () => rows.credentials,
  },
};

mock.module("@/features/markets/server/catalog",()=>({
  assertMarketSymbols:async(userId:string)=>{expect(userId).toBe("owner");},
  loadMarketCatalog:async()=>({markets:[],loadedAt:"fixture"}),searchMarkets:()=>({markets:[],total:0,loadedAt:"fixture"}),
}));
mock.module("@/lib/db", () => ({ default: prismaStub }));
mock.module("@/lib/auth/server", () => ({ auth: { api: { getSession: async () => ({ user: { id: "owner" } }) } } }));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));
mock.module("server-only", () => ({}));

const validAgent = {
  name: "Test Bot", llmModel: "model-x", credentialId: "credential-1", exchangeId: "exchange-2",
  type: AgentType.CRYPTO, strategy: AgentStrategy.LLM_TRADING, temperature: 0,
  market: { symbols: ["BTC/USDT"], agentCycles: 60 },
  risk: { maxRiskPerTradePct: 2, maxDailyLossPct: 5, maxOpenPositions: 3, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 },
  capital: { allocated: 100, currency: "USDT" },
  strategyConfig: { fastPeriod: 12, slowPeriod: 26 },
};

describe("actual protected router boundaries with a fake database", () => {
  test("agent update scopes the lookup and write to the caller, without changing ownership", async () => {
    const { agentsRouter } = await import("../src/features/agents/server/router");
    const caller = agentsRouter.createCaller({ userId: "untrusted-context-value" } as never);
    await caller.update({ id: "agent-1", ...validAgent });
    expect(agentLookupWhere).toEqual({ id: "agent-1", userId: "owner" });
    expect(agentUpdateWhere).toEqual({ id: "agent-1", userId: "owner", status: "PAUSED", updatedAt: savedUpdatedAt });
    expect(agentUpdateData).not.toHaveProperty("userId");
    expect(agentUpdateData?.risk).toEqual(validAgent.risk);
    expect(agentUpdateData?.strategyConfig).toEqual(validAgent.strategyConfig);

    await expect(caller.update({ id: "victim-agent", ...validAgent })).rejects.toThrow("not found");
    expect(agentLookupWhere).toEqual({ id: "victim-agent", userId: "owner" });
  });

  test("configuration edits reject running agents and retained locks; owned edit locks are released", async () => {
    const { agentsRouter } = await import("../src/features/agents/server/router");
    const caller = agentsRouter.createCaller({} as never);
    const previous = agentUpdateData;
    savedStatus='RUNNING';
    await expect(caller.update({id:'agent-1',...validAgent})).rejects.toThrow('Pause the agent');
    expect(agentUpdateData).toBe(previous);
    savedStatus='PAUSED';editLockBusy=true;
    await expect(caller.update({id:'agent-1',...validAgent})).rejects.toThrow('retained lock');
    expect(agentUpdateData).toBe(previous);
    editLockBusy=false;unfinishedExecution=true;
    await expect(caller.update({id:'agent-1',...validAgent})).rejects.toThrow('unfinished execution history');
    expect(agentUpdateData).toBe(previous);
    unfinishedExecution=false;editLockReleased=false;
    await expect(caller.update({id:'agent-1',...validAgent,exchangeId:'foreign-exchange'})).rejects.toThrow('own');
    expect(editLockReleased).toBe(true);
    expect(agentUpdateData).toBe(previous);
  });

  test("routing changes reject tracked positions and preserve the saved configuration", async () => {
    const {agentsRouter}=await import('../src/features/agents/server/router');
    const caller=agentsRouter.createCaller({} as never);
    const previous=agentUpdateData;
    activeOwnership=true;
    await expect(caller.update({id:'agent-1',...validAgent,exchangeId:'exchange-1'})).rejects.toThrow('tracked position');
    expect(agentUpdateData).toBe(previous);
    activeOwnership=false;
  });

  test("cadence edits replace the pending schedule, while unrelated edits preserve it", async () => {
    const { agentsRouter } = await import("../src/features/agents/server/router");
    const caller = agentsRouter.createCaller({} as never);
    savedCadence = 3600;
    await caller.update({ id: "agent-1", ...validAgent, market: {...validAgent.market, agentCycles: 900} });
    expect(agentUpdateData?.nextRunAt).toBeNull();
    savedCadence = 900;
    await caller.update({ id: "agent-1", ...validAgent, market: {...validAgent.market, agentCycles: 900} });
    expect(agentUpdateData).not.toHaveProperty("nextRunAt");
    savedCadence = 60;
  });

  test("deletion rejects running agents and retained locks, then uses a paused version check", async () => {
    const { agentsRouter } = await import("../src/features/agents/server/router");
    const caller = agentsRouter.createCaller({} as never);
    savedStatus='RUNNING';
    await expect(caller.delete({id:'agent-1'})).rejects.toThrow('Pause the agent');
    savedStatus='PAUSED';deleteLocks=[{_id:'agent:agent-1'}];
    await expect(caller.delete({id:'agent-1'})).rejects.toThrow('execution lock');
    expect(deletedWhere).toBeUndefined();
    deleteLocks=[];
    await caller.delete({id:'agent-1'});
    expect(deletedWhere).toEqual({id:'agent-1',userId:'owner',status:'PAUSED',updatedAt:savedUpdatedAt});
    savedStatus='PAUSED';
  });

  test("agent creation rejects a foreign resource before inserting", async () => {
    const { agentsRouter } = await import("../src/features/agents/server/router");
    const caller = agentsRouter.createCaller({} as never);
    await expect(caller.create({ ...validAgent, exchangeId: "foreign-exchange" })).rejects.toThrow("own");
    expect(agentCreateCalls).toBe(0);
  });

  test("algorithm agents persist empty LLM fields without looking up a credential", async () => {
    const { agentsRouter } = await import("../src/features/agents/server/router");
    const caller = agentsRouter.createCaller({} as never);
    const callsBeforeCreate = credentialLookupCalls;
    await caller.create({
      ...validAgent,
      strategy: AgentStrategy.ALGO_TRADING,
      type: AgentType.STOCKS,
      exchangeId: "exchange-1",
      capital: {allocated:100,currency:"INR"},
      llmModel: "",
      credentialId: "",
    });
    expect(credentialLookupCalls).toBe(callsBeforeCreate);
    expect(agentCreateData?.credentialId).toBeNull();
    expect(agentCreateData?.llmModel).toBe("");
    expect(agentCreateData?.status).toBe("PAUSED");
    expect(agentCreateData?.nextRunAt).toBeNull();
    expect(agentCreateData?.strategyConfig).toEqual(validAgent.strategyConfig);
  });

  test("algorithm agents reject exchanges the worker cannot execute", async () => {
    const { agentsRouter } = await import("../src/features/agents/server/router");
    const caller = agentsRouter.createCaller({} as never);
    const callsBeforeInvalidCreate = agentCreateCalls;
    await expect(caller.create({
      ...validAgent,
      strategy: AgentStrategy.ALGO_TRADING,
      type: AgentType.STOCKS,
      exchangeId: "exchange-2",
      llmModel: "",
      credentialId: "",
    })).rejects.toThrow("require a Zerodha stocks exchange");
    expect(agentCreateCalls).toBe(callsBeforeInvalidCreate);
  });

  test("stock and crypto connections cannot be mixed, and stocks require INR", async () => {
    const {agentsRouter}=await import('../src/features/agents/server/router');
    const caller=agentsRouter.createCaller({} as never);
    const before=agentCreateCalls;
    await expect(caller.create({...validAgent,type:AgentType.STOCKS})).rejects.toThrow('Stock agents require a Zerodha');
    await expect(caller.create({...validAgent,exchangeId:'exchange-1'})).rejects.toThrow('Crypto agents require a crypto');
    await expect(caller.create({...validAgent,type:AgentType.STOCKS,exchangeId:'exchange-1'})).rejects.toThrow('INR API wallet units');
    expect(agentCreateCalls).toBe(before);
    await caller.create({...validAgent,type:AgentType.STOCKS,exchangeId:'exchange-1',capital:{allocated:100,currency:'inr'}});
    expect(agentCreateData?.capital).toEqual({allocated:100,currency:'INR'});
  });

  test("crypto allocation uses the target wallet currency and normalizes casing", async () => {
    const { agentsRouter } = await import("../src/features/agents/server/router");
    const caller = agentsRouter.createCaller({} as never);
    const callsBeforeInvalidCreate = agentCreateCalls;
    await expect(caller.create({ ...validAgent, exchangeId: "delta-india" })).rejects.toThrow("USD API wallet units");
    await expect(caller.create({ ...validAgent, exchangeId: "exchange-2", capital: { allocated: 100, currency: "INR" } })).rejects.toThrow("USDT API wallet units");
    expect(agentCreateCalls).toBe(callsBeforeInvalidCreate);
    await caller.create({ ...validAgent, exchangeId: "delta-india", capital: { allocated: 100, currency: " usd " } });
    expect(agentCreateData?.capital).toEqual({ allocated: 100, currency: "USD" });
  });

  test("credential and exchange mutations encrypt writes and redact all returned secrets", async () => {
    process.env.ENCRYPTION_KEY = "cd".repeat(32);
    const [{ credentialsRouter }, { exchangeRouter }] = await Promise.all([
      import("../src/features/credentials/server/router"),
      import("../src/features/exchange/server/router"),
    ]);
    const credentials = credentialsRouter.createCaller({} as never);
    const exchange = exchangeRouter.createCaller({} as never);
    const savedCredential = await credentials.create({ type: "OPENAI", apiKey: "fake-credential-secret" });
    const savedExchange = await exchange.create({ name: "BINANCE", apiKey: "fake-api-key", secret: "fake-api-secret", sandbox: false });
    const encryptedCredentialKey = rows.credentials[0]?.apiKey;
    const encryptedExchangeKey = rows.exchanges[0]?.apiKey;
    const encryptedExchangeSecret = rows.exchanges[0]?.secret;
    expect(typeof encryptedCredentialKey).toBe("string");
    expect(typeof encryptedExchangeKey).toBe("string");
    expect(typeof encryptedExchangeSecret).toBe("string");
    if (typeof encryptedCredentialKey !== "string" || typeof encryptedExchangeKey !== "string" || typeof encryptedExchangeSecret !== "string") {
      throw new Error("Fake database did not receive encrypted strings");
    }
    expect(encryptedCredentialKey).toStartWith("meu:v1:");
    expect(encryptedExchangeKey).toStartWith("meu:v1:");
    expect(decryptSecret(encryptedCredentialKey)).toBe("fake-credential-secret");
    expect(decryptSecret(encryptedExchangeKey)).toBe("fake-api-key");
    expect(decryptSecret(encryptedExchangeSecret)).toBe("fake-api-secret");
    expect(savedCredential.apiKey).toBe("");
    expect(savedExchange.apiKey).toBe("");
    expect(savedExchange.secret).toBe("");
    expect(savedExchange).not.toHaveProperty("accessToken");
    expect((await credentials.listAll())[0]?.apiKey).toBe("");
  });
});

afterAll(() => mock.restore());

test('named Bedrock credentials preserve encrypted keys during rename and store the explicit region',async()=>{
  process.env.ENCRYPTION_KEY='cd'.repeat(32);
  const {credentialsRouter}=await import('../src/features/credentials/server/router');
  const caller=credentialsRouter.createCaller({} as never);
  const saved=await caller.create({type:'AMAZON_BEDROCK',displayName:'  Research Bedrock  ',region:'ap-south-1',apiKey:'bedrock-fixture-key'});
  expect(saved.displayName).toBe('Research Bedrock');expect(saved.region).toBe('ap-south-1');expect(saved.apiKey).toBe('');
  const row=rows.credentials.find(r=>r.id===saved.id)!;expect(decryptSecret(row.apiKey as string)).toBe('bedrock-fixture-key');
  const encrypted=row.apiKey;
  await caller.update({id:saved.id,type:'AMAZON_BEDROCK',displayName:'Renamed',region:'ap-south-1',apiKey:''});
  expect(row.apiKey).toBe(encrypted);expect(row.displayName).toBe('Renamed');
  await expect(caller.update({id:saved.id,type:'OPENAI',apiKey:''})).rejects.toMatchObject({code:'BAD_REQUEST'});
  await expect(caller.update({id:'foreign',type:'AMAZON_BEDROCK',region:'ap-south-1',apiKey:''})).rejects.toMatchObject({code:'NOT_FOUND'});
});

test('renaming an exchange leaves its broker type and encrypted keys intact',async()=>{
  const {exchangeRouter}=await import('../src/features/exchange/server/router');const caller=exchangeRouter.createCaller({} as never);
  const row=rows.exchanges[0]!;const key=row.apiKey,secret=row.secret;
  const result=await caller.update({id:row.id as string,name:'BINANCE',displayName:'  My futures account  ',apiKey:'',secret:'',sandbox:false});
  expect(row.name).toBe('BINANCE');expect(row.displayName).toBe('My futures account');expect(row.apiKey).toBe(key);expect(row.secret).toBe(secret);
  expect(result.apiKey).toBe('');expect(result.secret).toBe('');
});


test('running credential consumers block execution changes but allow renaming',async()=>{
  const {credentialsRouter}=await import('../src/features/credentials/server/router');
  const caller=credentialsRouter.createCaller({} as never);
  const row=rows.credentials.find(r=>r.type==='AMAZON_BEDROCK')!;
  credentialAgentRunning=true;
  const encrypted=row.apiKey;
  for(const change of [
    {type:'AMAZON_BEDROCK' as const,region:'us-east-1',apiKey:''},
    {type:'AMAZON_BEDROCK' as const,region:'ap-south-1',apiKey:'rotated-key'},
    {type:'AMAZON_BEDROCK' as const,region:'ap-south-1',bedrockEndpoint:'mantle' as const,apiKey:''},
    {type:'OPENAI' as const,apiKey:'new-provider-key'},
  ]) await expect(caller.update({id:row.id as string,...change})).rejects.toThrow('Pause agents');
  expect(row.apiKey).toBe(encrypted);
  expect(row.type).toBe('AMAZON_BEDROCK');
  await caller.update({id:row.id as string,type:'AMAZON_BEDROCK',region:'ap-south-1',displayName:'Allowed rename',apiKey:''});
  expect(row.displayName).toBe('Allowed rename');
  credentialAgentRunning=false;
});


test('paused credential consumers with retained execution locks block key rotation',async()=>{
  const {credentialsRouter}=await import('../src/features/credentials/server/router');
  const caller=credentialsRouter.createCaller({} as never);
  const row=rows.credentials.find(r=>r.type==='AMAZON_BEDROCK')!;
  credentialConsumers=[{id:'agent-1'}];deleteLocks=[{_id:'agent:agent-1'}];
  const encrypted=row.apiKey;
  await expect(caller.update({id:row.id as string,type:'AMAZON_BEDROCK',region:'ap-south-1',apiKey:'rotated-key'})).rejects.toThrow('recover retained locks');
  expect(row.apiKey).toBe(encrypted);
  credentialConsumers=[];deleteLocks=[];
});
