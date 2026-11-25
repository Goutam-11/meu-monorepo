// Collection names are part of the cross-process contract. Both the Prisma
// client and the services that use the raw MongoDB driver must agree on these.
export const COLLECTIONS = {
  Agent: "Agent",
  AgentDailyRiskUsage: "AgentDailyRiskUsage",
  AgentExecutions: "AgentExecutions",
  AgentRuns: "AgentRuns",
  BrokerAccountLinks: "BrokerAccountLinks",
  BrokerAccounts: "BrokerAccounts",
  Credentials: "Credentials",
  CryptoAccountDailyEquity: "CryptoAccountDailyEquity",
  CryptoOwnershipPeriods: "CryptoOwnershipPeriods",
  CryptoPositionOwners: "CryptoPositionOwners",
  CryptoStrategyState: "CryptoStrategyState",
  Exchange: "Exchange",
  ExecutionLocks: "ExecutionLocks",
  ManagedCryptoOrders: "ManagedCryptoOrders",
  Notification: "Notification",
  OrderIntents: "OrderIntents",
  PaperTradingState: "PaperTradingState",
  PushSubscription: "PushSubscription",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
