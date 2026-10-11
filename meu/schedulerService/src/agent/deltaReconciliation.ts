import {fetchManagedCryptoOrder} from './binanceExecution';
import type { Exchange, Order } from 'ccxt';
import { fetchCryptoOpenOrders, normalizeCryptoPositions } from './cryptoRisk';

export type ReconciliationOwner = {
  _id: string; agentId: string; symbol: string; state: string; orderRefs: string[];
};
export type ReconciliationOrder = {
  _id: string; agentId: string; symbol: string; clientOrderId: string;
  conditional?:boolean;closePosition?:boolean;triggerPrice?:number;protectionType?:string;brokerOrderId?: string; state: string; side: 'buy'|'sell'; amount: number;
};
export type ReconciliationIssue = {
  code: string; symbol?: string; agentId?: string; message: string; nextStep: string;
};

/** Diagnostic only. Never writes orders, ownership, execution state or locks. */
export async function inspectDeltaOwnership(exchange: Exchange, owners: ReconciliationOwner[], managed: ReconciliationOrder[]) {
  if (!['delta','binance'].includes(exchange.id) || owners.length > 100 || managed.length > 500)
    throw new Error('Reconciliation snapshot exceeds supported limits');
  const [rawPositions, pending] = await Promise.all([exchange.fetchPositions(), fetchCryptoOpenOrders(exchange)]);
  const positions = normalizeCryptoPositions(exchange, rawPositions).filter(p => Number(p.contracts) > 0);
  if (positions.length > 100 || positions.some(p => !Number.isFinite(p.contracts) || !['long','short'].includes(p.side ?? '')))
    throw new Error('Broker position snapshot is invalid');
  const issues: ReconciliationIssue[] = [];
  const observed = new Map<string, Order>();
  const orderRows = [];
  const deadline = Date.now() + 45_000;
  for (const saved of managed) {
    if (Date.now() > deadline) throw new Error("Broker order scan exceeded its time budget");
    if (saved.state === 'REFUSED') continue;
    let actual: Order | undefined;
    let result: 'VERIFIED'|'FOUND_UNRECORDED'|'UNKNOWN' = 'UNKNOWN';
    try {
      actual = saved.brokerOrderId
        ? await fetchManagedCryptoOrder(exchange,saved.brokerOrderId,saved.symbol,saved.conditional,undefined,saved.amount)
        : await fetchManagedCryptoOrder(exchange,saved.clientOrderId,saved.symbol,saved.conditional,saved.clientOrderId,saved.amount);
      if (!actual.id || (saved.brokerOrderId && actual.id !== saved.brokerOrderId) ||
          actual.clientOrderId !== saved.clientOrderId || actual.symbol !== saved.symbol ||
          !Number.isFinite(saved.amount) || saved.amount <= 0 ||
          !Number.isFinite(actual.amount) || Math.abs(Number(actual.amount) - saved.amount) > 1e-9 ||
          !Number.isFinite(actual.filled) || Number(actual.filled) < 0 ||
          !Number.isFinite(actual.remaining) || Number(actual.remaining) < 0 ||
          Math.abs(Number(actual.filled) + Number(actual.remaining) - saved.amount) > 1e-9 ||
          actual.side !== saved.side ||
          !['open','closed','canceled','expired','rejected'].includes(actual.status ?? '')) throw new Error('Unverified order');
      observed.set(saved._id, actual);
      result = saved.state === 'ACCEPTED' ? 'VERIFIED' : 'FOUND_UNRECORDED';
    } catch {
      actual = undefined;
    }
    if (result !== 'VERIFIED') issues.push({
      code: result === 'FOUND_UNRECORDED' ? 'SUBMISSION_FOUND' : 'ORDER_UNKNOWN',
      agentId:saved.agentId, symbol:saved.symbol,
      message: result === 'FOUND_UNRECORDED' ? 'Delta has this order, but Meu has not confirmed its submission.' : 'The broker order identity or fill state could not be verified.',
      nextStep: 'Keep the agent paused. Review this client ID and its broker history before repairing the recorded submission; never retry it as a new order.',
    });
    orderRows.push({ agentId:saved.agentId, symbol:saved.symbol, clientOrderId:saved.clientOrderId,
      savedState:saved.state, verification:result, brokerOrderId:actual?.id ?? saved.brokerOrderId ?? null,
      brokerStatus:actual?.status ?? null, filled:actual?.filled ?? null, remaining:actual?.remaining ?? null });
  }
  for (const owner of owners) {
    if (owner.orderRefs.length > 128) throw new Error("Ownership history exceeds scan limit");
    const position = positions.find(p => p.symbol === owner.symbol);
    const pendingOnTicker = pending.filter(o => o.symbol === owner.symbol);
    const refs = owner.orderRefs.map(id => managed.find(o => o._id === id));
    const unknown = refs.length === 0 || refs.some(o => !o || o.agentId !== owner.agentId || o.symbol !== owner.symbol || (o.state !== 'REFUSED' && !observed.has(o._id)));
    const net = refs.reduce((sum, saved) => sum + (saved ? Number(observed.get(saved._id)?.filled ?? 0) * (saved.side === 'buy' ? 1 : -1) : 0), 0);
    if (owner.state === 'REVIEW_REQUIRED') issues.push({code:'OWNER_REVIEW',symbol:owner.symbol,agentId:owner.agentId,message:'This ownership record is already marked for review.',nextStep:'Compare the recorded entry/reduction fills and exchange history. A new scan does not clear the review state.'});
    if (unknown) issues.push({code:'INCOMPLETE_HISTORY',symbol:owner.symbol,agentId:owner.agentId,message:'Ownership cannot be proved from a complete set of recorded orders.',nextStep:'Restore and verify the missing order history before resuming; do not adopt the broker quantity by assumption.'});
    if (!unknown && position && Math.abs(Number(position.contracts) * (position.side === 'long' ? 1 : -1) - net) > 1e-9)
      issues.push({code:'QUANTITY_MISMATCH',symbol:owner.symbol,agentId:owner.agentId,message:'Broker quantity differs from the net managed fills.',nextStep:'Check manual trades and native bracket exits in Delta fill history. Keep the agent paused until ownership is explicitly reconciled.'});
    if (!position && pendingOnTicker.length)
      issues.push({code:'FLAT_WITH_PENDING',symbol:owner.symbol,agentId:owner.agentId,message:'The ticker is flat but still has pending orders.',nextStep:'Review which orders can still fill and any remaining protection directly on Delta before reusing this ticker.'});
    if (!unknown && !position && !pendingOnTicker.length && owner.state !== 'FLAT')
      issues.push({code:'FLAT_OWNER',symbol:owner.symbol,agentId:owner.agentId,message:'Delta is flat with no pending orders, but Meu still reserves this ticker.',nextStep:'Review terminal orders and exit history. This diagnostic does not close the ownership period or release execution locks.'});
  }
  for (const position of positions) if (!owners.some(o => o.symbol === position.symbol && o.state !== 'FLAT'))
    issues.push({code:'UNOWNED_POSITION',symbol:position.symbol,message:'An account position has no active Meu ownership record.',nextStep:'Manage and protect this position on Delta. Meu will not adopt it automatically.'});
  for (const order of pending) {
    const owner = owners.find(o => o.symbol === order.symbol && o.state !== 'FLAT');
    const saved = managed.find(o => o.clientOrderId === order.clientOrderId && o.symbol === order.symbol);
    const protective = order.reduceOnly === true || order.info?.reduce_only === true;
    if (!owner || (!protective && (!saved || saved.agentId !== owner.agentId || !owner.orderRefs.includes(saved._id))))
      issues.push({code:'UNOWNED_ORDER',symbol:order.symbol,message:'A pending order is not covered by the active ownership record.',nextStep:'Inspect this order on Delta; confirm its owner and whether it can open or reduce exposure before resuming.'});
  }
  return {
    issues, orders:orderRows,
    positions:positions.map(p => ({symbol:p.symbol,side:p.side!,contracts:Number(p.contracts),ownerAgentId:owners.find(o => o.symbol === p.symbol && o.state !== 'FLAT')?.agentId ?? null})),
    pending:pending.map(o => ({brokerOrderId:o.id,clientOrderId:o.clientOrderId ?? null,symbol:o.symbol,side:o.side ?? null,remaining:o.remaining ?? null,reduceOnly:o.reduceOnly === true || o.info?.reduce_only === true})),
  };
}
