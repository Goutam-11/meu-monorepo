import { expect, test } from 'bun:test';
import { projectCryptoPolicy } from '../src/features/agents/server/crypto-policy';

const risk = {
  maxRiskPerTradePct: 2,
  maxDailyLossPct: 6,
  maxOpenPositions: 1 as const,
  maxTradesPerDay: 8,
  maxPositionsOpenedPerDay: 4,
};

test('projects the canonical agent policy into the strategy snapshot', () => {
  const projected = projectCryptoPolicy({
    risk,
    capital: { allocated: 500, currency: 'USD' },
    simulation: {
      initialCapital: 100,
      riskPerTradePct: 0.5,
      maxDailyLossPct: 1,
      maxTradesPerDay: 1,
      maxPositionsOpenedPerDay: 1,
      leverage: 3,
    },
  });
  expect(projected.risk).toEqual(risk);
  expect(projected.capital).toEqual({ allocated: 500, currency: 'USD' });
  expect(projected.simulation).toMatchObject({
    initialCapital: 500,
    riskPerTradePct: 2,
    maxDailyLossPct: 6,
    maxTradesPerDay: 8,
    maxPositionsOpenedPerDay: 4,
    leverage: 3,
  });
});
