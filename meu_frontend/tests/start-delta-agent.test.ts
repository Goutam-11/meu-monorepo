import { test, expect, mock } from 'bun:test';
const updatedAt = new Date('2026-10-07T00:00:00Z');
let recoveryLockBusy = false;
let foreignLock = false;
let recoverySucceeds = false, recoverCalls = 0;
let paused = true, settingsFailure = false, lockBusy = false, failCas = false, releaseFailure = false;
let otherSymbols: string[] = [];
let aliasOnly = false, accountLockBusy = false;
let allowAccountModeChange: boolean | undefined;
let prepareCalls = 0, activationCalls = 0, deleteCalls = 0, rollbackCalls = 0;
const agent = { id: 'a'.repeat(24), userId: 'owner', exchangeId: 'b'.repeat(24), status: 'PAUSED', executionMode: 'LIVE', type: 'CRYPTO', strategy: 'ALGO_TRADING', updatedAt, strategyStartedAt: null,
  risk: { maxRiskPerTradePct: 0.5, maxDailyLossPct: 1, maxOpenPositions: 1, maxTradesPerDay: 1, maxPositionsOpenedPerDay: 1 },
  capital: { allocated: 10, currency: 'USD' }, market: { symbols: ['XRPUSD'], agentCycles: 60 },
  strategyConfig: { contract: { symbol: 'XRPUSD', contractSize: 1, maintenanceMarginRate: 0.005 }, id: 'donchian', fastPeriod: 20, slowPeriod: 50, lookback: 20, atrPeriod: 14, stopAtr: 2, rewardRisk: 2, timeframe: '1h', simulation: { initialCapital: 10, leverage: 2, riskPerTradePct: 0.5, maxMarginPct: 10, feeBps: 10, slippageBps: 5, fundingRatePct8h: 0, maxTradesPerDay: 1, maxPositionsOpenedPerDay: 1, maxDailyLossPct: 1, direction: 'both' } },
};
mock.module('../src/features/agents/server/recover-delta-agent', () => ({recoverDeltaAgent: async () => { recoverCalls++; if (recoverySucceeds) { lockBusy = false; return; } throw Object.assign(new Error('Unrecoverable lock'), {code:'CONFLICT'}); }}));
mock.module('server-only', () => ({}));
mock.module('../src/lib/encryption', () => ({ decryptSecret: () => 'fixture' }));
mock.module('../../meu/schedulerService/src/config/config', () => ({ exchangeMap: { DELTA: class { id = 'delta'; async loadMarkets() {} async fetchLeverage() {return {marginMode:'isolated',longLeverage:2,shortLeverage:2};} market() { return { symbol: 'XRP/USD:USD', active: true, contract: true, swap: true, linear: true, quote: 'USD', settle: 'USD', contractSize: 1, info: { maintenance_margin: '0.5' } }; } } }, configureCryptoExchange: () => {} }));
mock.module('../../meu/schedulerService/src/brokers/delta/deltaStart', () => ({ prepareDeltaStrategyAccount: async (_exchange: unknown, _symbol: string, leverage: number, options: { beforeWrite: () => Promise<void>; allowAccountModeChange: boolean }) => { prepareCalls++; allowAccountModeChange = options.allowAccountModeChange; expect(leverage).toBe(2); await options.beforeWrite(); if (settingsFailure) throw new Error('Sensitive broker response'); return { marginMode: 'isolated', leverage }; } }));
mock.module('../src/features/exchange/server/execution-account', () => ({ executionConnection: async () => ({}), registerExecutionAccount: async () => ({ accountKey: 'delta:fixture' }), linkedExchangeIds: async () => [agent.exchangeId, 'c'.repeat(24)] }));
mock.module('../src/lib/db', () => ({ default: {
  exchange: { findFirst: async () => ({ name: 'DELTA', sandbox: false, apiKey: 'fixture', secret: 'fixture' }) },
  agent: {
    count: async () => 0,
    findMany: async ({where}: {where:{exchangeId:{in:string[]}}}) => otherSymbols.length && (!aliasOnly || where.exchangeId.in.includes('c'.repeat(24))) ? [{ market: { symbols: otherSymbols } }] : [],
    findFirst: async () => paused ? { id: agent.id } : null,
    update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => { expect(where.status).toBe('PAUSED'); expect(where.updatedAt).toEqual(updatedAt); if (failCas) throw new Error('CAS conflict'); activationCalls++; return { ...agent, ...data, updatedAt }; },
    updateMany: async () => { rollbackCalls++; return { count: 1 }; },
  },
  $runCommandRaw: async (command: Record<string, unknown>) => { if (command.find) return {ok:1,cursor:{id:0,firstBatch:(command.filter as {_id:string})?._id===`exchange:${agent.exchangeId}` && lockBusy ? [{_id:`exchange:${agent.exchangeId}`,executionId:`${foreignLock ? 'c'.repeat(24) : agent.id}-123`}] : recoveryLockBusy ? [{_id:`recovery:${agent.id}`}]:[]}}; if (command.update) return { ok: 1, n: 1 }; if (command.insert) return (lockBusy || (accountLockBusy && (command.documents as {_id:string}[])[0]?._id.startsWith('account:'))) ? { ok: 1, n: 0, writeErrors: [{ code: 11000 }] } : { ok: 1, n: 1 }; deleteCalls++; return releaseFailure ? { ok: 1, n: 0 } : { ok: 1, n: (command.deletes as unknown[]).length }; },
} }));
const { startDeltaAgent } = await import('../src/features/agents/server/start-delta-agent');
function reset() { foreignLock = false; recoveryLockBusy = false; recoverySucceeds = false; recoverCalls = 0; aliasOnly = accountLockBusy = false; otherSymbols = []; allowAccountModeChange = undefined; paused = true; settingsFailure = lockBusy = failCas = releaseFailure = false; prepareCalls = activationCalls = deleteCalls = rollbackCalls = 0; }
test('verified settings precede activation, and the owned start lock is released', async () => {
  reset(); const result = await startDeltaAgent(agent as never, 'owner');
  expect(result.status).toBe('RUNNING'); expect(prepareCalls).toBe(1); expect(activationCalls).toBe(1); expect(deleteCalls).toBe(1);
});
test('Mongo writeErrors on lock collision never reach account preparation', async () => {
  reset(); lockBusy = true;
  await expect(startDeltaAgent(agent as never, 'owner')).rejects.toMatchObject({ code: 'CONFLICT' });
  expect(prepareCalls).toBe(0); expect(activationCalls).toBe(0); expect(deleteCalls).toBe(0);
});
test('an unverified mutation retains its lock and never activates', async () => {
  reset(); settingsFailure = true;
  await expect(startDeltaAgent(agent as never, 'owner')).rejects.toThrow('lock is retained');
  expect(activationCalls).toBe(0); expect(deleteCalls).toBe(0);
});
test('a pause/state change prevents preparation and activation', async () => {
  reset(); paused = false;
  await expect(startDeltaAgent(agent as never, 'owner')).rejects.toMatchObject({ code: 'CONFLICT' });
  expect(prepareCalls).toBe(0); expect(activationCalls).toBe(0); expect(deleteCalls).toBe(1);
});
test('losing the final activation CAS releases a verified lock without activating', async () => {
  reset(); failCas = true;
  await expect(startDeltaAgent(agent as never, 'owner')).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  expect(activationCalls).toBe(0); expect(deleteCalls).toBe(1);
});
test('failed lock release rolls back activation', async () => {
  reset(); releaseFailure = true;
  await expect(startDeltaAgent(agent as never, 'owner')).rejects.toMatchObject({ code: 'CONFLICT' });
  expect(rollbackCalls).toBe(1);
});

