import { sizeEntry, validateSizingPolicy, type SizingPolicy } from "../../../../shared/trading/sizing";
import type { MarketInterface, Order, Position } from "ccxt";
import type { CryptoRiskSnapshot } from "../brokers/crypto/cryptoRisk";
export type TradingPolicy = {
  symbols: string[];
  sizing?: SizingPolicy;
  risk: {
    maxRiskPerTradePct: number;
    maxDailyLossPct: number;
    maxOpenPositions: number;
    maxTradesPerDay: number;
    maxPositionsOpenedPerDay: number;
  };
  capital: { allocated: number; currency: string };
  // Explicitly configured Delta algorithms only; legacy agents retain notional guards.
  futures?: {
    leverage: number;
    maxMarginPct: number;
    maxNotional: number;
    maintenanceMarginRate: number;
    feeBps: number;
    slippageBps: number;
  };
};
export type RiskSnapshot = {
  dailyPnl: number;
  exposure: number;
  openPositions: number;
  availableFunds: number;
};

export class OrderRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderRejectedError";
  }
}

export class CryptoProtectionError extends Error {
  readonly code='CRYPTO_PROTECTION_UNVERIFIED';
  constructor(readonly symbol:string){super(`Native protection for ${symbol} could not be verified after an entry fill. A bounded reduce-only emergency exit was attempted where possible. Review positions and conditional orders before resuming; do not repeat the entry.`);this.name='CryptoProtectionError';}
}

export class CryptoSettingsUncertainError extends Error {
  readonly code='CRYPTO_SETTINGS_UNCERTAIN';
  constructor(readonly symbol:string,readonly leverage:number){super(`Broker settings for ${symbol} could not be verified at ${leverage}×. No entry order was sent.`);this.name='CryptoSettingsUncertainError';}
}

export class DeltaLeverageUncertainError extends Error {
  readonly code='DELTA_LEVERAGE_UNCERTAIN';
  constructor(readonly symbol:string, readonly leverage:number) {
    super(`Delta could not verify the automatic leverage update for ${symbol} to ${leverage}×. No entry order was sent.`);
    this.name='DeltaLeverageUncertainError';
  }
}

