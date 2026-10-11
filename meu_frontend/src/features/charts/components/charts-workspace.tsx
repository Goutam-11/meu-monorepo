'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUISettings } from '@/components/ui-settings';
import { MeuChartWorkspace } from './meu-chart-workspace';

const quickCharts = [
  { label: 'BTC perpetual', symbol: 'BINANCE:BTCUSDT.P' },
  { label: 'ETH perpetual', symbol: 'BINANCE:ETHUSDT.P' },
  { label: 'SOL perpetual', symbol: 'BINANCE:SOLUSDT.P' },
  { label: 'XRP perpetual', symbol: 'BINANCE:XRPUSDT.P' },
  { label: 'S&P 500', symbol: 'FOREXCOM:SPXUSD' },
];

const marketTabs = [
  { title: 'Crypto', symbols: [
    { s: 'BINANCE:BTCUSDT', d: 'Bitcoin' },
    { s: 'BINANCE:ETHUSDT', d: 'Ethereum' },
    { s: 'BINANCE:SOLUSDT', d: 'Solana' },
    { s: 'BINANCE:XRPUSDT', d: 'XRP' },
  ] },
  { title: 'Indices', symbols: [
    { s: 'FOREXCOM:SPXUSD', d: 'S&P 500 CFD' },
    { s: 'FOREXCOM:NSXUSD', d: 'US 100 CFD' },
  ] },
  { title: 'US stocks', symbols: [
    { s: 'NASDAQ:AAPL', d: 'Apple' },
    { s: 'NASDAQ:MSFT', d: 'Microsoft' },
    { s: 'NASDAQ:NVDA', d: 'NVIDIA' },
  ] },
];

/** TradingView owns the iframe; Meu never reads its quotes or passes account credentials. */
function TradingViewWidget({ kind, symbol, theme }: {
  kind: 'advanced-chart' | 'market-overview';
  symbol: string;
  theme: 'light' | 'dark';
}) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'unavailable'>('loading');
  const [attempt, setAttempt] = useState(0);
  const config = JSON.stringify(kind === 'advanced-chart' ? {
    autosize: true,
    symbol,
    interval: '15',
    timezone: 'Asia/Kolkata',
    theme,
    backgroundColor: theme === 'dark' ? '#303438' : '#e6e3df',
    style: '1',
    locale: 'en',
    allow_symbol_change: true,
    hide_side_toolbar: false,
    hide_top_toolbar: false,
    withdateranges: true,
    save_image: true,
    calendar: false,
    support_host: 'https://www.tradingview.com',
  } : {
    width: '100%',
    height: '100%',
    colorTheme: theme,
    dateRange: '1D',
    locale: 'en',
    isTransparent: true,
    showChart: true,
    showSymbolLogo: true,
    showFloatingTooltip: true,
    tabs: marketTabs,
  });

  useEffect(() => {
    const target = host.current;
    if (!target) return;
    // Give every effect its own container, including React Strict Mode remounts.
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.cssText = 'height:100%;width:100%';
    const slot = document.createElement('div');
    slot.className = 'tradingview-widget-container__widget';
    slot.style.cssText = 'height:100%;width:100%';
    container.appendChild(slot);
    target.appendChild(container);

    let disposed = false;
    const frames = new Set<HTMLIFrameElement>();
    const loaded = () => {
      if (!disposed) setStatus('loaded');
      window.clearTimeout(timeout);
    };
    const timeout = window.setTimeout(() => {
      if (!disposed) setStatus('unavailable');
    }, 25_000);
    const observer = new MutationObserver(() => {
      container.querySelectorAll('iframe').forEach(frame => {
        if (frames.has(frame)) return;
        frames.add(frame);
        frame.title = kind === 'advanced-chart' ? 'TradingView interactive market chart' : 'TradingView market overview';
        frame.addEventListener('load', loaded);
      });
    });
    observer.observe(container, { childList: true, subtree: true });

    const script = document.createElement('script');
    script.src = `https://s3.tradingview.com/external-embedding/embed-widget-${kind}.js`;
    script.type = 'text/javascript';
    script.async = true;
    script.textContent = config;
    script.onerror = () => {
      window.clearTimeout(timeout);
      if (!disposed) setStatus('unavailable');
    };
    container.appendChild(script);

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      observer.disconnect();
      frames.forEach(frame => frame.removeEventListener('load', loaded));
      script.onerror = null;
      container.remove();
    };
  }, [kind, config, attempt]);

  return <>
    {status === 'unavailable' && <div role="status" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <p className="max-w-[70ch] text-muted-foreground">TradingView hasn’t loaded. Check your connection or whether your browser blocks TradingView embeds, then retry.</p>
      <Button variant="outline" onClick={() => { setStatus('loading'); setAttempt(value => value + 1); }}><RefreshCw aria-hidden="true" />Retry chart</Button>
    </div>}
    <div className="relative h-[72vh] min-h-[520px] max-h-[900px] w-full sm:min-h-[600px]">
      <div ref={host} className="h-full w-full" aria-busy={status === 'loading'} />
      {status === 'loading' && <div role="status" className="pointer-events-none absolute inset-0 flex flex-col gap-5 bg-background p-6">
        <span className="text-sm text-muted-foreground">Loading TradingView…</span>
        <Skeleton className="h-10 w-2/3" /><Skeleton className="min-h-0 w-full flex-1" />
      </div>}
    </div>
    <div className="tradingview-widget-copyright px-4 py-3 text-sm text-muted-foreground">
      <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">Track all markets on TradingView</a>
    </div>
  </>;
}