test('a different ticker may start without account-wide mode changes', async () => {
  reset(); otherSymbols = ['ETH/USD:USD'];
  const result = await startDeltaAgent(agent as never, 'owner');
  expect(result.status).toBe('RUNNING'); expect(allowAccountModeChange).toBe(false);
});
test('the same ticker remains blocked across product and unified symbol formats', async () => {
  reset(); otherSymbols = ['XRP/USD:USD'];
  await expect(startDeltaAgent(agent as never, 'owner')).rejects.toThrow('other live agent covering this symbol');
  expect(prepareCalls).toBe(0); expect(activationCalls).toBe(0); expect(deleteCalls).toBe(1);
});

test('an overlapping live agent on a duplicate account connection is blocked before setting changes',async()=>{
  reset();aliasOnly=true;otherSymbols=['XRP/USD:USD'];
  await expect(startDeltaAgent(agent as never,'owner')).rejects.toThrow('other live agent');
  expect(prepareCalls).toBe(0);expect(activationCalls).toBe(0);expect(deleteCalls).toBe(1);
});
test('the physical account lock prevents Start across a second saved connection',async()=>{
  reset();accountLockBusy=true;
  await expect(startDeltaAgent(agent as never,'owner')).rejects.toMatchObject({code:'CONFLICT'});
  expect(prepareCalls).toBe(0);expect(activationCalls).toBe(0);expect(deleteCalls).toBe(1);
});

test('Resume recovers a missed-candle lock before preflight and schedules a fresh run', async () => {
 reset(); lockBusy=true; recoverySucceeds=true;
 const result=await startDeltaAgent(agent as never,'owner');
 expect(recoverCalls).toBe(1);expect(prepareCalls).toBe(1);expect(result.status).toBe('RUNNING');expect(result.nextRunAt).toBeNull();
});

test('an interrupted recovery lock also blocks a fresh Start', async () => {
 reset(); recoveryLockBusy=true;
 await expect(startDeltaAgent(agent as never,'owner')).rejects.toThrow('recovery is still running');
 expect(prepareCalls).toBe(0);expect(activationCalls).toBe(0);expect(deleteCalls).toBe(1);
});

test('a new agent never attempts recovery of another agent’s retained exchange lock', async () => {
 reset();lockBusy=true;foreignLock=true;
 await expect(startDeltaAgent(agent as never,'owner')).rejects.toThrow('Another agent');
 expect(recoverCalls).toBe(0);expect(prepareCalls).toBe(0);expect(activationCalls).toBe(0);
});

test('native-stop LLM start prepares saved isolated leverage without algorithm configuration',async()=>{
  reset();
  const llm={...agent,strategy:'LLM_TRADING',executionMode:null,strategyConfig:{fastPeriod:12,slowPeriod:26,sizing:{version:1,mode:'STOP_LOSS',leverage:2,maxMarginPct:100,maxExposureMultiple:2,feeBps:10,slippageBps:5}}};
  const result=await startDeltaAgent(llm as never,'owner');
  expect(result.status).toBe('RUNNING');expect(prepareCalls).toBe(1);expect(activationCalls).toBe(1);expect(deleteCalls).toBe(1);
});


test('automatic algorithm preflight preserves verified leverage within the ceiling',async()=>{
 reset();
 const auto={...agent,strategyConfig:{...agent.strategyConfig,simulation:{...agent.strategyConfig.simulation,leverage:5,leverageMode:'AUTO'}}};
 const result=await startDeltaAgent(auto as never,'owner');expect(result.status).toBe('RUNNING');expect(prepareCalls).toBe(1);
});
