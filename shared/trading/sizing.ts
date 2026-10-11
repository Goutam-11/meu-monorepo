import {DEFAULT_FEE_BUFFER_BPS, DEFAULT_SLIPPAGE_BUFFER_BPS} from './executionCosts';
export type AutoSizing = 'TARGET_RISK' | 'MINIMUM_ORDER';
export type AutomaticSizingDiagnostics = {
  autoSizing: AutoSizing; targetAmount: number; fundedAmount: number; targetFunded: boolean; limitingConstraint: string;
};

/** Versioned policies: absence preserves the historical full-notional risk guard. */
export type SizingPolicy = {
  version: 1;
  mode: 'NOTIONAL' | 'STOP_LOSS';
  leverage: number;
  leverageMode?: 'FIXED' | 'AUTO';
  autoSizing?: AutoSizing;
  maxMarginPct: number;
  maxExposureMultiple: number;
  feeBps: number;
  slippageBps: number;
};
export const defaultSizingPolicy: SizingPolicy = {
  version: 1, mode: 'NOTIONAL', leverage: 1, maxMarginPct: 100,
  maxExposureMultiple: 1, feeBps: DEFAULT_FEE_BUFFER_BPS, slippageBps: DEFAULT_SLIPPAGE_BUFFER_BPS,
};
export function validateSizingPolicy(value: unknown): SizingPolicy {
  const p = value as SizingPolicy | null;
  if (!p || p.version !== 1 || !['NOTIONAL', 'STOP_LOSS'].includes(p.mode) ||
      ![p.leverage, p.maxMarginPct, p.maxExposureMultiple, p.feeBps, p.slippageBps].every(Number.isFinite) ||
      (p.leverageMode !== undefined && !['FIXED','AUTO'].includes(p.leverageMode)) ||
      (p.autoSizing !== undefined && (!['TARGET_RISK', 'MINIMUM_ORDER'].includes(p.autoSizing) || p.leverageMode !== 'AUTO')) ||
      (p.mode === 'NOTIONAL' && p.leverageMode === 'AUTO') || !Number.isInteger(p.leverage) || p.leverage < 1 || p.leverage > 20 ||
      p.maxMarginPct <= 0 || p.maxMarginPct > 100 || p.maxExposureMultiple <= 0 || p.maxExposureMultiple > p.leverage ||
      p.feeBps < 0 || p.feeBps > 100 || p.slippageBps < 0 || p.slippageBps > 100 ||
      (p.mode === 'NOTIONAL' && (p.leverage !== 1 || p.maxExposureMultiple > 1)))
    throw new Error('Invalid sizing policy. Notional sizing cannot credit leverage; exposure cannot exceed the leverage ceiling.');
  return p;
}

/** Broker adapters supply verified per-unit costs and round DOWN to the broker lot size. */
export function sizeEntry(input: {
  riskBudget: number; marginBudget: number; exposureBudget: number;
  unitRisk: number; unitMargin: number; unitNotional: number;
  roundDown: (quantity: number) => number;
  minAmount?: number; maxAmount?: number; minNotional?: number; maxNotional?: number;
  requestedAmount?: number;
  calculateTarget?: boolean;
}) {
  const { riskBudget, marginBudget, exposureBudget, unitRisk, unitMargin, unitNotional } = input;
  if (![riskBudget, marginBudget, exposureBudget, unitRisk, unitMargin, unitNotional].every(Number.isFinite) ||
      [unitRisk, unitMargin, unitNotional].some(n => n <= 0)) throw new Error('Authoritative sizing budgets and unit costs are required');
  const minAmount = input.minAmount ?? 0, maxAmount = input.maxAmount ?? Infinity;
  const minNotional = input.minNotional ?? 0, maxNotional = input.maxNotional ?? Infinity;
  if (!Number.isFinite(minAmount) || minAmount < 0 || !Number.isFinite(minNotional) || minNotional < 0 ||
      !(maxAmount > 0) || !(maxNotional > 0) || maxAmount < minAmount || maxNotional < minNotional)
    throw new Error('Invalid exchange quantity/notional limits');
  const budgets = [Math.max(0, riskBudget) / unitRisk, Math.max(0, marginBudget) / unitMargin,
    Math.max(0, exposureBudget) / unitNotional, maxAmount, maxNotional / unitNotional];
  const labels = ['stop/loss risk budget', 'margin and available funds', 'exposure ceiling', 'exchange amount maximum', 'exchange notional maximum'];
  const bound = Math.min(...budgets);
  const limitingConstraint = labels[budgets.indexOf(bound)]!;
  const minimum = Math.max(minAmount, minNotional / unitNotional);
  const insufficient = (quantity: number) => new Error(`No tradable quantity: ${limitingConstraint} permits a bounded size of ${quantity} units, below minimum ${minimum}. One minimum order needs at least ${minimum * unitMargin} margin and ${minimum * unitRisk} estimated loss budget.`);
  if (bound <= 0 || bound < minimum) throw insufficient(bound);
  let max: number;
  try { max = input.roundDown(bound); }
  catch { throw new Error(`Exchange lot rounding failed for allowed size ${bound} units (${limitingConstraint}); verify the broker minimum amount and lot step. No order was sent.`); }
  // Never trust an adapter that rounds up, or accept a model's fractional lot.
  if (!Number.isFinite(max) || max < 0 || max > bound) throw new Error('Exchange quantity rounding exceeded the sizing budget');
  if (max <= 0 || max < minimum) throw insufficient(max);
  const amount = input.requestedAmount ?? max;
  if (!Number.isFinite(amount) || amount <= 0 || amount > max || amount < minimum || input.roundDown(amount) !== amount)
    throw new Error(`Requested quantity must match the exchange lot size and be between ${minimum} and ${max} units (${limitingConstraint}).`);
  const targetBound = Math.min(budgets[0]!, budgets[2]!, maxAmount, maxNotional / unitNotional);
  // Legacy callers retain the original bound and amount rounding operations. The larger
  // margin-independent target is calculated only for an explicit target objective.
  const targetAmount = input.calculateTarget ? input.roundDown(targetBound) : max;
  if (!Number.isFinite(targetAmount) || targetAmount < max || targetAmount > targetBound) throw new Error('Exchange target quantity rounding exceeded the sizing budget');
  return { amount, maxAmount: max, targetAmount, notional: amount * unitNotional, riskAtStop: amount * unitRisk,
    marginRequired: amount * unitMargin, limitingConstraint };
}

