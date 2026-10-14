import { validateExitPolicy } from '../../../../../shared/trading/exitPolicy';
import { validateStrategy, type StrategyConfig } from '../../../../../shared/trading/strategies';
import type { DeltaTimeframe } from '../../../../../shared/trading/delta-data';
import type { Contract, SimulationConfig } from '../../../../../shared/trading/perpetualBacktest';

export type CryptoStrategyConfig = StrategyConfig & { timeframe: DeltaTimeframe; simulation: SimulationConfig; contract: Contract; stateId?: string };
export class MissedLiveCandlesError extends Error {
  readonly code = 'MISSED_LIVE_CANDLES';
  constructor() { super('Missed live strategy candles; review required rather than trading stale signals'); }
}
export const intervals = { '15m':900, '1h':3600, '4h':14400, '1d':86400 };
export function validateCryptoStrategy(raw: unknown): CryptoStrategyConfig {
  if(!raw || typeof raw!=='object') throw new Error('Saved crypto strategy settings are required');
  const c=raw as CryptoStrategyConfig;
  validateStrategy(c);
  if(!Object.hasOwn(intervals,c.timeframe) || !c.simulation || !c.contract || c.contract.settlement!=='USD') throw new Error('Unsupported crypto strategy settings');
  const s=c.simulation;
  if (s.exitPolicy !== undefined) validateExitPolicy(s.exitPolicy,c.id);
  if(![s.initialCapital,s.leverage,s.riskPerTradePct,s.maxMarginPct,s.maxDailyLossPct].every(n=>Number.isFinite(n)&&n>0) || s.leverage<1||s.leverage>20||s.riskPerTradePct>10||s.maxMarginPct>100||s.maxDailyLossPct>100 || ![s.feeBps,s.slippageBps].every(n=>Number.isFinite(n)&&n>=0&&n<=100) || !Number.isFinite(s.fundingRatePct8h)||Math.abs(s.fundingRatePct8h)>1||![s.maxTradesPerDay,s.maxPositionsOpenedPerDay].every(n=>Number.isSafeInteger(n)&&n>0&&n<=1000)||!['both','long','short'].includes(s.direction)) throw new Error('Invalid crypto risk settings');
  if(s.autoSizing!==undefined&&(!['TARGET_RISK','MINIMUM_ORDER'].includes(s.autoSizing)||s.leverageMode!=='AUTO') || !Number.isSafeInteger(s.leverage) || s.leverageMode!==undefined&&!['FIXED','AUTO'].includes(s.leverageMode) || s.maxExposureMultiple!==undefined&&(!Number.isFinite(s.maxExposureMultiple)||s.maxExposureMultiple<=0||s.maxExposureMultiple>s.leverage))throw new Error('Invalid algorithm leverage/exposure policy');
  if (s.dailyTimezone !== undefined && s.dailyTimezone !== 'Asia/Kolkata') throw new Error('Delta strategies use Asia/Kolkata trading days');
  return {...c, simulation: {...s, dailyTimezone: 'Asia/Kolkata'}};
}
