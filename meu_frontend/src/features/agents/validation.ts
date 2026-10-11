import { z } from "zod";
import { AgentStrategy, AgentType } from "@/generated/prisma/enums";

export const analysisTimeframeSchema = z.enum(['1m','5m','15m','1h','4h']);

export const sizingPolicySchema = z.object({
  leverageMode: z.enum(['FIXED','AUTO']).optional(),
  autoSizing: z.enum(['TARGET_RISK','MINIMUM_ORDER']).optional(),
  version: z.literal(1), mode: z.enum(['NOTIONAL', 'STOP_LOSS']),
  leverage: z.number().int().min(1).max(20), maxMarginPct: z.number().positive().max(100),
  maxExposureMultiple: z.number().positive().max(20),
  feeBps: z.number().min(0).max(100), slippageBps: z.number().min(0).max(100),
}).superRefine((p, ctx) => {
  if(p.autoSizing!==undefined && p.leverageMode!=='AUTO') ctx.addIssue({code:'custom',path:['autoSizing'],message:'Choose automatic leverage to use an automatic sizing objective.'});
  if ((p.mode === 'NOTIONAL' && p.leverageMode === 'AUTO') || p.maxExposureMultiple > p.leverage || (p.mode === 'NOTIONAL' && (p.leverage !== 1 || p.maxExposureMultiple > 1)))
    ctx.addIssue({code:'custom', path:['maxExposureMultiple'], message:'Exposure cannot exceed leverage; notional sizing supports at most 1×.'});
});

const strategyConfigSchema = z.object({
  fastPeriod: z.number().int().min(1).max(500),
  slowPeriod: z.number().int().min(2).max(500),
  sizing: sizingPolicySchema.optional(),
  analysisTimeframe: analysisTimeframeSchema.optional(),
}).refine((config) => config.fastPeriod < config.slowPeriod, {
  message: "Fast period must be less than slow period",
  path: ["fastPeriod"],
});

function addStrategyIssues(
  config: { strategy: AgentStrategy; type: AgentType; llmModel: string; credentialId: string; strategyConfig: { fastPeriod: number; slowPeriod: number } },
  ctx: z.RefinementCtx,
) {
  if (config.strategy !== AgentStrategy.LLM_TRADING && config.type !== AgentType.STOCKS) {
    ctx.addIssue({ code: "custom", path: ["type"], message: "Algorithmic and hybrid strategies are currently available for stocks only" });
  }
  if (config.strategy !== AgentStrategy.ALGO_TRADING) {
    if (config.llmModel.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["llmModel"], message: "Choose an LLM model for this strategy" });
    }
    if (config.credentialId.trim().length === 0) {
      ctx.addIssue({ code: "custom", path: ["credentialId"], message: "Choose an AI credential for this strategy" });
    }
  }
}

const riskSchema = z.object({
  maxRiskPerTradePct: z.number().positive().max(100),
  maxDailyLossPct: z.number().positive().max(100),
  maxOpenPositions: z.number().int().positive().max(100),
  maxTradesPerDay: z.number().int().positive().max(1000),
  maxPositionsOpenedPerDay: z.number().int().positive().max(1000),
});

const strategyConfigFields = {
  fastPeriod: z.number().int().min(1).max(500),
  slowPeriod: z.number().int().min(2).max(500),
  sizing: sizingPolicySchema.optional(),
  analysisTimeframe: analysisTimeframeSchema.optional(),
};

export const agentFormSchema = z.object({
  name: z.string().trim().min(2, "Use at least two characters for the agent name").max(100),
  strategy: z.enum(AgentStrategy),
  type: z.enum(AgentType),
  llmModel: z.string(),
  credentialId: z.string(),
  temperature: z.number().min(0).max(1).optional(),
  exchangeId: z.string().min(1, "Exchange is required"),
  market: z.object({
    symbols: z.array(z.object({ value: z.string().trim().min(2, "Choose a trading ticker").max(100) })).min(1),
    agentCycles: z.string().regex(/^[1-9]\d*[smhd]$/i, "Use a positive interval such as 5m or 1h"),
  }),
  risk: riskSchema,
  strategyConfig: strategyConfigSchema,
  capital: z.object({
    allocated: z.number().positive("Capital allocated is required"),
    currency: z.string().trim().min(2, "Currency is required").max(100).toUpperCase(),
  }),
}).superRefine((config, ctx) => {
  addStrategyIssues(config, ctx);
  const symbols = config.market.symbols.map(symbol => symbol.value.toUpperCase());
  if (new Set(symbols).size !== symbols.length)
    ctx.addIssue({code:'custom', path:['market','symbols'], message:'Choose each ticker once; remove duplicate tickers.'});
  if (config.strategyConfig.sizing?.mode === 'STOP_LOSS' && (config.type !== AgentType.CRYPTO || config.market.symbols.length !== 1))
    ctx.addIssue({code:'custom', path:['market','symbols'], message:'Native-stop sizing requires one Delta or Binance perpetual ticker. Remove extra tickers or choose full order value sizing.'});
});

export const agentConfigSchema = z.object({
  name: z.string().trim().min(2).max(100),
  llmModel: z.string(),
  credentialId: z.string(),
  exchangeId: z.string().min(1),
  type: z.enum(AgentType),
  strategy: z.enum(AgentStrategy),
  temperature: z.number().min(0).max(1).default(0.7),
  market: z.object({ symbols: z.array(z.string().trim().min(2).max(100)).min(1), agentCycles: z.number().int().positive().max(31536000) }),
  risk: riskSchema,
  capital: z.object({ allocated: z.number().positive(), currency: z.string().trim().min(2).max(100).toUpperCase() }),
  strategyConfig: z.object(strategyConfigFields),
}).superRefine((config, ctx) => {
  if (config.strategyConfig.fastPeriod >= config.strategyConfig.slowPeriod) {
    ctx.addIssue({ code: "custom", path: ["strategyConfig", "fastPeriod"], message: "Fast period must be less than slow period" });
  }
  addStrategyIssues(config, ctx);
  if (new Set(config.market.symbols.map(symbol => symbol.toUpperCase())).size !== config.market.symbols.length)
    ctx.addIssue({code:'custom', path:['market','symbols'], message:'Choose each ticker once; remove duplicate tickers.'});
  if (config.strategyConfig.sizing?.mode === 'STOP_LOSS' && (config.type !== AgentType.CRYPTO || config.market.symbols.length !== 1))
    ctx.addIssue({code:'custom', path:['market','symbols'], message:'Native-stop sizing requires one Delta or Binance perpetual ticker.'});
});

export async function requireOwnedReferences(
  userId: string,
  exchangeId: string,
  credentialId: string | null,
  lookup: (userId: string, exchangeId: string, credentialId: string | null) => Promise<{ exchange: boolean; credential: boolean }>,
) {
  const owned = await lookup(userId, exchangeId, credentialId);
  return owned.exchange && (credentialId === null || owned.credential);
}