/** Lowest whole-number leverage that permits a valid order; never relaxes other budgets. */
export function minimumViableLeverage(ceiling: number, fits: (leverage: number) => boolean) {
  if (!Number.isSafeInteger(ceiling) || ceiling < 1 || ceiling > 20) throw new Error('Leverage ceiling must be an integer from 1× to 20×');
  for (let leverage = 1; leverage <= ceiling; leverage++) if (fits(leverage)) return leverage;
  return undefined;
}

/** Compare only candidates that already passed broker, liquidation and account checks. */
export function selectAutomaticLeverage<T extends {amount:number;targetAmount:number;limitingConstraint:string}>(
  ceiling:number, autoSizing:AutoSizing | undefined, sizeCandidate:(leverage:number)=>T | undefined,
) {
  if (!Number.isSafeInteger(ceiling) || ceiling < 1 || ceiling > 20) throw new Error('Leverage ceiling must be an integer from 1× to 20×');
  if (autoSizing !== undefined && !['TARGET_RISK','MINIMUM_ORDER'].includes(autoSizing)) throw new Error('Invalid automatic sizing objective');
  const objective=autoSizing ?? 'MINIMUM_ORDER';
  let selected:{leverage:number;sizing:T} | undefined;
  let targetAmount=0;
  for(let leverage=1;leverage<=ceiling;leverage++) {
    const sizing=sizeCandidate(leverage);
    if(!sizing)continue;
    targetAmount=Math.max(targetAmount,sizing.targetAmount);
    // Ascending candidates retain the lowest leverage when quantities tie.
    if(!selected || sizing.amount>selected.sizing.amount)selected={leverage,sizing};
    if(objective==='MINIMUM_ORDER')break;
  }
  if(!selected)return undefined;
  const diagnostics:AutomaticSizingDiagnostics={autoSizing:objective,targetAmount,fundedAmount:selected.sizing.amount,
    targetFunded:selected.sizing.amount>=targetAmount,limitingConstraint:selected.sizing.limitingConstraint};
  return {...selected,diagnostics};
}

/** Paper/backtest auto sizing uses the same budgets; live adapters additionally verify broker settings. */
export function sizeAutomaticSimulationEntry(input: {
  ceiling:number; autoSizing?:AutoSizing; cash:number; riskBudget:number; maxMarginPct:number; maxExposureMultiple:number;
  price:number; stopPrice:number; contractSize:number; minContracts:number; maintenanceMarginRate:number;
  feeRate:number; slippageRate:number;
}) {
  const {price,stopPrice,contractSize,maintenanceMarginRate,feeRate,slippageRate}=input;
  const costs=(price+Math.max(price,stopPrice))*(feeRate+slippageRate);
  const selected=selectAutomaticLeverage(input.ceiling,input.autoSizing,candidate=>{
    if (Math.abs(price-stopPrice)/price+costs/price+2*maintenanceMarginRate>=1/candidate) return undefined;
    try {
      return sizeEntry({riskBudget:input.riskBudget,marginBudget:input.cash*input.maxMarginPct/100,
        exposureBudget:input.cash*Math.min(input.maxExposureMultiple,candidate),
        unitRisk:contractSize*(Math.abs(price-stopPrice)+costs),
        unitMargin:contractSize*(price/candidate+costs),unitNotional:contractSize*price,
        minAmount:input.minContracts,roundDown:Math.floor,calculateTarget:input.autoSizing==='TARGET_RISK'});
    } catch {return undefined;}
  });
  return selected ? {...selected.sizing,leverage:selected.leverage,diagnostics:selected.diagnostics} : undefined;
}
