export type ChartSource = 'YAHOO' | 'DELTA' | 'BINANCE';
export type ChartInterval = '5m' | '15m' | '1h' | '1d';
export type ChartCandle = { time: number; open: number; high: number; low: number; close: number; volume: number };
export type ChartSymbol = { symbol: string; name: string; currency: string };
export const chartSources: Record<ChartSource, { label: string; symbol: string; currency: string }> = {
  YAHOO: { label: 'Yahoo · stocks & indices', symbol: '^NSEI', currency: 'INR' },
  DELTA: { label: 'Delta India · perpetuals', symbol: 'BTCUSD', currency: 'USD' },
  BINANCE: { label: 'Binance USD-M · perpetuals', symbol: 'BTCUSDT', currency: 'USDT' },
};

export function agentChartSymbol(exchange: string, symbol: string): { source: ChartSource; symbol: string } | null {
  const venue = exchange.toUpperCase();
  if (venue === 'DELTA' || venue === 'BINANCE') {
    return { source: venue, symbol: symbol.split(':')[0].replace('/', '') };
  }
  if (venue === 'ZERODHA') {
    const index = ({ 'NIFTY': '^NSEI', 'NIFTY 50': '^NSEI', 'BANKNIFTY': '^NSEBANK', 'NIFTY BANK': '^NSEBANK', 'SENSEX': '^BSESN' } as Record<string, string>)[symbol.replace(/^NSE:/, '')];
    if (index) return { source: 'YAHOO', symbol: index };
    const ticker = symbol.replace(/^NSE:/, '');
    return { source: 'YAHOO', symbol: ticker.endsWith('.NS') ? ticker : `${ticker}.NS` };
  }
  return null;
}