export function formatTradingPolicy(policy: TradingPolicy) {
  const budget = (percentage: number) => `${Number((policy.capital.allocated * percentage / 100).toFixed(8))} ${policy.capital.currency}`;
  return [
    `Allowed tickers: ${policy.symbols.join(', ')}. Do not trade other tickers.`,
    `Allocated capital: ${policy.capital.allocated} ${policy.capital.currency}`,
    'The account balance is not your allocation. Unallocated funds and other agents\' budgets are not available to this agent.',
    policy.futures || policy.sizing?.mode === 'STOP_LOSS'
      ? `Maximum estimated loss at the native stop per entry: ${policy.risk.maxRiskPerTradePct}% of allocation, including buffered costs. This is NOT a notional limit.`
      : `Maximum full entry notional (including buffered costs): ${policy.risk.maxRiskPerTradePct}% of allocated capital`,
    `Per-entry ${policy.futures || policy.sizing?.mode === 'STOP_LOSS' ? 'estimated stop-loss' : 'full-notional'} budget: ${budget(policy.risk.maxRiskPerTradePct)}.`,
    ...(policy.sizing ? [
      `Sizing mode: ${policy.sizing.mode}; margin ceiling ${policy.sizing.maxMarginPct}% of allocation; exposure ceiling ${policy.sizing.maxExposureMultiple}× allocation; ${policy.sizing.mode === 'STOP_LOSS' ? `${policy.sizing.leverageMode === 'AUTO' ? 'automatic leverage ceiling' : 'saved isolated leverage'} ${policy.sizing.leverage}×` : 'no leverage credit (broker leverage is not changed)' }.`,
      `Configured margin budget: ${budget(policy.sizing.maxMarginPct)}; configured gross exposure budget: ${budget(policy.sizing.maxExposureMultiple * 100)} across positions and pending entries. These are separate ceilings, not a target order size.`,
      ...(policy.sizing.leverageMode === 'AUTO' ? [`Automatic sizing objective: ${policy.sizing.autoSizing === 'TARGET_RISK' ? 'largest quantity within stop-risk, exposure, broker and available-margin bounds; use the lowest leverage funding that quantity' : 'minimum viable order: use the first leverage permitting a tradable quantity (legacy behavior)'}.`] : []),
      ...(policy.sizing.mode === 'STOP_LOSS' && policy.sizing.leverageMode === 'AUTO' ? [
        `You may use guarded setLeverage on a supported flat ticker to prepare an entry within the ${policy.sizing.leverage}× ceiling. This ceiling is not the current broker leverage. Fetch current leverage; do not interpret a current 1× setting as a fixed user restriction or a reason by itself to HOLD.`,
        'Higher leverage reduces collateral for the same notional; it does not improve the signal, reduce notional-based fees or increase the stop-loss/exposure budgets. Evaluate the setup and stop first, prepare leverage if needed, then recalculate sizing before entry.',
      ] : []),
      `Fee buffer: ${policy.sizing.feeBps} bps per side; slippage buffer: ${policy.sizing.slippageBps} bps per side.`,
      'Use the server sizing tool before an entry. Omit entry amount for deterministic crypto sizing. Do not interpret the loss percentage as order value in native-stop mode.',
      'Only the guarded setLeverage tool may prepare automatic leverage within the saved ceiling. Never tighten a stop merely to fit a larger order or use unallocated account funds. Smaller broker/account caps still apply.',
    ] : []),
    `Maximum daily loss: ${policy.risk.maxDailyLossPct}% of allocated capital`,
    `Configured daily loss budget: ${budget(policy.risk.maxDailyLossPct)}. This is a ceiling, not the remaining daily allowance.`,
    `Maximum simultaneous positions: ${policy.risk.maxOpenPositions}`,
    `Maximum entry orders per market day: ${policy.risk.maxTradesPerDay}`,
    `Maximum flat-to-open positions per market day: ${policy.risk.maxPositionsOpenedPerDay}`,
    "The server enforces these limits. Entry exposure may exceed allocation only within an explicitly configured protected sizing policy. Never exceed the server-calculated quantity.",
    'These are saved configuration limits, not current account headroom. Shared-account ceilings, existing positions, pending orders, losses, broker minimums and buffered costs can reduce the allowed size. Use fresh broker reads and the server sizing tool; do not infer available funds or remaining daily counts from these ceilings.',
  ].join("\n");
}

export function assertOrderAllowed(policy: TradingPolicy, symbol: string, notional: number, snapshot: RiskSnapshot) {
  if (policy.sizing) {
    try { validateSizingPolicy(policy.sizing); } catch (error) { throw new OrderRejectedError((error as Error).message); }
    if (policy.sizing.mode !== 'NOTIONAL') throw new OrderRejectedError('Native-stop sizing requires a broker adapter with verified protection; the unprotected order guard cannot grant stop-risk credit');
  }
  const { allocated } = policy.capital;
  const { maxRiskPerTradePct, maxDailyLossPct, maxOpenPositions } = policy.risk;
  if (!policy.symbols.includes(symbol)) throw new OrderRejectedError("Symbol is outside this agent's market scope");
  if (![allocated, notional, maxRiskPerTradePct, maxDailyLossPct].every(v => Number.isFinite(v) && v > 0) ||
      maxRiskPerTradePct > 100 || maxDailyLossPct > 100 || !Number.isSafeInteger(maxOpenPositions) || maxOpenPositions < 1 ||
      !Number.isSafeInteger(policy.risk.maxTradesPerDay) || policy.risk.maxTradesPerDay < 1 ||
      !Number.isSafeInteger(policy.risk.maxPositionsOpenedPerDay) || policy.risk.maxPositionsOpenedPerDay < 1) {
    throw new OrderRejectedError("Invalid trading constraints");
  }
  if (![snapshot.dailyPnl, snapshot.exposure, snapshot.openPositions, snapshot.availableFunds].every(Number.isFinite) ||
      snapshot.exposure < 0 || snapshot.availableFunds < 0 || !Number.isSafeInteger(snapshot.openPositions) || snapshot.openPositions < 0) {
    throw new OrderRejectedError("An authoritative account snapshot is required");
  }
  // Conservative full-notional risk bound; no reliance on an LLM stop-loss promise.
  if (notional > allocated * maxRiskPerTradePct / 100) throw new OrderRejectedError("Per-trade risk limit exceeded");
  if (Math.max(0, -snapshot.dailyPnl) + notional > allocated * maxDailyLossPct / 100) throw new OrderRejectedError("Daily loss budget exceeded");
  if (policy.sizing && snapshot.exposure + notional > allocated * Math.min(policy.sizing.maxMarginPct / 100, policy.sizing.maxExposureMultiple))
    throw new OrderRejectedError('Sizing policy margin or exposure ceiling exceeded');
  if (snapshot.exposure + notional > allocated) throw new OrderRejectedError("Allocated capital exceeded");
  if (snapshot.openPositions >= maxOpenPositions) throw new OrderRejectedError("Maximum open positions reached");
  if (notional > snapshot.availableFunds) throw new OrderRejectedError("Insufficient available funds");
}

