'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CandlestickSeries, ColorType, LineSeries, LineType, createChart, createSeriesMarkers, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import { useTRPC } from '@/trpc/client';
import { useUISettings } from '@/components/ui-settings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { analyzeBacktest, backtestMarkers, exitExplanation, entryExplanation, tradeProtection, tradeProtectionPaths } from '../chart/analysis';

const price = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 4 });
const date = (value: number) => new Date(value * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

export function BacktestPriceChart({ runId, strategyId }: { runId: string; strategyId: 'ema' | 'donchian' | 'meanReversion' }) {
  const trpc = useTRPC();
  const query = useQuery(trpc.backtests.chart.queryOptions({ id: runId }, { staleTime: Infinity }));
  const { look } = useUISettings();
  const host = useRef<HTMLDivElement>(null), chartRef = useRef<IChartApi | null>(null);
  const [selected, setSelected] = useState(0), [hovered, setHovered] = useState<number | null>(null);
  const [showIndicators, setShowIndicators] = useState(true);
  const data = query.data;
  const analysis = useMemo(() => data ? analyzeBacktest(data.candles, data.strategy) : undefined, [data]);
  const trade = data?.trades[selected];
  const protection = trade && data && analysis ? tradeProtection(trade, data.candles, analysis.atr, data.strategy) : null;

  useEffect(() => {
    if (!host.current || !data || !analysis) return;
    const dark = look === 'sculpt-dark';
    const chart = createChart(host.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: dark ? '#303438' : '#e6e3df' }, textColor: dark ? '#b3b3b3' : '#62685f', attributionLogo: true },
      grid: { vertLines: { visible: false }, horzLines: { color: dark ? '#42474d' : '#d1cec8' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderVisible: false },
      rightPriceScale: { borderVisible: false },
      localization: { timeFormatter: (time: number) => date(time) },
    });
    const candles = chart.addSeries(CandlestickSeries, { upColor: dark ? '#8cc7aa' : '#237555', downColor: dark ? '#f3939f' : '#b13648', borderVisible: false, wickUpColor: '#237555', wickDownColor: '#b13648', priceFormat: { type: 'price', precision: 4, minMove: 0.0001 } });
    candles.setData(data.candles.map(c => ({ ...c, time: c.timestamp as UTCTimestamp })));
    createSeriesMarkers(candles, backtestMarkers(data.trades).map(marker => ({ ...marker, time: marker.time as UTCTimestamp, color: dark ? marker.shape === 'circle' ? '#e4c777' : marker.shape === 'arrowUp' ? '#8cc7aa' : '#f3939f' : marker.color })));
    const colors = dark ? ['#8cc7aa', '#e4c777', '#b3b3b3'] : ['#237555', '#946f1e', '#62685f'];
    analysis.overlays.forEach((overlay, index) => {
      const line = chart.addSeries(LineSeries, { color: colors[index], title: overlay.name, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, visible: showIndicators });
      line.setData(overlay.points.map(p => ({ ...p, time: p.time as UTCTimestamp })));
    });
    chart.subscribeClick(event => {
      if (typeof event.hoveredObjectId === 'string' && /^(entry|exit):\d+$/.test(event.hoveredObjectId)) setSelected(Number(event.hoveredObjectId.split(':')[1]));
      else if (typeof event.time === 'number') {
        const index = data.trades.findIndex(t => t.entryTimestamp === event.time || t.exitTimestamp === event.time);
        if (index >= 0) setSelected(index);
      }
    });
    chart.subscribeCrosshairMove(event => setHovered(typeof event.time === 'number' ? event.time : null));
    chart.timeScale().fitContent();
    chartRef.current = chart;
    return () => { chartRef.current = null; chart.remove(); };
  }, [data, analysis, look, showIndicators]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !trade || !data || !analysis) return;
    const paths = tradeProtectionPaths(trade, tradeProtection(trade,data.candles,analysis.atr,data.strategy));
    const lines: ISeriesApi<'Line'>[] = [];
    const add = (points: {time:number;value:number}[], title:string, color:string, stepped:boolean) => {
      if (!points.length) return;
      const line = chart.addSeries(LineSeries,{title,color,lineWidth:1,lineStyle:2,lineType:stepped ? LineType.WithSteps : LineType.Simple,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false});
      line.setData(points.map(point=>({...point,time:point.time as UTCTimestamp})));
      lines.push(line);
    };
    const dark = look === 'sculpt-dark';
    add(paths.stop,'Protective stop',dark ? '#f3939f' : '#b13648',true);
    paths.targets.forEach(points=>add(points,'Take profit',dark ? '#e4c777' : '#946f1e',false));
    return () => { if (chartRef.current === chart) lines.forEach(line=>chart.removeSeries(line)); };
  }, [data,analysis,look,showIndicators,trade]);

  function focusTrade() {
    if (!trade || !data || !chartRef.current) return;
    const start = data.candles.findIndex(c => c.timestamp === trade.entryTimestamp);
    const end = data.candles.findIndex(c => c.timestamp === trade.exitTimestamp);
    chartRef.current.timeScale().setVisibleLogicalRange({ from: Math.max(0, start - 12), to: Math.min(data.candles.length + 2, Math.max(start + 12, end + 8)) });
  }
  const candleIndex = data?.candles.findIndex(c => c.timestamp === hovered) ?? -1;
  const candle = candleIndex >= 0 ? data?.candles[candleIndex] : undefined;
  const entryIndex = trade && data ? data.candles.findIndex(c=>c.timestamp===trade.entryTimestamp) : -1;
  const setup = data ? entryExplanation(data.strategy,analysis?.entryProposals[entryIndex-1]) : '';

  const strategyName = strategyId === 'ema' ? data?.strategy.executionRules?.version === 2 ? 'EMA trend system' : 'EMA crossover' : strategyId === 'donchian' ? 'Donchian breakout' : 'Bollinger + RSI';
  const trailingActivation = trade?.protectionTimeline?.find(point=>point.trailingActive);
  const policyName = data?.strategy.executionRules?.version === 2 ? `Research v2${strategyId === 'ema' ? ` · ${data.strategy.executionRules.emaEntry} entries` : ''}` : data?.strategy.executionRules?.version === 1 ? 'Experimental v1' : 'Original rules';

  return <section className="space-y-4" aria-labelledby={`trades-chart-${runId}`}>
    <div><h3 id={`trades-chart-${runId}`} className="font-semibold">Saved run · {strategyName} · Run {runId.slice(-6)}</h3><p className="mt-1 text-sm text-muted-foreground">{policyName}. Chart uses the saved run’s source data and fills. BUY opens a long; SELL opens a short. Gold EXIT closes either position. Numbers pair each entry with its exit. Dashed red and gold lines show the selected trade’s stop and target.</p></div>
    {query.isPending ? <Skeleton className="h-96 w-full" /> : query.isError ? <p role="alert" className="text-sm text-destructive">Could not load the saved price history. <Button variant="link" onClick={() => query.refetch()}>Retry</Button></p> : <>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant={showIndicators ? 'secondary' : 'outline'} aria-pressed={showIndicators} onClick={() => setShowIndicators(v => !v)}>Strategy indicators</Button><Button size="sm" variant="outline" onClick={() => chartRef.current?.timeScale().fitContent()}>Show entire test</Button></div>
      <div ref={host} className="h-96 min-w-0 overflow-hidden rounded-xl" role="img" aria-label="Historical candles with numbered long, short and exit markers. Use the trade selector below for accessible trade details." />
      <div className="min-h-12 text-xs leading-relaxed text-muted-foreground">{candle && analysis ? <><span className="font-medium">{date(candle.timestamp)}</span> · Open {price(candle.open)} · High {price(candle.high)} · Low {price(candle.low)} · Close {price(candle.close)}<br />At candle close: {analysis.decisions[candleIndex]}. {analysis.signals[candleIndex] === 'hold' ? 'No new entry instruction.' : `Signal: ${analysis.signals[candleIndex]}.`}</> : 'Move across a candle to see its prices and the rule decision at its close. A setup is not necessarily a filled trade: direction, sizing and daily budgets still apply.'}</div>
      {trade ? <div className="neu-inset space-y-4 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1 space-y-2 text-sm"><label htmlFor={`trade-picker-${runId}`} className="block font-medium">Inspect a trade</label><Select value={String(selected)} onValueChange={value => setSelected(Number(value))}><SelectTrigger id={`trade-picker-${runId}`} className="w-full min-w-0 data-[size=default]:h-11"><SelectValue /></SelectTrigger><SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">{data?.trades.map((t, i) => <SelectItem value={String(i)} key={`${t.entryTimestamp}-${i}`} className="min-h-11 whitespace-normal">#{i + 1} · {t.side === 'long' ? 'Buy / long' : 'Sell / short'} · {date(t.entryTimestamp)}</SelectItem>)}</SelectContent></Select></div><Button variant="secondary" onClick={focusTrade}>Zoom to trade</Button></div>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed"><li><strong>Setup.</strong> {setup} {data?.strategy.entryTiming && data.strategy.entryTiming.mode !== 'immediate' ? `The saved ${data.strategy.entryTiming.mode} rule then waited for ${data.strategy.entryTiming.confirmationBars} qualifying closed candle(s).` : 'This saved run entered without an extra confirmation delay.'} {protection ? `The executable signal closed on the candle starting ${date(protection.signalTimestamp)}.` : ''}</li><li><strong>Entry.</strong> {trade.side === 'long' ? 'Bought' : 'Sold short'} {trade.contracts} contracts at {price(trade.entryPrice)} USD on {date(trade.entryTimestamp)}. Entries fill at the next candle open with simulated slippage. {protection ? `Initial stop ${price(protection.stop)}; target ${price(protection.target)} USD.` : ''}</li><li><strong>Exit.</strong> {trailingActivation ? `Trailing protection became active on ${date(trailingActivation.effectiveFrom)}; the fixed target was removed. Red steps show the stop in effect for each candle. ` : ''}{exitExplanation[trade.reason]} Closed at {price(trade.exitPrice)} USD on {date(trade.exitTimestamp)}.</li><li><strong>Outcome.</strong> Net {trade.netPnl >= 0 ? 'gain' : 'loss'} {price(Math.abs(trade.netPnl))} USD, after {price(trade.fees)} USD fees and {price(trade.funding)} USD funding cost (negative funding is a credit). Slippage is included in fill prices.</li></ol>
      </div> : <p className="text-sm text-muted-foreground">No completed trades in this run. Indicators still show the historical rule conditions.</p>}
      <p className="text-xs text-muted-foreground">Candle timestamps show candle start in UTC; decisions use the completed candle. Intrabar exit times are unknown. If both stop and target are touched, the simulation prioritizes the adverse event. Analysis is reconstructed from the saved settings; markers and outcomes are the saved fills. Drag to pan; scroll to zoom. <a className="underline underline-offset-4" href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView Lightweight Charts™</a>.</p>
    </>}
  </section>;
}
