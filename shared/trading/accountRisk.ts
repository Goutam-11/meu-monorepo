export type AccountRiskLimits = { maxOpenPositions: number; maxMarginPct: number; maxDailyLossPct: number; maxNotionalMultiple: number };
// Initial account caps, shown and editable in the exchange execution panel.
export const defaultAccountRisk: AccountRiskLimits = { maxOpenPositions: 3, maxMarginPct: 50, maxDailyLossPct: 1, maxNotionalMultiple: 3 };
