export type AgentRuntime = {
  id: string;
  userId: string;
  nextRunAt: number;
  type: "CRYPTO" | "STOCK";
  llmModel?: string;
  strategy: "ALGO_TRADING" | "LLM_TRADING" | "HYBRID";
  exchangeId: string;
  credentialId?: string;
  market: {
    symbols: string[];
    agentCycles: number;
  };
  risk: {
    maxRiskPerTradePct: number;
    maxDailyLossPct: number;
    maxOpenPositions: number;
  }
  capital: {
    allocated: number;
    currency: string;
  }
  status: "PAUSED" | "RUNNING",
}
