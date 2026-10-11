import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { agentConfigSchema, agentFormSchema, requireOwnedReferences } from "../src/features/agents/validation";
import { AgentStrategy, AgentType } from "../src/generated/prisma/enums";

const validConfig = {
  name: "Default Agent",
  llmModel: "gpt-4o-mini",
  credentialId: "credential-1",
  exchangeId: "exchange-1",
  type: AgentType.CRYPTO,
  strategy: AgentStrategy.LLM_TRADING,
  market: { symbols: ["BTC/USDT"], agentCycles: 3600 },
  risk: { maxRiskPerTradePct: 1, maxDailyLossPct: 5, maxOpenPositions: 3, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 },
  capital: { allocated: 100, currency: "USDT" },
  strategyConfig: { fastPeriod: 12, slowPeriod: 26 },
};

describe("agent request validation", () => {
  it("accepts the UI defaults and supplies the configured temperature default", () => {
    const parsed = agentConfigSchema.parse(validConfig);
    assert.equal(parsed.temperature, 0.7);
    assert.equal(agentFormSchema.safeParse({
      name: "Default Agent",
      strategy: AgentStrategy.LLM_TRADING,
      type: AgentType.CRYPTO,
      llmModel: "gpt-4o-mini",
      credentialId: "credential-1",
      temperature: 0.7,
      exchangeId: "exchange-1",
      market: { symbols: [{ value: "BTC/USDT" }], agentCycles: "1h" },
      risk: { maxRiskPerTradePct: 1, maxDailyLossPct: 5, maxOpenPositions: 3, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 },
      capital: { allocated: 100, currency: "USDT" },
      strategyConfig: { fastPeriod: 12, slowPeriod: 26 },
    }).success, true);
  });

  it("rejects invalid strategy parameters and non-integer runtime counts", () => {
    assert.equal(agentConfigSchema.safeParse({ ...validConfig, market: { ...validConfig.market, agentCycles: 1.5 } }).success, false);
    assert.equal(agentConfigSchema.safeParse({ ...validConfig, risk: { ...validConfig.risk, maxOpenPositions: 1.5 } }).success, false);
    assert.equal(agentConfigSchema.safeParse({ ...validConfig, risk: { ...validConfig.risk, maxTradesPerDay: 1.5 } }).success, false);
    assert.equal(agentConfigSchema.safeParse({ ...validConfig, risk: { ...validConfig.risk, maxPositionsOpenedPerDay: 0 } }).success, false);
    assert.equal(agentConfigSchema.safeParse({ ...validConfig, strategyConfig: { fastPeriod: 26, slowPeriod: 12 } }).success, false);
    assert.equal(agentConfigSchema.safeParse({ ...validConfig, strategyConfig: { fastPeriod: 0, slowPeriod: 26 } }).success, false);
  });

  it("allows stock algorithms without LLM credentials and requires credentials for hybrid", () => {
    const algoConfig = {
      ...validConfig,
      strategy: AgentStrategy.ALGO_TRADING,
      type: AgentType.STOCKS,
      llmModel: "",
      credentialId: "",
    };
    assert.equal(agentConfigSchema.safeParse(algoConfig).success, true);
    assert.equal(agentConfigSchema.safeParse({ ...algoConfig, type: AgentType.CRYPTO }).success, false);
    assert.equal(agentConfigSchema.safeParse({ ...algoConfig, strategy: AgentStrategy.HYBRID }).success, false);
    assert.equal(agentConfigSchema.safeParse({ ...validConfig, strategy: AgentStrategy.HYBRID, type: AgentType.STOCKS }).success, true);
    assert.equal(agentFormSchema.safeParse({
      name: "Rule Bot",
      strategy: AgentStrategy.ALGO_TRADING,
      type: AgentType.STOCKS,
      llmModel: "",
      credentialId: "",
      temperature: 0.7,
      exchangeId: "exchange-1",
      market: { symbols: [{ value: "RELIANCE" }], agentCycles: "1h" },
      risk: validConfig.risk,
      capital: validConfig.capital,
      strategyConfig: validConfig.strategyConfig,
    }).success, true);
  });

  it("requires both exchange and credential references to belong to the agent owner", async () => {
    const lookup = async (userId: string, exchangeId: string, credentialId: string | null) => ({
      exchange: userId === "owner" && exchangeId === "exchange-1",
      credential: userId === "owner" && credentialId === "credential-1",
    });
    assert.equal(await requireOwnedReferences("owner", "exchange-1", "credential-1", lookup), true);
    assert.equal(await requireOwnedReferences("attacker", "exchange-1", "credential-1", lookup), false);
    assert.equal(await requireOwnedReferences("owner", "foreign-exchange", "credential-1", lookup), false);
    assert.equal(await requireOwnedReferences("owner", "exchange-1", "foreign-credential", lookup), false);
    assert.equal(await requireOwnedReferences("owner", "exchange-1", null, lookup), true);
  });

  it('trims names and symbols and rejects duplicate tickers and blank names', () => {
    const parsed = agentConfigSchema.parse({...validConfig, name:'  SOL agent  ', market:{...validConfig.market,symbols:['  SOLUSD  ']}});
    assert.equal(parsed.name, 'SOL agent');
    assert.deepEqual(parsed.market.symbols, ['SOLUSD']);
    assert.equal(agentConfigSchema.safeParse({...validConfig,name:'   '}).success,false);
    assert.equal(agentConfigSchema.safeParse({...validConfig,market:{...validConfig.market,symbols:['SOLUSD',' solusd ']}}).success,false);
    assert.equal(agentFormSchema.safeParse({...validConfig,market:{symbols:[{value:'SOLUSD'},{value:' solusd '}],agentCycles:'1h'}}).success,false);
  });
});

