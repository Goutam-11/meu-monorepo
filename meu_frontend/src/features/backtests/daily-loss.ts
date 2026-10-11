export function resolveDailyLossLimitPct(auto: boolean, riskPerTradePct: number, customPct: number): number {
  return auto ? Math.min(100, riskPerTradePct * 3) : customPct;
}
