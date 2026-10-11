'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC, api } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import { TickerPicker } from '@/features/markets/components/ticker-picker';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EntityPagination } from '@/components/entityComponents';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Download, FlaskConical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DEFAULT_FEE_BUFFER_BPS, DEFAULT_SLIPPAGE_BUFFER_BPS } from '../../../../../shared/trading/executionCosts';
import { backtestInputSchema } from '../validation';
import { resolveDailyLossLimitPct } from '../daily-loss';
import { AgentLaunch } from './agent-launch';
import { BacktestPriceChart } from './backtest-price-chart';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/trpc/routers/_app';
type RouterOutputs = inferRouterOutputs<AppRouter>;
type Run = RouterOutputs['backtests']['get'];
const percent = (n: number) => `${n.toFixed(2)}%`;
const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const utc = (n: number) => new Date(n * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
function BacktestSelect({ name, label, options, defaultValue, value, onValueChange, disabled }: {
  name: string; label: string; options: { value: string; label: string }[];
  defaultValue?: string; value?: string; onValueChange?: (value: string) => void; disabled: boolean;
}) {
  return <div className="space-y-2 text-sm">
    <label htmlFor={name} className="block">{label}</label>
    <Select name={name} defaultValue={defaultValue} value={value} onValueChange={onValueChange} disabled={disabled} required>
      <SelectTrigger id={name} className="w-full min-w-0 data-[size=default]:h-11"><SelectValue /></SelectTrigger>
      <SelectContent position="popper" align="start" className="w-[var(--radix-select-trigger-width)]">
        {options.map(option => <SelectItem key={option.value} value={option.value} className="min-h-11 whitespace-normal">{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>;
}
function Numeric({ name, label, value, min = 0, max = 100, step = 'any' }: {
    name: string;
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: string;
}) {
    return <label className="space-y-2 text-sm" htmlFor={name}><span className="block">{label}</span><Input id={name} name={name} type="number" defaultValue={value} min={min} max={max} step={step} required/></label>;
}
function RunResults({ run }: {
    run: Run;
}) {
    const r = run.result;
    const savedSettings = Object.entries({ ...run.config.strategy, ...run.config.simulation }).flatMap(([key, value]) => value && typeof value === 'object' ? Object.entries(value).map(([nestedKey, nestedValue]) => [`${key} ${nestedKey}`, nestedValue]) : [[key, value]]);
    const [tradePage, setTradePage] = useState(1);
    return <section className="neu-panel space-y-6 p-6" aria-labelledby="result-heading">
    <div><h2 id="result-heading" className="text-xl font-semibold">{run.symbol} · {run.timeframe}</h2><p className="text-sm text-muted-foreground">{run.config.strategy.id} · {run.config.periodRole} · {utc(run.config.start)} to {utc(run.config.end)}</p></div>
    <dl className="grid grid-cols-2 gap-5 lg:grid-cols-4 tabular-nums">{[['Net return', percent(r.netReturnPct)], ['Max drawdown', percent(r.maxDrawdownPct)], ['Closed trades', String(r.tradeCount)], ['Profit factor', r.profitFactor === null ? 'n/a' : r.profitFactor.toFixed(2)]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-xl font-semibold">{value}</dd></div>)}</dl>
    <BacktestPriceChart runId={run.id} strategyId={run.config.strategy.id} />
    {r.executionDiagnostics && <details><summary className="min-h-11 cursor-pointer text-sm font-medium">Why entries were skipped</summary><p className="text-sm text-muted-foreground">{r.executionDiagnostics.entries} entries accepted. Counts below describe candle evaluations, not distinct opportunities; a waiting setup can appear more than once.</p><dl className="mt-3 grid grid-cols-2 gap-3 text-sm">{Object.entries(r.executionDiagnostics.skips).map(([reason,count])=><div key={reason}><dt className="text-muted-foreground">{reason.replaceAll('_',' ')}</dt><dd>{count}</dd></div>)}</dl></details>}
    <h3 className="font-semibold">How account value changed</h3>
    <div className="h-72 min-w-0" role="img" aria-label={`Candle-close equity compared with a price-only buy-and-hold benchmark. Final equity ${money(r.finalEquity)} USD; benchmark return ${percent(r.benchmarkReturnPct)}.`}>
      <ResponsiveContainer width="100%" height="100%"><LineChart data={r.equityCurve}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="timestamp" tickFormatter={t => new Date(t * 1000).toISOString().slice(5, 10)} minTickGap={35} stroke="var(--muted-foreground)"/><YAxis width={65} domain={['auto', 'auto']} stroke="var(--muted-foreground)" tickFormatter={n => Math.round(n).toLocaleString()}/><Tooltip labelFormatter={t => utc(Number(t))} contentStyle={{ background: 'var(--popover)', borderColor: 'var(--border)', borderRadius: 12 }}/><Legend /><Line name="Strategy equity (USD)" dataKey="equity" type="linear" stroke="var(--success)" dot={false} isAnimationActive={false}/><Line name="Price-only benchmark" dataKey="benchmark" type="linear" stroke="var(--warning)" dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer>
    </div>
    <p className="text-sm text-muted-foreground tabular-nums">Final equity {money(r.finalEquity)} USD · Fees {money(r.totalFees)} USD · Funding {money(r.totalFunding)} USD · Liquidations {r.liquidations} · Win rate {percent(r.winRatePct)}</p>
    <p className="text-sm leading-relaxed text-muted-foreground">Before fees and funding: {money(r.finalEquity - run.config.simulation.initialCapital + r.totalFees + r.totalFunding)} USD. After those costs: {money(r.finalEquity - run.config.simulation.initialCapital)} USD. Both figures already include simulated slippage; compare costs with the edge before increasing trade frequency.</p>
    <details><summary className="min-h-11 cursor-pointer text-sm font-medium">Saved parameters and risk settings</summary><dl className="grid grid-cols-2 gap-4 text-sm tabular-nums">{savedSettings.map(([key, value]) => <div key={String(key)}><dt className="text-xs text-muted-foreground">{String(key).replace(/([A-Z])/g, ' $1').replace(/Pct/g, ' (%)').replace(/Bps/g, ' (bps)')}</dt><dd>{String(value)}</dd></div>)}</dl><p className="mt-3 text-xs text-muted-foreground">Strategy version {r.strategyVersion}. Capital, fees and funding use USD wallet units; percentage fields are in percent.</p></details><details><summary className="min-h-11 cursor-pointer text-sm font-medium">Simulation assumptions and limits</summary><ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{run.warnings.map(w => <li key={w}>{w}</li>)}</ul></details>
    <div><h3 className="mb-3 font-semibold">Trade history</h3>{!r.trades.length ? <p className="text-sm text-muted-foreground">No completed trades. Try a longer period or inspect the strategy settings.</p> : <><div className="overflow-x-auto"><table className="w-full text-left text-xs tabular-nums"><caption className="sr-only">Completed trades, including costs and exit reasons</caption><thead><tr>{['Side', 'Entry (UTC)', 'Exit (UTC)', 'Contracts', 'Net P&L (USD)', 'Exit reason'].map(h => <th key={h} className="whitespace-nowrap p-2 font-medium text-muted-foreground">{h}</th>)}</tr></thead><tbody>{r.trades.slice((tradePage - 1) * 10, tradePage * 10).map((t, i) => <tr key={`${t.entryTimestamp}-${i}`} className="border-t border-border"><td className="p-2">{t.side}</td><td className="whitespace-nowrap p-2">{utc(t.entryTimestamp)}</td><td className="whitespace-nowrap p-2">{utc(t.exitTimestamp)}</td><td className="p-2">{t.contracts}</td><td className="p-2">{money(t.netPnl)}</td><td className="p-2">{t.reason}</td></tr>)}</tbody></table></div><EntityPagination page={tradePage} totalPages={Math.ceil(r.trades.length / 10)} onPageChange={setTradePage}/></>}</div>
  </section>;
}
export function BacktestWorkspace({ initialStrategy = 'ema', initialRunId = null }: { initialStrategy?: 'ema' | 'donchian' | 'meanReversion'; initialRunId?: string | null }) {
    const trpc = useTRPC(), queryClient = useQueryClient();
    const [strategy, setStrategy] = useState<string>(initialStrategy), [page, setPage] = useState(1), [active, setActive] = useState<string | null>(initialRunId), [selected, setSelected] = useState<string[]>([]), [error, setError] = useState(''), [exporting, setExporting] = useState(false);
    const [symbol,setSymbol]=useState("BTCUSD");
    const [risk, setRisk] = useState(1);
    const [autoDailyLoss, setAutoDailyLoss] = useState(true);
    const [customDailyLoss, setCustomDailyLoss] = useState(3);
    const catalog = useQuery(trpc.backtests.catalog.queryOptions());
    const history = useQuery(trpc.backtests.list.queryOptions({ page }));
    const run = useMutation(trpc.backtests.run.mutationOptions({ onSuccess: data => { setActive(data.id); setPage(1); void queryClient.invalidateQueries({ queryKey: trpc.backtests.list.queryKey() }); }, onError: err => setError(err.message) }));
    const detail = useQuery(trpc.backtests.get.queryOptions({ id: active ?? '' }, { enabled: !!active && active !== run.data?.id }));
    const comparisons = useQueries({ queries: selected.map(id => trpc.backtests.get.queryOptions({ id })) });
    const remove = useMutation(trpc.backtests.delete.mutationOptions({ onSuccess: (_, input) => { setPage(1); if (active === input.id)
            setActive(null); setSelected(ids => ids.filter(id => id !== input.id)); void queryClient.invalidateQueries({ queryKey: trpc.backtests.list.queryKey() }); }, onError: err => setError(err.message) }));
    const current = active === run.data?.id ? run.data : detail.data;
    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError('');
        const f = new FormData(e.currentTarget), n = (name: string) => Number(f.get(name));
        const input = { symbol: String(f.get('symbol')), timeframe: String(f.get('timeframe')), start: Date.parse(String(f.get('start')) + 'T00:00:00Z') / 1000, end: Date.parse(String(f.get('end')) + 'T00:00:00Z') / 1000, periodRole: String(f.get('periodRole')), strategy: { id: strategy, fastPeriod: n('fastPeriod'), slowPeriod: n('slowPeriod'), lookback: n('lookback'), atrPeriod: n('atrPeriod'), stopAtr: n('stopAtr'), rewardRisk: n('rewardRisk'), entryTiming: {mode: String(f.get('entryMode')), confirmationBars: n('confirmationBars'), maxWaitBars: n('maxWaitBars'), cooldownBars: n('cooldownBars')} }, simulation: { initialCapital: n('initialCapital'), leverage: n('leverage'), leverageMode:String(f.get('leverageMode')), ...(String(f.get('leverageMode')) === 'AUTO' ? { autoSizing: String(f.get('autoSizing')) } : {}), maxExposureMultiple:n('maxNotionalPct')/100, riskPerTradePct: n('riskPerTradePct'), maxMarginPct: n('maxMarginPct'), feeBps: n('feeBps'), slippageBps: n('slippageBps'), fundingRatePct8h: n('fundingRatePct8h'), maxTradesPerDay: n('maxTradesPerDay'), maxPositionsOpenedPerDay: n('maxPositionsOpenedPerDay'), maxDailyLossPct: n('maxDailyLossPct'), direction: String(f.get('direction')) } };
        input.simulation.maxDailyLossPct = resolveDailyLossLimitPct(autoDailyLoss, input.simulation.riskPerTradePct, customDailyLoss);
        const parsed = backtestInputSchema.safeParse(input);
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? 'Check the backtest settings.');
            return;
        }
        run.mutate(parsed.data);
    }
    async function download() {
        if (!active)
            return;
        setExporting(true);
        setError('');
        try {
            const data = await api.backtests.export.query({ id: active });
            const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `meu-backtest-${active}.json`;
            link.click();
            URL.revokeObjectURL(url);
        }
        catch {
            setError('Could not export this run. Please try again.');
        }
        finally {
            setExporting(false);
        }
    }
    const defaultEnd = new Date().toISOString().slice(0, 10), defaultStart = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    return <div className="flex min-h-full flex-col gap-8 p-6 lg:p-10">
    <header><h1 className="text-3xl font-semibold tracking-tight">Strategies</h1><p className="mt-2 max-w-3xl text-muted-foreground">Test rules on Delta India history. Compare results before choosing a strategy.</p><p className="mt-3 text-sm text-muted-foreground">Research simulation using public data. Funding and liquidation are approximations. No orders are placed. <Link href="/help#backtesting" className="font-medium underline underline-offset-4">Backtesting guide</Link></p></header>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <div className="grid min-w-0 items-start gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="neu-panel p-6" aria-labelledby="configure-heading"><h2 id="configure-heading" className="mb-5 text-xl font-semibold">Configure a backtest</h2>
        <form onSubmit={submit} className="space-y-5"><fieldset disabled={run.isPending} className="space-y-5">
          <BacktestSelect name="strategy" label="Trading algorithm" value={strategy} onValueChange={setStrategy} disabled={run.isPending} options={[{ value: "ema", label: "EMA crossover" }, { value: "donchian", label: "Donchian breakout" }, { value: "meanReversion", label: "Bollinger + RSI" }]} />
          <p className="text-xs leading-relaxed text-muted-foreground">{catalog.data?.find(s => s.id === strategy)?.description}</p>
          <div className="grid grid-cols-2 gap-4"><label htmlFor="symbol" className="space-y-2 text-sm"><span className="block">Delta symbol</span><TickerPicker id="symbol" name="symbol" value={symbol} onChange={setSymbol} venue="DELTA" scope="CRYPTO" disabled={run.isPending}/></label><BacktestSelect name="timeframe" label="Timeframe" defaultValue="1h" disabled={run.isPending} options={["15m", "1h", "4h", "1d"].map(value => ({ value, label: value }))} /></div>
          <div className="grid grid-cols-2 gap-4"><label htmlFor="start" className="space-y-2 text-sm"><span className="block">Start (UTC)</span><Input type="date" id="start" name="start" defaultValue={defaultStart} max={defaultEnd} required/></label><label htmlFor="end" className="space-y-2 text-sm"><span className="block">End, exclusive (UTC)</span><Input type="date" id="end" name="end" defaultValue={defaultEnd} max={defaultEnd} required/></label></div>
          <div className="grid grid-cols-2 gap-4"><Numeric name="initialCapital" label="Test capital (USD)" value={1000} min={1} max={1e8}/><label htmlFor="riskPerTradePct" className="space-y-2 text-sm"><span className="block">Risk at stop (%)</span><Input id="riskPerTradePct" name="riskPerTradePct" type="number" value={risk} onChange={e => setRisk(Number(e.target.value))} min={0.01} max={10} step="0.01" required/></label></div>
          <BacktestSelect name="entryMode" label="When to enter" defaultValue="confirm" disabled={run.isPending} options={[{value:'confirm',label:'Wait for follow-through'},{value:'retest',label:'Wait for a retest'},{value:'immediate',label:'Enter on signal'}]}/>
          <p className="text-xs leading-relaxed text-muted-foreground">Follow-through waits for one later close in the signal direction. Retest waits for a touch and reclaim of the setup level. Both expire after three candles. A two-candle rest after exits reduces rapid re-entry; protective exits never wait.</p>
          <div className="neu-inset rounded-2xl p-4 text-xs leading-relaxed text-muted-foreground"><strong className="text-foreground">Meu handles the details.</strong> ATR sets stop distance and quantity fits your {Number.isFinite(risk) ? risk : 0}% loss budget plus costs. Initial defaults: 25% margin, 2× exposure and automatic leverage up to 3× to fund the permitted size. Daily loss limit: {resolveDailyLossLimitPct(autoDailyLoss, risk, customDailyLoss).toFixed(2)}%. Indicator defaults: EMA 20/50 or 20-candle bands, ATR 14, stop 2× ATR, target 1.5× stop. Advanced overrides replace these defaults; the saved run uses your submitted settings.</div>
          <details className="space-y-5"><summary className="min-h-11 cursor-pointer text-sm font-semibold">Advanced settings · indicators, costs and limits</summary>
          <BacktestSelect name="periodRole" label="Period purpose" defaultValue="research" disabled={run.isPending} options={[{ value: "research", label: "Research / parameter selection" }, { value: "validation", label: "Unseen validation period" }]} />
          <div className="grid grid-cols-2 gap-4">{strategy === 'ema' ? <><Numeric name="fastPeriod" label="Fast EMA" value={20} min={2} max={499} step="1"/><Numeric name="slowPeriod" label="Slow EMA" value={50} min={3} max={500} step="1"/><input type="hidden" name="lookback" value="20"/></> : <><input type="hidden" name="fastPeriod" value="20"/><input type="hidden" name="slowPeriod" value="50"/><Numeric name="lookback" label={strategy === 'donchian' ? 'Breakout lookback' : 'Bollinger band period'} value={20} min={2} max={500} step="1"/></>}<Numeric name="atrPeriod" label="ATR period" value={14} min={2} max={500} step="1"/><Numeric name="stopAtr" label="Stop × ATR" value={2} min={0.1} max={10}/><Numeric name="rewardRisk" label="Reward / risk" value={1.5} min={0.1} max={10}/></div>
          <h3 className="font-semibold">Collateral and exposure</h3><BacktestSelect name="leverageMode" label="Leverage method" defaultValue="AUTO" disabled={run.isPending} options={[{value:'FIXED',label:'Fixed leverage'},{value:'AUTO',label:'Automatic within ceiling'}]}/><BacktestSelect name="autoSizing" label="Automatic sizing objective" defaultValue="TARGET_RISK" disabled={run.isPending} options={[{value:'TARGET_RISK',label:'Fund the permitted position size'},{value:'MINIMUM_ORDER',label:'Use the first tradable leverage'}]}/><p className="text-xs text-muted-foreground">In automatic mode, leverage is the ceiling. Risk at Stop is a loss budget; Maximum margin controls collateral.</p><div className="grid grid-cols-2 gap-4"><Numeric name="leverage" label="Leverage ceiling / fixed leverage" value={3} min={1} max={20}/><Numeric name="maxMarginPct" label="Maximum margin (%)" value={25} min={0.01} max={100} step="0.01"/><Numeric name="maxNotionalPct" label="Gross notional (% allocation)" value={200} min={1} max={2000}/></div>
          <BacktestSelect name="direction" label="Allowed direction" defaultValue="both" disabled={run.isPending} options={[{ value: "both", label: "Long and short" }, { value: "long", label: "Long only" }, { value: "short", label: "Short only" }]} />
          <details><summary className="min-h-11 cursor-pointer text-sm font-medium">Costs and daily limits</summary><div className="grid grid-cols-2 gap-4 pt-3"><Numeric name="feeBps" label="Fee assumption per side (bps)" value={DEFAULT_FEE_BUFFER_BPS}/><Numeric name="slippageBps" label="Slippage assumption per side (bps)" value={DEFAULT_SLIPPAGE_BUFFER_BPS}/><Numeric name="fundingRatePct8h" label="Funding assumption (% / 8h)" value={0} min={-1} max={1}/><div className="col-span-2 space-y-3"><label className="flex min-h-11 items-center gap-3 text-sm" htmlFor="autoDailyLoss"><Checkbox id="autoDailyLoss" checked={autoDailyLoss} onCheckedChange={checked => setAutoDailyLoss(checked === true)}/><span>Automatic daily loss limit (3× risk, capped at 100%)</span></label><label className="space-y-2 text-sm" htmlFor="maxDailyLossPct"><span className="block">Custom daily loss limit (%)</span><Input id="maxDailyLossPct" name="maxDailyLossPct" type="number" value={customDailyLoss} onChange={e => setCustomDailyLoss(Number(e.target.value))} min={0.01} max={100} step="0.01" required disabled={autoDailyLoss}/></label></div><Numeric name="maxTradesPerDay" label="Entry orders per day" value={10} min={1} max={1000} step="1"/><Numeric name="maxPositionsOpenedPerDay" label="New positions per day" value={5} min={1} max={1000} step="1"/></div><p className="mt-3 text-xs text-muted-foreground">New simulations start with conservative planning buffers; actual exchange fees and slippage vary. Override these assumptions for this simulation as needed. Daily counters reset at India midnight (Asia/Kolkata); risk exits remain allowed. Funding is a constant assumption, not historical data. 1 bps = 0.01%.</p></details>
          <div className="grid grid-cols-2 gap-4"><Numeric name="confirmationBars" label="Follow-through closes" value={1} min={1} max={5} step="1"/><Numeric name="maxWaitBars" label="Setup expires after candles" value={3} min={1} max={20} step="1"/><Numeric name="cooldownBars" label="Candles to rest after exit" value={2} min={0} max={20} step="1"/></div>
          <p className="text-xs text-muted-foreground">Custom advanced values are saved exactly as configured. The automatic daily-loss option always follows Risk at stop, whether this panel is open or closed. Slower entries can miss trends; fewer trades do not guarantee profit.</p></details>
        </fieldset><Button type="submit" className="w-full" disabled={run.isPending}>{run.isPending ? 'Fetching and simulating…' : 'Run and save backtest'}</Button><p className="text-xs text-muted-foreground">At most 10,000 candles and 100 saved runs. No exchange keys required.</p></form>
      </section>
      <div className="min-w-0 space-y-4" aria-live="polite">{run.isPending || detail.isFetching ? <div className="neu-panel space-y-4 p-6" aria-busy="true" aria-label="Loading backtest results"><Skeleton className="h-7 w-40"/><Skeleton className="h-20 w-full"/><Skeleton className="h-72 w-full"/></div> : current ? <><div className="flex justify-end"><Button variant="secondary" onClick={download} disabled={exporting}><Download aria-hidden="true"/>{exporting ? 'Exporting…' : 'Export full run'}</Button></div><RunResults key={`results:${current.id}`} run={current}/><AgentLaunch key={`launch:${current.id}`} runId={current.id} symbol={current.symbol} initialCapital={current.config.simulation.initialCapital} riskPct={current.config.simulation.riskPerTradePct}/></> : detail.isError ? <p role="alert" className="text-destructive">Could not load this run. <Button variant="link" onClick={() => detail.refetch()}>Try again</Button></p> : <section className="neu-panel p-8"><FlaskConical aria-hidden="true" className="mb-4 size-8 text-muted-foreground"/><h2 className="text-xl font-semibold">Find a strategy worth testing further</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Configure a backtest to see equity, drawdown, costs and individual trades. Then compare it with another strategy on the same period and an unseen validation period.</p><p className="mt-4 text-sm text-muted-foreground">Historical results do not establish future profitability. You can create a paused paper or live crypto algorithm from a saved run and review it before starting.</p></section>}</div>
    </div>
    <section className="space-y-4" aria-labelledby="history-heading"><h2 id="history-heading" className="text-xl font-semibold">Saved runs</h2><p className="text-sm text-muted-foreground">Select up to three runs to compare. Inspect dates and assumptions before comparing returns.</p>
      {history.isFetching ? <Skeleton className="h-20 w-full"/> : history.isError ? <p role="alert">Could not load saved runs. <Button variant="link" onClick={() => history.refetch()}>Try again</Button></p> : !history.data?.runs.length ? <p className="text-sm text-muted-foreground">Your saved backtests will appear here after the first run.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm tabular-nums"><caption className="sr-only">Saved runs and comparison selection</caption><thead><tr>{['Compare', 'Saved (UTC)', 'Market', 'Strategy', 'Return', 'Drawdown', 'Trades', 'Actions'].map(h => <th className="p-3 text-xs font-medium text-muted-foreground" key={h}>{h}</th>)}</tr></thead><tbody>{history.data.runs.map(r => <tr key={r.id} className="border-t border-border"><td className="p-3"><label className="inline-flex min-h-11 min-w-11 items-center justify-center"><input type="checkbox" aria-label={`Compare ${r.symbol} ${r.strategyId} saved ${r.createdAt.toISOString()}`} checked={selected.includes(r.id)} disabled={!selected.includes(r.id) && selected.length >= 3} onChange={e => setSelected(ids => e.target.checked ? [...ids, r.id] : ids.filter(id => id !== r.id))}/></label></td><td className="whitespace-nowrap p-3">{r.createdAt.toISOString().slice(0, 16).replace('T', ' ')}<br /><span className="text-xs text-muted-foreground">Run {r.id.slice(-6)}</span></td><td className="whitespace-nowrap p-3">{r.symbol} · {r.timeframe}</td><td className="p-3">{r.strategyId}</td><td className="p-3">{percent(r.netReturnPct)}</td><td className="p-3">{percent(r.maxDrawdownPct)}</td><td className="p-3">{r.tradeCount}</td><td className="whitespace-nowrap p-3"><Button variant="ghost" onClick={() => setActive(r.id)}>View</Button><Button variant="ghost" className="text-destructive" disabled={remove.isPending} onClick={() => { if (window.confirm('Delete this saved backtest?'))
        remove.mutate({ id: r.id }); }}>Delete</Button></td></tr>)}</tbody></table></div>}
      {selected.length >= 2 ? <div className="neu-panel space-y-3 p-6"><h3 className="font-semibold">Compare selected runs</h3><p className="text-xs text-muted-foreground">Research/validation labels are user-selected. Overlapping periods do not provide independent validation.</p>{comparisons.some(q => q.isFetching) ? <Skeleton className="h-28 w-full"/> : comparisons.some(q => q.isError) ? <p role="alert">A selected run could not be loaded. Deselect it and try again.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs tabular-nums"><caption className="sr-only">Results with period and execution assumptions</caption><thead><tr>{['Strategy / market', 'Period / purpose', 'Parameters', 'Risk limits', 'Capital / leverage', 'Costs / funding', 'Return / drawdown', 'Trades'].map(h => <th className="p-2 text-muted-foreground" key={h}>{h}</th>)}</tr></thead><tbody>{comparisons.map(q => q.data ? <tr key={q.data.id} className="border-t border-border"><td className="p-2">{q.data.config.strategy.id} · {q.data.symbol} · {q.data.timeframe}</td><td className="whitespace-nowrap p-2">{utc(q.data.config.start)}<br />{utc(q.data.config.end)}<br />{q.data.config.periodRole}</td><td className="p-2">{q.data.config.strategy.id === 'ema' ? `EMA ${q.data.config.strategy.fastPeriod}/${q.data.config.strategy.slowPeriod}` : `Lookback ${q.data.config.strategy.lookback}`}<br />ATR {q.data.config.strategy.atrPeriod} · Stop {q.data.config.strategy.stopAtr}×<br />Reward/risk {q.data.config.strategy.rewardRisk}</td><td className="p-2">Notional {(q.data.config.simulation.maxExposureMultiple??q.data.config.simulation.leverage)*100}%<br />Margin {q.data.config.simulation.maxMarginPct}%<br />Daily loss {q.data.config.simulation.maxDailyLossPct}%<br />Entry orders {q.data.config.simulation.maxTradesPerDay} / positions {q.data.config.simulation.maxPositionsOpenedPerDay}<br />{q.data.config.simulation.direction}</td><td className="p-2">{money(q.data.config.simulation.initialCapital)} USD / {q.data.config.simulation.leverageMode==='AUTO'?'Auto ≤ ':''}{q.data.config.simulation.leverage}×<br />Risk {q.data.config.simulation.riskPerTradePct}%</td><td className="p-2">Fee {q.data.config.simulation.feeBps} bps<br />Slip {q.data.config.simulation.slippageBps} bps<br />Funding {q.data.config.simulation.fundingRatePct8h}% / 8h</td><td className="p-2">{percent(q.data.result.netReturnPct)} / {percent(q.data.result.maxDrawdownPct)}</td><td className="p-2">{q.data.result.tradeCount}</td></tr> : null)}</tbody></table></div>}</div> : null}
    </section>
    <div className="mt-auto"><EntityPagination page={page} totalPages={history.data?.totalPages ?? 1} onPageChange={setPage} disabled={history.isFetching}/></div>
  </div>;
}
