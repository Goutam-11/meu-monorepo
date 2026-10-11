'use client';

import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useTRPC } from '@/trpc/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const issueTitles: Record<string,string> = {
  SUBMISSION_FOUND:'Unrecorded broker order', ORDER_UNKNOWN:'Order could not be verified',
  OWNER_REVIEW:'Ownership needs review', INCOMPLETE_HISTORY:'Incomplete managed history',
  QUANTITY_MISMATCH:'Position quantity changed', FLAT_WITH_PENDING:'Flat ticker with pending orders',
  FLAT_OWNER:'Ticker is still reserved', UNOWNED_POSITION:'Unowned position', UNOWNED_ORDER:'Unowned pending order',
};

export function ReconciliationWorkspace({exchangeId}:{exchangeId:string}) {
  const trpc = useTRPC();
  const scan = useMutation(trpc.exchange.reconciliation.mutationOptions());
  const recovery = useMutation(trpc.exchange.recoverExecution.mutationOptions({onSuccess:()=>scan.reset()}));
  const pause = useMutation(trpc.exchange.pauseForRecovery.mutationOptions({onSuccess:()=>scan.reset()}));
  const busy=scan.isPending||recovery.isPending||pause.isPending;
  const report = scan.data;
  return (
    <main className="page-shell space-y-8">
      <header className="space-y-4">
        <Button asChild variant="ghost"><Link href="/dashboard"><ArrowLeft aria-hidden="true"/>Back to dashboard</Link></Button>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-[72ch] space-y-2">
            <h1 className="page-title">Account recovery</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Compare Meu’s ownership records with the exchange’s positions and orders. Pause all live
              agents on this account before scanning. Recovery verifies terminal broker orders,
              repairs confirmed submission records and releases retained execution locks only on a flat account.
              It does not place orders, cancel orders, close positions or resume agents.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
          <Button variant="secondary" disabled={busy} onClick={()=>pause.mutate({id:exchangeId})}>{pause.isPending?'Pausing agents…':'1. Pause live agents'}</Button>
          <Button disabled={busy} onClick={()=>scan.mutate({id:exchangeId})}>
            <RefreshCw aria-hidden="true" className={scan.isPending?'animate-spin':''}/>
            {scan.isPending?'Scanning account…':'2. Scan broker account'}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={()=>recovery.mutate({id:exchangeId})}>
            <RefreshCw aria-hidden="true" className={recovery.isPending?'animate-spin':''}/>
            {recovery.isPending?'Verifying recovery…':'3. Verify and recover locks'}
          </Button>
          </div>
        </div>
      </header>
      <section className="neu-panel space-y-2 p-5 text-sm"><h2 className="font-semibold">Recover without repeating an order</h2><p>Pause live agents and wait for any active worker run to finish. Scan the account. If the exchange shows a position or pending order, review it on the exchange first. Once flat, Verify and recover locks performs a fresh scan and records each verified repair. Resume agents individually afterward.</p><p className="text-muted-foreground">An unknown order stays blocked until its broker identity can be verified. A cancelled partially filled order can be reconciled after its remaining position is closed and pending protection is removed on the exchange. Risk counters are preserved.</p></section>
      {pause.isSuccess && <p role="status" className="neu-inset p-4 text-sm">{pause.data.message}</p>}
      {pause.isError && <p role="alert" className="neu-inset p-4 text-sm text-destructive">{pause.error.message}</p>}
      {recovery.isSuccess && <p role="status" className="neu-inset p-4 text-sm">{recovery.data.message}</p>}
      {recovery.isError && <section role="alert" className="neu-inset space-y-2 p-4 text-sm"><h2 className="font-semibold text-destructive">Recovery needs another step</h2><p>{recovery.error.message}</p><p className="text-muted-foreground">Scan again after resolving the named blocker. Recovery never treats a missing broker order as a failed submission.</p></section>}
      {scan.isError && <section role="alert" className="neu-inset space-y-2 p-6 text-sm">
        <h2 className="font-semibold text-destructive">Scan could not finish</h2>
        <p>{scan.error.message}</p><p className="text-muted-foreground">Keep agents paused. Correct the connection or account state, then scan again.</p>
      </section>}
      {scan.isPending ? <section aria-busy="true" aria-label="Reading broker orders and ownership" className="neu-panel space-y-4 p-6">
        <Skeleton className="h-7 w-56"/>{[1,2,3].map(row=><Skeleton key={row} className="h-16"/>)}
      </section> : report ? <>
        <section className="neu-panel space-y-3 p-6">
          <h2 className="section-title">{report.connectionName}</h2>
          <p className="text-sm text-muted-foreground">Checked {new Date(report.checkedAt).toLocaleString()} · {report.positions.length} broker positions · {report.pending.length} pending orders · {report.locks.length} execution locks</p>
          {report.changedDuringScan ? <p role="alert" className="text-sm text-destructive">Account execution changed during this scan. Pause live agents, wait for in-flight runs to finish, then scan again.</p> : <p className="max-w-[72ch] text-sm leading-relaxed">
            {report.issues.length || report.locks.length || report.unresolvedIntents.length
              ? 'Review the findings below before attempting to resume. Broker evidence does not automatically repair Meu’s records.'
              : 'No ownership discrepancy or execution lock was found in this scan. This is not an activation or risk-limit check.'}
          </p>}
        </section>
        <section className="space-y-4" aria-labelledby="findings-heading">
          <h2 id="findings-heading" className="section-title">Ownership findings</h2>
          {report.issues.length ? <ul className="divide-y divide-border">
            {report.issues.map((issue,index)=><li className="space-y-2 py-5" key={`${issue.code}:${issue.symbol}:${issue.agentId}:${index}`}>
              <h3 className="font-semibold">{issueTitles[issue.code]??issue.code} {issue.symbol && <span className="font-normal text-muted-foreground">· {issue.symbol}</span>}</h3>
              {issue.agentName && <p className="text-xs text-muted-foreground">Owner: {issue.agentName}</p>}
              <p className="max-w-[72ch] text-sm leading-relaxed">{issue.message}</p>
              <p className="max-w-[72ch] text-sm leading-relaxed text-muted-foreground">{issue.nextStep}</p>
            </li>)}
          </ul> : <p className="text-sm text-muted-foreground">No discrepancies in the inspected ownership records.</p>}
        </section>
        <section className="space-y-3" aria-labelledby="locks-heading">
          <h2 id="locks-heading" className="section-title">Execution locks and unresolved operations</h2>
          <p className="max-w-[72ch] text-sm leading-relaxed text-muted-foreground">A retained lock has no automatic expiry. An active operation may also hold a lock. The state below is recorded state; this scan does not prove queue liveness or remove claims.</p>
          {!report.locks.length ? <p className="text-sm">No account, connection or linked-agent locks found.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <caption className="sr-only">Execution locks on this broker account</caption>
            <thead><tr>{['Scope','Run or preflight ID','Recorded state','Operation','Created'].map(h=><th className="p-3 text-xs font-medium text-muted-foreground" key={h}>{h}</th>)}</tr></thead>
            <tbody>{report.locks.map((lock,index)=><tr className="border-t border-border" key={`${lock.scope}:${lock.executionId}:${index}`}>
              <td className="p-3">{lock.scope}</td><td className="max-w-xs break-all p-3 font-mono text-xs">{lock.executionId}</td><td className="p-3">{lock.state}</td><td className="p-3">{lock.kind}</td><td className="whitespace-nowrap p-3">{lock.createdAt?new Date(lock.createdAt).toLocaleString():'Unknown'}</td>
            </tr>)}</tbody>
          </table></div>}
          {report.unresolvedIntents.length>0 && <ul className="space-y-2 text-sm">{report.unresolvedIntents.map(intent=><li className="break-all" key={intent.id}>{intent.symbol??'Account operation'} · {intent.state} · <span className="font-mono text-xs">{intent.id}</span></li>)}</ul>}
        </section>
        <section className="space-y-3" aria-labelledby="broker-position-heading">
          <h2 id="broker-position-heading" className="section-title">Broker positions</h2>
          {!report.positions.length?<p className="text-sm text-muted-foreground">The exchange reported no open positions.</p>:<ul className="divide-y divide-border text-sm">{report.positions.map(position=><li className="flex flex-wrap justify-between gap-3 py-3" key={position.symbol}><span>{position.symbol} · {position.side} · {position.contracts} contracts</span><span className="text-muted-foreground">{position.ownerName}</span></li>)}</ul>}
        </section>
        <section className="space-y-3" aria-labelledby="broker-orders-heading">
          <h2 id="broker-orders-heading" className="section-title">Managed order evidence</h2>
          {!report.orders.length?<p className="text-sm text-muted-foreground">No active ownership references or uncertain managed submissions to inspect.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">Broker verification of saved managed orders</caption>
            <thead><tr>{['Ticker / owner','Client ID / broker ID','Saved / verification','Broker status','Filled / remaining'].map(h=><th key={h} className="p-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>{report.orders.map(order=><tr className="border-t border-border" key={order.clientOrderId}>
              <td className="p-3">{order.symbol}<br/><span className="text-muted-foreground">{order.agentName}</span></td>
              <td className="p-3 font-mono text-xs">{order.clientOrderId}<br/>{order.brokerOrderId??'Unknown'}</td>
              <td className="p-3">{order.savedState}<br/>{order.verification}</td><td className="p-3">{order.brokerStatus??'Unknown'}</td><td className="p-3">{order.filled??'—'} / {order.remaining??'—'}</td>
            </tr>)}</tbody>
          </table></div>}
          <details><summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">All pending broker orders ({report.pending.length})</summary>
            <ul className="divide-y divide-border text-sm">{report.pending.map(order=><li key={order.brokerOrderId} className="break-words py-3">{order.symbol} · {order.reduceOnly?'Protection / reduction':'Entry'} · {order.side??'Unknown side'} · {order.remaining??'Unknown'} remaining · Broker ID {order.brokerOrderId}</li>)}</ul>
          </details>
        </section>
        <Button asChild variant="secondary"><Link href="/help#reconciliation">Reconciliation and recovery guide</Link></Button>
      </> : <section className="neu-panel space-y-3 p-6">
        <h2 className="section-title">Inspect before you resume</h2>
        <p className="max-w-[72ch] text-sm leading-relaxed text-muted-foreground">Run a fresh scan after an uncertain order, a manual trade or an interrupted worker. Results stay on this page until the next scan. A missing broker order is treated as unknown, not proof that submission failed.</p>
      </section>}
    </main>
  );
}
