'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDown, RefreshCw } from 'lucide-react';
import { useTRPC } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CandleChart } from './candle-chart';
import { chartSources, type ChartSource, type ChartInterval } from '../types';

type Selection = { source: ChartSource; symbol: string; agentId?: string };
const defaults: Selection = { source: 'YAHOO', symbol: '^NSEI' };
const quick: Selection[] = [defaults, { source: 'YAHOO', symbol: '^NSEBANK' }, { source: 'YAHOO', symbol: '^BSESN' }, { source: 'DELTA', symbol: 'BTCUSD' }, { source: 'DELTA', symbol: 'SOLUSD' }, { source: 'BINANCE', symbol: 'BTCUSDT' }];
const labels: Record<string, string> = { '^NSEI': 'Nifty 50', '^NSEBANK': 'Nifty Bank', '^BSESN': 'Sensex', BTCUSD: 'BTC · Delta', SOLUSD: 'SOL · Delta', BTCUSDT: 'BTC · Binance' };

function SymbolSearch({ selection, onSelect }: { selection: Selection; onSelect: (symbol: string) => void }) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false), [search, setSearch] = useState(''), [query, setQuery] = useState('');
  useEffect(() => { const timer = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const result = useQuery(trpc.charts.search.queryOptions({ source: selection.source, query }, { enabled: open, staleTime: 60_000, retry: false }));
  const busy = query !== search.trim() || result.isFetching;
  const manual = search.trim().toUpperCase();
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button id="chart-symbol" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal"><span className="truncate">{selection.symbol}</span><ChevronsUpDown aria-hidden="true" /></Button></PopoverTrigger>
    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0" aria-label="Search chart symbols">
      <Command shouldFilter={false}><CommandInput value={search} onValueChange={setSearch} maxLength={80} placeholder={selection.source === 'YAHOO' ? 'Search Nifty, a company or Yahoo ticker…' : 'Search a perpetual ticker…'} aria-label="Search chart symbols" /><CommandList>
        {busy ? <p role="status" className="p-4 text-sm text-muted-foreground">Searching markets…</p> : result.isError ? <div role="alert" className="space-y-3 p-4 text-sm"><p className="text-destructive">{result.error.message}</p><Button variant="secondary" size="sm" onClick={() => result.refetch()}>Retry search</Button></div> : !result.data?.length ? <p className="p-4 text-sm text-muted-foreground">No symbols found. Try a ticker or company name.</p> : result.data.map(item => <CommandItem key={item.symbol} value={item.symbol} onSelect={() => { onSelect(item.symbol); setOpen(false); }} className="min-h-14 px-3 py-3"><div className="min-w-0"><p className="font-medium">{item.symbol}<span className="ml-2 text-xs text-muted-foreground">{item.currency}</span></p><p className="break-words text-xs text-muted-foreground">{item.name}</p></div></CommandItem>)}
        {manual && /^[A-Z0-9^.&=_-]{1,40}$/.test(manual) && !busy && !result.data?.some(item => item.symbol === manual) && <CommandItem value={`manual:${manual}`} onSelect={() => { onSelect(manual); setOpen(false); }}>Load ticker {manual}</CommandItem>}
      </CommandList></Command>
      <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{selection.source === 'YAHOO' ? 'NSE equities use .NS; BSE equities use .BO.' : 'Public production perpetual markets. No API key needed.'}</p>
    </PopoverContent>
  </Popover>;
}

export function MeuChartWorkspace({ initialAgentId }: { initialAgentId?: string }) {
  const trpc = useTRPC();
  const agents = useQuery(trpc.charts.agents.queryOptions(undefined, { staleTime: 60_000, retry: false }));
  const [selection, setSelection] = useState<Selection | null>(null);
  const selected = selection ?? agents.data?.find(agent => agent.agentId === initialAgentId) ?? defaults;
  const [interval, setInterval] = useState<ChartInterval>('15m');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  const waitingForAgent = Boolean(initialAgentId && !selection && agents.isPending);
  const query = useQuery(trpc.charts.candles.queryOptions({ source: selected.source, symbol: selected.symbol, interval }, {
    enabled: !waitingForAgent, staleTime: 20_000, retry: false,
    refetchInterval: autoRefresh ? selected.source === 'YAHOO' ? 60_000 : 30_000 : false,
    refetchIntervalInBackground: false,
  }));
  const data = query.data;
  const fmtTime = (time: number) => new Date(time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  const stale = data ? Math.max(now, data.fetchedAt) - data.lastCandleAt > (interval === '1d' ? 4 * 86400_000 : interval === '1h' ? 3 * 3600_000 : interval === '15m' ? 3 * 900_000 : 3 * 300_000) : false;
  const agentValue = selected.agentId ? `${selected.agentId}:${selected.symbol}` : 'none';

  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.3fr_1.5fr]">
      <div className="space-y-2"><label id="chart-source-label" className="text-sm font-medium">Market data source</label><Select value={selected.source} onValueChange={value => { const source = value as ChartSource; setSelection({ source, symbol: chartSources[source].symbol }); }}><SelectTrigger aria-labelledby="chart-source-label" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(chartSources).map(([key, source]) => <SelectItem key={key} value={key}>{source.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><label htmlFor="chart-symbol" className="text-sm font-medium">Chart symbol</label><SymbolSearch key={selected.source} selection={selected} onSelect={symbol => setSelection({ source: selected.source, symbol })} /></div>
      <div className="space-y-2"><label id="chart-agent-label" className="text-sm font-medium">Open an agent’s market</label><Select value={agentValue} onValueChange={value => { const agent = agents.data?.find(a => `${a.agentId}:${a.symbol}` === value); setSelection(agent ?? { source: selected.source, symbol: selected.symbol }); }}><SelectTrigger aria-labelledby="chart-agent-label" className="w-full" disabled={agents.isPending}><SelectValue placeholder="Choose an agent ticker" /></SelectTrigger><SelectContent><SelectItem value="none">Browse independently</SelectItem>{agents.data?.map(agent => <SelectItem key={`${agent.agentId}:${agent.symbol}`} value={`${agent.agentId}:${agent.symbol}`}>{agent.agentName} · {agent.symbol} · {agent.exchangeName}</SelectItem>)}</SelectContent></Select></div>
    </div>
    {agents.isError && <p role="status" className="text-sm text-muted-foreground">Agent tickers could not load. Public charts still work. <Button variant="link" onClick={() => agents.refetch()}>Retry agent list</Button></p>}
    {initialAgentId && !selection && !agents.isPending && !agents.data?.some(a => a.agentId === initialAgentId) && <p role="status" className="text-sm text-muted-foreground">This agent has no supported production chart mapping. Select a market manually.</p>}
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick markets">{quick.map(item => <Button size="sm" variant="outline" key={`${item.source}:${item.symbol}`} onClick={() => setSelection(item)}>{labels[item.symbol]}</Button>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3"><h2 className="section-title">{selected.symbol}</h2><div className="flex flex-wrap gap-1" role="group" aria-label="Candle interval">{(['5m', '15m', '1h', '1d'] as const).map(value => <Button key={value} size="sm" aria-pressed={interval === value} variant={interval === value ? 'default' : 'outline'} onClick={() => setInterval(value)}>{value}</Button>)}</div></div>
      <div className="flex flex-wrap items-center gap-3"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} className="size-4 accent-primary" />Auto refresh</label><Button variant="outline" disabled={query.isFetching || waitingForAgent} onClick={() => query.refetch()}><RefreshCw aria-hidden="true" className={query.isFetching ? 'animate-spin motion-reduce:animate-none' : ''} />Refresh</Button>{selected.agentId && <Button asChild variant="outline"><Link href={`/agents/${selected.agentId}`}>Agent details</Link></Button>}</div>
    </div>
    <div role="status" className="space-y-1 text-xs text-muted-foreground">
      <p>{chartSources[selected.source].label} · {data ? data.currency || 'Currency unavailable' : selected.source === 'YAHOO' ? 'Currency from provider' : chartSources[selected.source].currency} · {interval} candles · {data?.candles.length ?? 0} bars · {selected.source === 'YAHOO' ? '60' : '30'}s refresh when enabled</p>
      {data && <p>Fetched {fmtTime(data.fetchedAt)} IST · Last candle starts {fmtTime(data.lastCandleAt)} IST{data.latestQuoteAt ? ` · Provider quote ${fmtTime(data.latestQuoteAt)} IST` : ''}</p>}
      {stale && <p className="text-warning">Latest candle is old for this interval. The market may be closed or this feed may be delayed; check timestamps before analysis.</p>}
    </div>
    {query.isError && <div role="alert" className="neu-inset space-y-2 p-4"><p className="text-sm text-destructive">{query.error.message}</p>{data && <p className="text-sm text-muted-foreground">Refresh failed. The chart still shows the previously fetched history and is not current.</p>}<Button variant="outline" onClick={() => query.refetch()}>Retry market data</Button></div>}
    {waitingForAgent || query.isPending ? <div className="neu-panel space-y-4 p-5" role="status" aria-label="Loading chart candles"><Skeleton className="h-10 w-2/3" /><Skeleton className="h-[60vh] min-h-80 w-full" /></div> : data ? <CandleChart key={`${selected.source}:${selected.symbol}:${interval}`} candles={data.candles} currency={data.currency} /> : null}
    <p className="max-w-[75ch] text-sm text-muted-foreground">{data?.warning ?? (selected.source === 'YAHOO' ? 'Yahoo is an unofficial research feed and may be delayed or unavailable.' : 'Public production exchange candles; the latest bar may still be forming.')} Charts do not place orders or alter agent settings. Prices are not converted between INR, USD and USDT. <Link href="/help#charts" className="font-medium underline underline-offset-4">Chart guide</Link></p>
  </div>;
}
