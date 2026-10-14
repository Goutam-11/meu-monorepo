'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import type { Agent } from '@/generated/prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function EntryPreview({ agent }: { agent: Agent }) {
  const trpc = useTRPC();
  const [symbol, setSymbol] = useState(agent.market.symbols[0] ?? '');
  const [side, setSide] = useState<'buy'|'sell'>('buy');
  const [stop, setStop] = useState('1');
  const config = agent.strategyConfig as { sizing?: { mode?: string } } | null;
  const supported = agent.status === 'PAUSED' && agent.type === 'CRYPTO' && agent.executionMode !== 'PAPER' && (agent.strategy === 'ALGO_TRADING' && agent.executionMode === 'LIVE' || agent.strategy === 'LLM_TRADING' && config?.sizing?.mode === 'STOP_LOSS');
  const preview = useQuery(trpc.agents.entryPreview.queryOptions({ agentId: agent.id, symbol, side, stopDistancePct: Number(stop) }, {
    enabled: false, retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false,
  }));
  if (!supported) return null;
  const valid = Number(stop) > 0 && Number(stop) <= 50;
  const result = preview.data;
  const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 8 });
  return <Card>
    <CardHeader><CardTitle>Fresh entry sizing preview</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Read-only what-if using saved limits and fresh broker reads. No settings, orders, reservations or balances are changed. {agent.strategy === 'ALGO_TRADING' ? 'Enter a hypothetical stop distance; this does not represent the current ATR or an entry signal.' : 'Enter a side and hypothetical native stop distance.'}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2"><Label htmlFor="preview-symbol">Saved ticker</Label><Select value={symbol} onValueChange={setSymbol}><SelectTrigger id="preview-symbol" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{agent.market.symbols.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="preview-side">Scenario side</Label><Select value={side} onValueChange={value => setSide(value as 'buy'|'sell')}><SelectTrigger id="preview-side" className="w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="buy">Long / buy</SelectItem><SelectItem value="sell">Short / sell</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="preview-stop">Stop distance (%)</Label><Input id="preview-stop" type="number" min="0.001" max="50" step="0.1" value={stop} onChange={event => setStop(event.target.value)} /></div>
      </div>
      <Button type="button" variant="secondary" disabled={!valid || preview.isFetching} onClick={() => { void preview.refetch(); }}>{preview.isFetching ? 'Reading broker snapshot…' : 'Calculate fresh preview'}</Button>
      <div aria-live="polite" className="space-y-3 text-sm">
        {preview.error && <p className="text-destructive">{preview.error.message}</p>}
        {result && <>
          <p className="font-medium">{result.provisional ? 'Provisional sizing scenario' : 'Sizing scenario'}</p>
          <p className="text-muted-foreground">Checked {new Date(result.timestamp).toLocaleString()}. Snapshot only; Start and entry checks can change the result.</p>
          {!result.ok && <p className="text-destructive">{result.message}</p>}
          {result.scenario && <p>Entry {number(result.scenario.entryPrice)} · Stop {number(result.scenario.stopPrice)} {agent.capital.currency}</p>}
          {result.sizing && <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries({ 'Quantity (contracts)': result.sizing.amount, 'Notional': result.sizing.notional, 'Margin with costs': result.sizing.marginRequired, 'Estimated loss at stop': result.sizing.riskAtStop, 'Assumed leverage': result.sizing.selectedLeverage }).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{number(value)}{label === 'Assumed leverage' ? '×' : label === 'Quantity (contracts)' ? '' : ` ${agent.capital.currency}`}</dd></div>)}
            </dl>
            <p>Binding constraint: {result.sizing.limitingConstraint}.</p>
            {result.sizing.diagnostics && <p>Objective: {result.sizing.diagnostics.autoSizing === 'TARGET_RISK' ? 'Target risk' : 'Minimum viable order (legacy)'}. Target {number(result.sizing.diagnostics.targetAmount)} contracts; funded {number(result.sizing.diagnostics.fundedAmount)}. {result.sizing.diagnostics.targetFunded ? 'Target funded within current limits.' : 'Current limits fund less than the target.'}</p>}
          </>}
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{result.notes.map(note => <li key={note}>{note}</li>)}</ul>
        </>}
      </div>
    </CardContent>
  </Card>;
}
