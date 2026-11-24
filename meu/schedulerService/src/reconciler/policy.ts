export type Contract = {
  symbol: string;
  contractSize: number;
  minContracts: number;
  maintenanceMarginRate: number;
  settlement: "USD";
};

export function reviewIsSafe(failure: { brokerOperationRequested?: boolean }, intentCount: number): { safe: boolean; reason: string } {
  if (intentCount > 0) return { safe: false, reason: `${intentCount} order intent(s) exist for this execution` };
  if (failure.brokerOperationRequested !== false) return { safe: false, reason: "a broker operation may have been requested" };
  return { safe: true, reason: "no broker operation was requested" };
}

export function staleClaimIsSafe(intentCount: number): boolean {
  return intentCount === 0;
}

export function contractDrift(saved: Contract, live: Contract): string[] {
  const fields: (keyof Contract)[] = ["symbol", "contractSize", "minContracts", "maintenanceMarginRate", "settlement"];
  return fields.filter(field => saved[field] !== live[field]);
}
