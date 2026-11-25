// Field paths shared by the frontend router, the scheduler/worker and the
// notification service. The Prisma schema remains the model of record; this
// file names the fields the raw-driver services depend on.
export const AGENT_FIELDS = {
  risk: "risk",
  riskPerTradePct: "risk.maxRiskPerTradePct",
  riskDailyLossPct: "risk.maxDailyLossPct",
  riskOpenPositions: "risk.maxOpenPositions",
  riskTradesPerDay: "risk.maxTradesPerDay",
  riskPositionsOpenedPerDay: "risk.maxPositionsOpenedPerDay",
  capitalAllocated: "capital.allocated",
  capitalCurrency: "capital.currency",
  marketSymbols: "market.symbols",
  marketAgentCycles: "market.agentCycles",
  strategyConfig: "strategyConfig",
  simulation: "strategyConfig.simulation",
  contract: "strategyConfig.contract",
  stateId: "strategyConfig.stateId",
} as const;

export const EXECUTION_FIELDS = {
  state: "state",
  agentId: "agentId",
  startedAt: "startedAt",
  finishedAt: "finishedAt",
  reviewReason: "reviewReason",
  outcome: "outcome",
  brokerOperationRequested: "failure.brokerOperationRequested",
} as const;

export const LOCK_FIELDS = {
  executionId: "executionId",
  createdAt: "createdAt",
  kind: "kind",
  state: "state",
} as const;

export const ORDER_INTENT_FIELDS = {
  executionId: "executionId",
  state: "state",
  intent: "intent",
} as const;

export const PAPER_STATE_FIELDS = {
  agentId: "agentId",
  state: "state",
  config: "config",
  contract: "contract",
} as const;

export const NOTIFICATION_FIELDS = {
  deliveryJobId: "deliveryJobId",
  userId: "userId",
  agentId: "agentId",
  exchangeId: "exchangeId",
  code: "code",
} as const;

// The Prisma block each documented Agent path must still expose. A rename in
// schema.prisma without a matching contract update fails the contract test.
export const PRISMA_AGENT_CONTRACT = {
  risk: ["maxRiskPerTradePct", "maxDailyLossPct", "maxOpenPositions", "maxTradesPerDay", "maxPositionsOpenedPerDay"],
  capital: ["allocated", "currency"],
  market: ["symbols", "agentCycles"],
  strategyConfig: [],
} as const;
