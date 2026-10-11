'use client';

import { useEffect, useRef, useState } from 'react';
import { CandlestickSeries, ColorType, createChart, HistogramSeries, LineSeries, type IChartApi, type ISeriesApi, type UTCTimestamp, type Time, type TickMarkType } from 'lightweight-charts';
import { useUISettings } from '@/components/ui-settings';
import { Button } from '@/components/ui/button';
import { chartBollinger, chartEma, chartRsi } from '../indicators';
import type { ChartCandle } from '../types';

type Series = { chart: IChartApi; candles: ISeriesApi<'Candlestick'>; volume: ISeriesApi<'Histogram'>; fast: ISeriesApi<'Line'>; slow: ISeriesApi<'Line'>; rsi: ISeriesApi<'Line'>; bands: ISeriesApi<'Line'>[] };

export function CandleChart({ candles, currency }: { candles: ChartCandle[]; currency: string }) {
  const { look } = useUISettings();
  const host = useRef<HTMLDivElement>(null);
  const series = useRef<Series | null>(null);
  const first = useRef(true);
  const [ema, setEma] = useState(true), [bollinger, setBollinger] = useState(false);
  const [hovered, setHovered] = useState<ChartCandle | null>(null);
  const candleMap = useRef(new Map<number, ChartCandle>());

  useEffect(() => {
    if (!host.current) return;
    const dark = look === 'sculpt-dark';
    const chart = createChart(host.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: dark ? '#303438' : '#e6e3df' }, textColor: dark ? '#b3b3b3' : '#62685f', attributionLogo: true },
      grid: { vertLines: { visible: false }, horzLines: { color: dark ? '#42474d' : '#d1cec8' } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, tickMarkFormatter: (time: Time, type: TickMarkType) => typeof time === 'number' ? new Date(time * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...(type >= 3 ? { hour: '2-digit', minute: '2-digit', hour12: false } : { month: 'short', day: '2-digit' }) }) : null },
      localization: { locale: 'en-IN', timeFormatter: (time: number) => new Date(time * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) },
    });
    const up = dark ? '#8cc7aa' : '#237555', down = dark ? '#f3939f' : '#b13648';
    const price = chart.addSeries(CandlestickSeries, { upColor: up, downColor: down, borderVisible: false, wickUpColor: up, wickDownColor: down, priceFormat: { type: 'price', precision: 4, minMove: 0.0001 } });
    const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false }, 1);
    const lineOptions = { lineWidth: 1 as const, priceLineVisible: false, lastValueVisible: false };
    const fast = chart.addSeries(LineSeries, { ...lineOptions, color: up, title: 'EMA 20' });
    const slow = chart.addSeries(LineSeries, { ...lineOptions, color: dark ? '#e4c777' : '#8c610f', title: 'EMA 50' });
    const bands = ['BB middle', 'BB upper', 'BB lower'].map(title => chart.addSeries(LineSeries, { ...lineOptions, color: dark ? '#b3b3b3' : '#62685f', title }));
    const rsi = chart.addSeries(LineSeries, { ...lineOptions, color: dark ? '#e4c777' : '#8c610f', title: 'RSI 14', lastValueVisible: true, autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) }, 2);
    for (const price of [30, 70]) rsi.createPriceLine({ price, color: dark ? '#777e86' : '#90958b', lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
    chart.panes()[1].setHeight(80);
    chart.panes()[2].setHeight(120);
    chart.subscribeCrosshairMove(event => {
      const bar = typeof event.time === 'number' ? candleMap.current.get(event.time) : undefined;
      setHovered(bar ?? null);
    });
    series.current = { chart, candles: price, volume, fast, slow, bands, rsi };
    first.current = true;
    return () => { series.current = null; chart.remove(); };
  }, [look]);

  useEffect(() => {
    const current = series.current;
    if (!current) return;
    candleMap.current = new Map(candles.map(c => [c.time, c]));
    const timed = <T extends { time: number }>(points: T[]) => points.map(point => ({ ...point, time: point.time as UTCTimestamp }));
    current.candles.setData(timed(candles));
    current.volume.setData(timed(candles.map(c => ({ time: c.time, value: c.volume, color: c.close >= c.open ? '#23755599' : '#b1364899' }))));
    current.fast.setData(timed(chartEma(candles, 20)));
    current.slow.setData(timed(chartEma(candles, 50)));
    current.fast.applyOptions({ visible: ema }); current.slow.applyOptions({ visible: ema });
    const bands = chartBollinger(candles);
    [bands.middle, bands.upper, bands.lower].forEach((points, i) => { current.bands[i].setData(timed(points)); current.bands[i].applyOptions({ visible: bollinger }); });
    current.rsi.setData(timed(chartRsi(candles)));
    if (first.current && candles.length) {
      current.chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, candles.length - 120), to: candles.length + 4 });
      first.current = false;
    }
  }, [candles, ema, bollinger, look]);

  const selected = hovered ? candles.find(c => c.time === hovered.time) ?? candles.at(-1) : candles.at(-1);
  const fmt = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 4 });
  return <section className="neu-panel min-w-0 overflow-hidden" aria-label="Meu candlestick chart">
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex flex-wrap gap-2"><Button size="sm" variant={ema ? 'default' : 'outline'} aria-pressed={ema} onClick={() => setEma(value => !value)}>EMA 20 / 50</Button><Button size="sm" variant={bollinger ? 'default' : 'outline'} aria-pressed={bollinger} onClick={() => setBollinger(value => !value)}>Bollinger 20 / 2</Button><Button size="sm" variant="outline" onClick={() => series.current?.chart.timeScale().fitContent()}>Fit history</Button></div>
      <span className="text-xs text-muted-foreground">Volume · RSI 14 · time shown in IST</span>
    </div>
    {selected && <p className="flex min-h-10 flex-wrap gap-x-4 gap-y-1 px-4 pb-3 font-mono text-xs tabular-nums"><span>O {fmt(selected.open)}</span><span>H {fmt(selected.high)}</span><span>L {fmt(selected.low)}</span><span>C {fmt(selected.close)} {currency}</span><span>V {fmt(selected.volume)}</span></p>}
    <div ref={host} className="h-[70vh] min-h-[480px] max-h-[800px] w-full" />
    <p className="px-4 py-3 text-xs text-muted-foreground">Drag to pan; scroll or pinch to zoom. Indicators describe the displayed history and do not change agent signals. Charting by <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">TradingView Lightweight Charts™</a>.</p>
  </section>;
}
