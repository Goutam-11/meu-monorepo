export type CryptoRiskPolicy = {
  maxRiskPerTradePct: number;
  maxDailyLossPct: number;
  maxOpenPositions: number;
  maxTradesPerDay: number;
  maxPositionsOpenedPerDay: number;
};

export type CryptoCapitalPolicy = { allocated: number; currency: string };

export function projectCryptoPolicy(input: {
  risk: CryptoRiskPolicy;
  capital: CryptoCapitalPolicy;
  simulation: Record<string, unknown>;
}): { risk: CryptoRiskPolicy; capital: CryptoCapitalPolicy; simulation: Record<string, unknown> } {
  return {
    risk: { ...input.risk, maxOpenPositions: 1 },
    capital: { allocated: input.capital.allocated, currency: 'USD' },
    simulation: {
      ...input.simulation,
      initialCapital: input.capital.allocated,
      riskPerTradePct: input.risk.maxRiskPerTradePct,
      maxDailyLossPct: input.risk.maxDailyLossPct,
      maxTradesPerDay: input.risk.maxTradesPerDay,
      maxPositionsOpenedPerDay: input.risk.maxPositionsOpenedPerDay,
    },
  };
}