function TradingViewWorkspace() {
  const { look } = useUISettings();
  const theme = look === 'sculpt-light' ? 'light' : 'dark';
  const [chart, setChart] = useState({ symbol: quickCharts[0].symbol, revision: 0 });

  return <div className="space-y-7">
    <Tabs defaultValue="chart" className="gap-5">
      <TabsList aria-label="Market research views"><TabsTrigger value="chart">Interactive chart</TabsTrigger><TabsTrigger value="overview">Market overview</TabsTrigger></TabsList>
      <TabsContent value="chart" className="space-y-5">
        <div className="space-y-3"><p className="text-sm text-muted-foreground">Search any available market using the symbol name at the top of the chart. Use Indicators or the drawing toolbar to analyze it.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Open a quick chart">{quickCharts.map(item => <Button key={item.symbol} variant="outline" size="sm" onClick={() => setChart(value => ({ symbol: item.symbol, revision: value.revision + 1 }))}>{item.label}</Button>)}</div>
        </div>
        <section aria-label="Interactive chart" className="neu-panel min-w-0 overflow-hidden">
          <TradingViewWidget key={`${theme}-${chart.symbol}-${chart.revision}`} kind="advanced-chart" symbol={chart.symbol} theme={theme} />
        </section>
      </TabsContent>
      <TabsContent value="overview" className="space-y-5">
        <p className="max-w-[70ch] text-sm text-muted-foreground">Compare crypto, global index references and US stocks. Use Meu charts for Nifty and Indian-market history.</p>
        <section aria-label="Market overview" className="neu-panel min-w-0 overflow-hidden">
          <TradingViewWidget key={theme} kind="market-overview" symbol={chart.symbol} theme={theme} />
        </section>
      </TabsContent>
    </Tabs>
    <footer className="max-w-[75ch] space-y-2 text-sm text-muted-foreground">
      <p>Charts use TradingView’s market feed. Crypto shortcuts show Binance USDT perpetuals, not Delta India contracts. Prices and available instruments can differ from your connected exchange; stocks and indices may be delayed or unavailable.</p>
      <p>Charts are for research. Agent execution uses its configured broker data and settings. Changing this chart does not change an agent. <Link href="/help#charts" className="font-medium underline underline-offset-4">Chart guide</Link></p>
    </footer>
  </div>;
}

export function ChartsWorkspace({ initialAgentId }: { initialAgentId?: string }) {
  return <div className="page-shell space-y-7">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="page-title">Charts</h1><p className="mt-2 max-w-[70ch] text-muted-foreground">Study Indian markets and exchange candles, or open an agent’s market for a closer look.</p></div>
      <Button asChild variant="outline"><a href="https://www.tradingview.com/chart/" target="_blank" rel="noopener noreferrer">Open TradingView<ExternalLink aria-hidden="true" /></a></Button>
    </header>
    <Tabs defaultValue="meu" className="gap-5">
      <TabsList aria-label="Chart providers"><TabsTrigger value="meu">Meu charts</TabsTrigger><TabsTrigger value="tradingview">TradingView</TabsTrigger></TabsList>
      <TabsContent value="meu"><MeuChartWorkspace initialAgentId={initialAgentId} /></TabsContent>
      <TabsContent value="tradingview"><TradingViewWorkspace /></TabsContent>
    </Tabs>
  </div>;
}