describe('versioned sizing configuration',()=>{
  const sizing={version:1,mode:'STOP_LOSS',leverage:2,maxMarginPct:100,maxExposureMultiple:2,feeBps:10,slippageBps:5};
  it('preserves old configuration absence and accepts explicit native-stop policy',()=>{
    assert.equal(agentConfigSchema.parse(validConfig).strategyConfig.sizing,undefined);
    assert.deepEqual(agentConfigSchema.parse({...validConfig,strategyConfig:{...validConfig.strategyConfig,sizing}}).strategyConfig.sizing,sizing);
  });
  it('rejects unsupported shape, excess leverage credit and multi-ticker stop sizing',()=>{
    for (const change of [{version:2},{maxMarginPct:101},{maxExposureMultiple:3},{mode:'NOTIONAL'}])
      assert.equal(agentConfigSchema.safeParse({...validConfig,strategyConfig:{...validConfig.strategyConfig,sizing:{...sizing,...change}}}).success,false);
    assert.equal(agentConfigSchema.safeParse({...validConfig,market:{...validConfig.market,symbols:['BTCUSD','ETHUSD']},strategyConfig:{...validConfig.strategyConfig,sizing}}).success,false);
    assert.equal(agentConfigSchema.safeParse({...validConfig,type:AgentType.STOCKS,strategyConfig:{...validConfig.strategyConfig,sizing}}).success,false);
  });
});

describe('explicit analysis and automatic sizing policies', () => {
  it('preserves legacy absence and validates a saved analysis interval independently of cadence', () => {
    assert.equal(agentConfigSchema.parse(validConfig).strategyConfig.analysisTimeframe, undefined);
    const parsed = agentConfigSchema.parse({...validConfig, strategyConfig:{...validConfig.strategyConfig,analysisTimeframe:'15m'}});
    assert.equal(parsed.strategyConfig.analysisTimeframe,'15m');
    assert.equal(parsed.market.agentCycles,3600);
    assert.equal(agentConfigSchema.safeParse({...validConfig,strategyConfig:{...validConfig.strategyConfig,analysisTimeframe:'2seconds'}}).success,false);
  });
  it('retains the selected target objective and rejects it with fixed leverage', () => {
    const sizing={version:1,mode:'STOP_LOSS',leverage:3,leverageMode:'AUTO',autoSizing:'TARGET_RISK',maxMarginPct:25,maxExposureMultiple:2,feeBps:10,slippageBps:5};
    const config={...validConfig,strategyConfig:{...validConfig.strategyConfig,sizing}};
    assert.equal(agentConfigSchema.parse(config).strategyConfig.sizing?.autoSizing,'TARGET_RISK');
    assert.equal(agentConfigSchema.safeParse({...config,strategyConfig:{...config.strategyConfig,sizing:{...sizing,leverageMode:'FIXED'}}}).success,false);
    assert.equal(agentConfigSchema.parse({...config,strategyConfig:{...config.strategyConfig,sizing:{...sizing,autoSizing:undefined}}}).strategyConfig.sizing?.autoSizing,undefined);
  });
});
