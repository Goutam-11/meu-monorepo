'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import { PaperPortfolio } from './paper-portfolio';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AgentLaunch({ runId, symbol, initialCapital, riskPct }: { runId: string; symbol: string; initialCapital: number; riskPct: number }) {
  const trpc = useTRPC(), queryClient = useQueryClient();
  const [name, setName] = useState(`${symbol} strategy`);
  const [exchangeId, setExchangeId] = useState('');
  const [mode, setMode] = useState<'PAPER' | 'LIVE'>('PAPER');
  const [created, setCreated] = useState<{ id: string; name: string; executionMode: 'PAPER' | 'LIVE'; status: string } | null>(null);
  const exchanges = useQuery(trpc.exchange.getAll.queryOptions());
  const create = useMutation(trpc.backtests.createAgent.mutationOptions({ onSuccess: agent => { setCreated(agent); void queryClient.invalidateQueries({ queryKey: trpc.agents.getAll.queryKey() }); } }));

  const deltas = exchanges.data?.filter(exchange => exchange.name.toUpperCase() === 'DELTA') ?? [];
  return <section className="neu-panel space-y-5 p-6" aria-labelledby="launch-heading">
    <div><h2 id="launch-heading" className="text-xl font-semibold">Create paused agent</h2><p className="mt-2 text-sm text-muted-foreground">Create an EMA, Donchian or mean reversion algorithm from this saved run. The agent starts paused and places no orders until you review it and start it.</p></div>
    {created ? <div className="space-y-3"><p className="font-medium">{created.name} created · {created.executionMode} · PAUSED</p><p className="text-sm text-muted-foreground">Review the agent settings before starting it. {created.executionMode === 'PAPER' ? 'Paper trading uses simulated funds and live market data.' : 'Live mode can place real orders after you start the agent.'}</p><Button asChild variant="secondary"><Link href={`/agents/${created.id}`}>Review agent</Link></Button>
      {created.executionMode === 'PAPER' ? <PaperPortfolio agentId={created.id} embedded/> : null}
    </div> : <form aria-busy={create.isPending} className="grid gap-4 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); create.mutate({ runId, exchangeId, name, mode }); }}>
      <label className="space-y-2 text-sm"><span className="block">Agent name</span><Input disabled={create.isPending} value={name} minLength={2} maxLength={100} required onChange={e => setName(e.target.value)} /></label>
      <div className="space-y-2 text-sm"><label htmlFor="launch-exchange" className="block">Owned Delta exchange</label><Select required value={exchangeId} onValueChange={setExchangeId} disabled={create.isPending || exchanges.isLoading || !deltas.length}><SelectTrigger id="launch-exchange" className="w-full min-w-0 data-[size=default]:h-11"><SelectValue placeholder={exchanges.isLoading ? 'Loading exchanges…' : deltas.length ? 'Select exchange' : 'No Delta exchange saved'} /></SelectTrigger><SelectContent position="popper" align="start" className="w-[var(--radix-select-trigger-width)]">{deltas.map(exchange => <SelectItem key={exchange.id} value={exchange.id} className="min-h-11">{exchange.displayName ? `${exchange.displayName} · ${exchange.name}` : exchange.name} · {exchange.id.slice(-6)}</SelectItem>)}</SelectContent></Select></div>
      <fieldset disabled={create.isPending} className="space-y-2 text-sm sm:col-span-2"><legend className="mb-2">Execution mode</legend><div className="grid gap-3 sm:grid-cols-2"><label className={`cursor-pointer rounded-xl border p-4 ${mode === 'PAPER' ? 'border-primary' : 'border-border'}`}><input type="radio" name="mode" value="PAPER" checked={mode === 'PAPER'} onChange={() => setMode('PAPER')} className="mr-2"/>Paper <span className="mt-1 block text-xs text-muted-foreground">Simulated funds, live market data, no real orders.</span></label><label className={`cursor-pointer rounded-xl border p-4 ${mode === 'LIVE' ? 'border-destructive' : 'border-border'}`}><input type="radio" name="mode" value="LIVE" checked={mode === 'LIVE'} onChange={() => setMode('LIVE')} className="mr-2"/>Live <span className="mt-1 block text-xs text-muted-foreground">Can place real orders after you start the agent. Requires saved Delta credentials.</span></label></div></fieldset>
      <div className="rounded-xl border border-border p-4 text-sm"><span className="block text-xs text-muted-foreground">Initial capital from saved run</span>{initialCapital.toLocaleString('en-US')} USD</div>
      <div className="rounded-xl border border-border p-4 text-sm"><span className="block text-xs text-muted-foreground">Risk per trade from saved run</span>{riskPct}%</div>
      {mode === 'LIVE' ? <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2">Live sizing caps loss at the native stop including buffered costs, total margin usage and leveraged exposure. Delta contract minimums and margin tiers can still prevent an entry. Start verifies and prepares the saved isolated leverage. Different tickers can run together. Account-wide margin-mode changes require other live agents to be paused; open exposure can prevent settings changes.</p> : null}
      {create.isError ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{create.error.message}</p> : null}
      {exchanges.isError ? <p role="alert" className="text-sm text-destructive sm:col-span-2">Could not load exchanges. <Button type="button" variant="link" onClick={() => exchanges.refetch()}>Retry</Button></p> : null}
      <p className="text-xs text-muted-foreground sm:col-span-2">Exchange credentials stay on the server. They are never displayed in this form. Creation does not activate the agent.</p>
      <div className="sm:col-span-2"><Button type="submit" disabled={create.isPending || exchanges.isLoading || !exchangeId}>{create.isPending ? 'Creating paused agent…' : `Create ${mode.toLowerCase()} agent, paused`}</Button></div>
    </form>}
  </section>;
}
