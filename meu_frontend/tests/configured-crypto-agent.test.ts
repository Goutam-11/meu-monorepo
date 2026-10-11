import { describe, expect, test } from 'bun:test';
import { configuredCryptoAgentSchema } from '../src/features/backtests/validation';
const input = {
  name: 'XRP test', exchangeId: '697a21e128365ca4c9063c27', mode: 'PAPER', agentCycles: 60,
  config: { symbol: 'XRPUSD', timeframe: '1h', strategy: { id: 'donchian', fastPeriod: 20, slowPeriod: 50, lookback: 20, atrPeriod: 14, stopAtr: 2, rewardRisk: 2 }, simulation: { initialCapital: 10, leverage: 2, riskPerTradePct: 0.5, maxMarginPct: 10, feeBps: 10, slippageBps: 5, fundingRatePct8h: 0, maxTradesPerDay: 1, maxPositionsOpenedPerDay: 1, maxDailyLossPct: 1, direction: 'both' } },
};
describe('direct crypto algorithm configuration', () => {
  test('accepts paper and live configurations without a backtest ID or client contract', () => {
    for (const mode of ['PAPER', 'LIVE']) expect(configuredCryptoAgentSchema.safeParse({ ...input, mode }).success).toBe(true);
  });
  test('rejects cycles slower than the strategy candle timeframe', () => {
    expect(configuredCryptoAgentSchema.safeParse({ ...input, agentCycles: 14400 }).success).toBe(false);
  });
  test('rejects unsupported markets, algorithms and futures risk', () => {
    for (const patch of [{ symbol: 'XRP/USD:USD' }, { strategy: { ...input.config.strategy, id: 'hybrid' } }, { simulation: { ...input.config.simulation, leverage: 21 } }, { simulation: { ...input.config.simulation, riskPerTradePct: 11 } }]) expect(configuredCryptoAgentSchema.safeParse({ ...input, config: { ...input.config, ...patch } }).success).toBe(false);
  });
  test('does not trust client-supplied contract or activation state', () => {
    const parsed = configuredCryptoAgentSchema.parse({ ...input, status: 'RUNNING', config: { ...input.config, contract: { contractSize: 999 } } });
    expect(parsed).not.toHaveProperty('status');
    expect(parsed.config).not.toHaveProperty('contract');
  });
});


test('algorithm policies accept automatic ceilings and 100% margin with separate gross notional',()=>{
 const simulation={...input.config.simulation,leverageMode:'AUTO',leverage:5,maxMarginPct:100,maxExposureMultiple:2};
 const configured=configuredCryptoAgentSchema.parse({...input,config:{...input.config,simulation}});
 expect(configured.config.simulation).toMatchObject(simulation);
 expect(configuredCryptoAgentSchema.safeParse({...input,config:{...input.config,simulation:{...simulation,maxExposureMultiple:6}}}).success).toBe(false);
});
