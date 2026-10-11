'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { AccountRiskLimits } from '../../../../../shared/trading/accountRisk';

const riskFields = [
  ['maxOpenPositions', 'Account open positions', 100, 1],
  ['maxMarginPct', 'Account margin (%)', 100, 0.1],
  ['maxDailyLossPct', 'Account daily loss (%)', 100, 0.1],
  ['maxNotionalMultiple', 'Account exposure / equity', 20, 0.1],
] as const;

function AccountRiskForm({ exchangeId, initial }: {
  exchangeId: string;
  initial: AccountRiskLimits;
}) {
  const [limits, setLimits] = useState(initial);
  const trpc = useTRPC();
  const cache = useQueryClient();
  const save = useMutation(trpc.exchange.updateAccountRisk.mutationOptions({
    onSuccess: async () => {
      await cache.invalidateQueries(trpc.exchange.executionState.queryOptions({ id: exchangeId }));
      toast.success("Account limits saved");
    },
  }));

  return (
    <form className="space-y-4" onSubmit={event => {
      event.preventDefault();
      save.mutate({ id: exchangeId, limits });
    }}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {riskFields.map(([key, label, max, step]) => (
          <div className="space-y-2" key={key}>
            <label htmlFor={`account-${exchangeId}-${key}`} className="text-sm font-medium">
              {label}
            </label>
            <Input
              id={`account-${exchangeId}-${key}`}
              type="number" required min={step} max={max} step={step}
              value={limits[key]}
              onChange={event => setLimits({ ...limits, [key]: Number(event.target.value) })}
            />
          </div>
        ))}
      </div>
      <p className="max-w-[72ch] text-sm leading-relaxed text-muted-foreground">
        These limits apply to the whole broker account, including other agents and
        manual exposure. Margin and exposure use current USD settlement equity.
        Daily loss uses the smaller of current equity and the first observed equity
        that market day. Per-agent limits still apply. Pause all live agents on this
        account before saving.
      </p>
      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? 'Saving account limits…' : 'Save account limits'}
      </Button>
      {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
    </form>
  );
}

export function AccountExecutionPanel({ exchangeId }: { exchangeId: string }) {
  const trpc = useTRPC();
  const query = useQuery(trpc.exchange.executionState.queryOptions(
    { id: exchangeId }, { refetchInterval: 15000 },
  ));
  if (query.isPending) {
    return (
      <div className="page-shell pt-0" aria-busy="true" aria-label="Loading account execution state">
        <Skeleton className="h-28" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="page-shell pt-0 space-y-3">
        <p role="alert" className="text-sm text-destructive">Could not load account execution state.</p>
        <Button variant="secondary" onClick={() => query.refetch()}>Retry</Button>
      </div>
    );
  }
  const data = query.data;

  return (
    <div className="page-shell pt-0">
      <section className="neu-panel space-y-6 p-6 sm:p-8" aria-labelledby="account-execution-heading">
        <div className="space-y-2">
          <h2 id="account-execution-heading" className="section-title">Account execution and ownership</h2>
          <p className="max-w-[72ch] text-sm leading-relaxed text-muted-foreground">
            Meu tracks orders and position ownership for supported crypto LLM and Delta algorithm agents.
            These records show the last worker verification; the live exchange portfolio
            above remains authoritative, especially while agents are paused.
          </p>
        </div>
        {!data.initialized && (
          <p className="text-sm text-muted-foreground">
            Tracking initializes when you save account limits or next start a live agent.
            The initial limits below are defaults, not a risk assessment of your account.
          </p>
        )}
        <details>
          <summary className="min-h-11 cursor-pointer py-2 font-medium focus-visible:outline-2 focus-visible:outline-ring">
            Shared account risk limits
          </summary>
          <div className="pt-4">
            <AccountRiskForm
              key={`${exchangeId}:${JSON.stringify(data.limits)}`}
              exchangeId={exchangeId} initial={data.limits}
            />
          </div>
        </details>
        <div className="space-y-3">
          <h3 className="font-semibold">Position owners</h3>
          {!data.positions.length ? (
            <p className="text-sm text-muted-foreground">
              No active Meu-owned position records. Manual or older positions are not automatically adopted.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm tabular-nums">
                <caption className="sr-only">Managed position ownership from the last worker reconciliation</caption>
                <thead><tr>
                  {['Ticker', 'Owner', 'State', 'Side / contracts', 'Margin (USD)', 'Last verified'].map(heading => (
                    <th key={heading} className="p-3 text-xs font-medium text-muted-foreground">{heading}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {data.positions.map(position => (
                    <tr key={position.symbol} className="border-t border-border">
                      <td className="p-3">{position.symbol}</td>
                      <td className="p-3">
                        <Link className="underline underline-offset-4" href={`/agents/${position.agentId}`}>
                          {position.agentName}
                        </Link>
                      </td>
                      <td className={`p-3 ${position.state === 'REVIEW_REQUIRED' ? 'text-destructive' : ''}`}>
                        {position.state.replaceAll('_', ' ')}
                      </td>
                      <td className="p-3">{position.side ?? '—'} / {position.contracts ?? '—'}</td>
                      <td className="p-3">{position.collateral ?? '—'}</td>
                      <td className="whitespace-nowrap p-3">
                        {position.lastVerifiedAt ? new Date(position.lastVerifiedAt).toLocaleString() : 'Awaiting verification'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold">Recent managed orders</h3>
          {!data.orders.length ? (
            <p className="text-sm text-muted-foreground">Orders submitted through the new ownership layer will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm tabular-nums">
                <caption className="sr-only">Latest 50 managed order submissions and last observed fill state</caption>
                <thead><tr>
                  {['Ticker / order', 'Owner', 'Action', 'Submission / broker state', 'Filled / remaining'].map(heading => (
                    <th className="p-3 text-xs font-medium text-muted-foreground" key={heading}>{heading}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {data.orders.map(order => (
                    <tr className="border-t border-border" key={order.clientOrderId}>
                      <td className="p-3">
                        {order.symbol}<br />
                        <span className="text-xs text-muted-foreground">{order.brokerOrderId ?? 'Not confirmed'}</span>
                      </td>
                      <td className="p-3">{order.agentName}</td>
                      <td className="p-3">{order.reduceOnly ? 'Reduce' : 'Entry'} · {order.side}</td>
                      <td className="p-3">{order.state} / {order.brokerStatus ?? 'Not verified'}</td>
                      <td className="p-3">{order.filled ?? '—'} / {order.remaining ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <Button asChild variant="secondary"><Link href={`/exchanges/${exchangeId}/reconciliation`}>Inspect account reconciliation</Link></Button>
        <Link href="/help#account-ownership" className="inline-block text-sm font-medium underline underline-offset-4">
          How shared limits and position ownership work
        </Link>
      </section>
    </div>
  );
}
