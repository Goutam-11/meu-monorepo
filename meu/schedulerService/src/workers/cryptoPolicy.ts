export type CryptoPolicyAgent = {
  market: { symbols: string[] };
  capital: { allocated: number; currency: string };
  risk: {
    maxRiskPerTradePct: number;
    maxDailyLossPct: number;
    maxOpenPositions: number;
    maxTradesPerDay: number;
    maxPositionsOpenedPerDay: number;
  };
};

export type CryptoPolicyConfig = {
  simulation: {
    initialCapital: number;
    riskPerTradePct: number;
    maxDailyLossPct: number;
    maxTradesPerDay: number;
    maxPositionsOpenedPerDay: number;
  };
};

export function cryptoPolicyMismatch(config: CryptoPolicyConfig, agent: CryptoPolicyAgent): string | undefined {
  const mismatches: string[] = [];
  if (agent.market.symbols.length !== 1) mismatches.push(`market.symbols.length=${agent.market.symbols.length} vs expected=1`);
  if (agent.capital.currency !== "USD") mismatches.push(`capital.currency=${agent.capital.currency} vs expected=USD`);
  if (config.simulation.initialCapital !== agent.capital.allocated)
    mismatches.push(`simulation.initialCapital=${config.simulation.initialCapital} vs capital.allocated=${agent.capital.allocated}`);
  if (config.simulation.riskPerTradePct !== agent.risk.maxRiskPerTradePct)
    mismatches.push(`simulation.riskPerTradePct=${config.simulation.riskPerTradePct} vs risk.maxRiskPerTradePct=${agent.risk.maxRiskPerTradePct}`);
  if (config.simulation.maxDailyLossPct !== agent.risk.maxDailyLossPct)
    mismatches.push(`simulation.maxDailyLossPct=${config.simulation.maxDailyLossPct} vs risk.maxDailyLossPct=${agent.risk.maxDailyLossPct}`);
  if (config.simulation.maxTradesPerDay !== agent.risk.maxTradesPerDay)
    mismatches.push(`simulation.maxTradesPerDay=${config.simulation.maxTradesPerDay} vs risk.maxTradesPerDay=${agent.risk.maxTradesPerDay}`);
  if (config.simulation.maxPositionsOpenedPerDay !== agent.risk.maxPositionsOpenedPerDay)
    mismatches.push(`simulation.maxPositionsOpenedPerDay=${config.simulation.maxPositionsOpenedPerDay} vs risk.maxPositionsOpenedPerDay=${agent.risk.maxPositionsOpenedPerDay}`);
  if (agent.risk.maxOpenPositions !== 1)
    mismatches.push(`risk.maxOpenPositions=${agent.risk.maxOpenPositions} vs expected=1`);
  return mismatches.length ? `Saved strategy allocation and agent policy differ: ${mismatches.join("; ")}` : undefined;
}