/** Sizes an unleveraged long entry from the configured risk budget and live account snapshot. */
export function sizeLongPosition(input: {
  allocated: number;
  maxRiskPerTradePct: number;
  exposure: number;
  availableFunds: number;
  remainingDailyLoss: number;
  price: number;
  unitStep?: number;
  sizing?: SizingPolicy;
}) {
  const { allocated, maxRiskPerTradePct, exposure, availableFunds, remainingDailyLoss, price, unitStep = 1 } = input;
  if (![allocated, maxRiskPerTradePct, exposure, availableFunds, remainingDailyLoss, price, unitStep].every(Number.isFinite) ||
      allocated <= 0 || maxRiskPerTradePct <= 0 || maxRiskPerTradePct > 100 || exposure < 0 ||
      availableFunds < 0 || remainingDailyLoss < 0 || price <= 0 || unitStep <= 0) {
    throw new OrderRejectedError("Position sizing inputs are invalid");
  }
  if (input.sizing) {
    try {
      const p = validateSizingPolicy(input.sizing);
      if (p.mode !== 'NOTIONAL') throw new Error('This stock adapter does not support verified native-stop sizing');
      const costs = 1 + 2 * (p.feeBps + p.slippageBps) / 10000;
      const result = sizeEntry({
        riskBudget: Math.min(allocated * maxRiskPerTradePct / 100, remainingDailyLoss),
        marginBudget: Math.min(allocated * p.maxMarginPct / 100 - exposure, availableFunds),
        exposureBudget: allocated * p.maxExposureMultiple - exposure,
        unitRisk: price * costs, unitMargin: price * costs, unitNotional: price * costs,
        minAmount: 1, roundDown: n => Math.floor(n / unitStep) * unitStep,
      });
      return {quantity:result.amount, notional:result.notional, budget:result.maxAmount * price * costs};
    } catch (error) { throw new OrderRejectedError((error as Error).message); }
  }
  const budget = Math.max(0, Math.min(
    allocated * maxRiskPerTradePct / 100,
    allocated - exposure,
    availableFunds,
    remainingDailyLoss,
  ));
  const quantity = Math.floor((budget / price) / unitStep) * unitStep;
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new OrderRejectedError("Allocated risk budget is too small for one unit");
  }
  return { quantity, notional: quantity * price, budget };
}

export type DailyEntryReservation = (symbol: string, opensPosition: boolean) => Promise<void>;
export type ExecutionSafety = {
  agentId: string;
  crypto?: {
    scopeSnapshot: (snapshot: CryptoRiskSnapshot, market: MarketInterface) => Promise<CryptoRiskSnapshot>;
    assertOwnsPosition: (symbol: string, position: Position) => Promise<void>;
    recordSubmission: (clientOrderId: string, symbol: string, side: "buy"|"sell", amount: number, reduceOnly: boolean, protection?:{conditional:boolean;closePosition:boolean;triggerPrice:number;protectionType:'STOP_MARKET'|'TAKE_PROFIT_MARKET'}) => Promise<void>;
    recordAccepted: (clientOrderId: string, order: Order) => Promise<void>;
    recordRefused: (clientOrderId: string) => Promise<void>;
  };
  policy: TradingPolicy;
  assertActive: () => Promise<void>;
  reserveDailyEntry: DailyEntryReservation;
  // Records intent durably before side effects; failures leave an ambiguous intent.
  executeOrder: <T>(intent: Record<string, unknown>, execute: () => Promise<T>) => Promise<T>;
};
