/** Supported trading-day zones have fixed offsets and no daylight saving. */
export type MarketTimezone = 'UTC' | 'Asia/Kolkata';

export function marketDayOffset(timezone: MarketTimezone = 'UTC'): number {
  if (timezone === 'UTC') return 0;
  if (timezone === 'Asia/Kolkata') return 19_800;
  throw new Error('Unsupported trading-day timezone');
}

export function marketDayIndex(timestamp: number, timezone: MarketTimezone = 'UTC'): number {
  if (!Number.isFinite(timestamp) || timestamp < 0) throw new Error('Invalid trading-day timestamp');
  return Math.floor((timestamp + marketDayOffset(timezone)) / 86_400);
}

export function marketDayStart(timestamp: number, timezone: MarketTimezone = 'UTC'): number {
  return marketDayIndex(timestamp, timezone) * 86_400 - marketDayOffset(timezone);
}

export function marketDate(timestamp: number, timezone: MarketTimezone = 'UTC'): string {
  return new Date(marketDayIndex(timestamp, timezone) * 86_400_000).toISOString().slice(0, 10);
}

export function exchangeMarketTimezone(exchange: string): MarketTimezone {
  return ['DELTA', 'ZERODHA', 'KITE'].includes(exchange.toUpperCase()) ? 'Asia/Kolkata' : 'UTC';
}
