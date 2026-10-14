import {test,expect} from 'bun:test';
import type {Exchange,Order,Position} from 'ccxt';
import {inspectDeltaOwnership,type ReconciliationOwner,type ReconciliationOrder} from '../src/brokers/delta/deltaReconciliation';
const symbol='XRP/USD:USD';
const owner:ReconciliationOwner={_id:'owner',agentId:'agent',symbol,state:'OPEN',orderRefs:['order']};
const saved:ReconciliationOrder={_id:'order',agentId:'agent',symbol,clientOrderId:'client',brokerOrderId:'broker',state:'ACCEPTED',side:'buy',amount:2};
function fixture(){
 const positions:Position[]=[];const pending:Order[]=[];const reads:unknown[][]=[];
 let actual={id:'broker',symbol,clientOrderId:'client',filled:2,remaining:0,status:'closed',side:'buy',amount:2} as Order;
 let fail=false;
 const exchange={id:'delta',fetchPositions:async()=>positions,parseOrder:(row:Order)=>row,
  request:async(...args:unknown[])=>{reads.push(args);expect(args[2]).toBe('GET');return{success:true,result:pending,meta:{after:null}};},
  fetchOrder:async(...args:unknown[])=>{reads.push(args);if(fail)throw new Error('private signed response must not leak');return actual;},
  createOrder:()=>{throw new Error('Diagnostic must not trade');},cancelOrder:()=>{throw new Error('Diagnostic must not cancel');},
 } as unknown as Exchange;
 const position=(qty=2)=>({symbol,contracts:qty,info:{size:qty}}) as Position;
 return {exchange,positions,pending,reads,position,setOrder:(order:Order)=>{actual=order;},fail:()=>{fail=true;}};
}
test('empty paused account has no findings and diagnostics issue only broker reads',async()=>{
 const f=fixture();const report=await inspectDeltaOwnership(f.exchange,[],[]);
 expect(report.issues).toHaveLength(0);expect(report.positions).toHaveLength(0);expect(report.pending).toHaveLength(0);
});
test('unknown submission is looked up by exact client ID, but finding it does not repair saved records',async()=>{
 const f=fixture();f.positions.push(f.position());const uncertain={...saved,brokerOrderId:undefined,state:'SUBMITTING'};
 const report=await inspectDeltaOwnership(f.exchange,[owner],[uncertain]);
 expect(f.reads).toContainEqual(['client',symbol,{clientOrderId:'client'}]);
 expect(report.orders[0]?.verification).toBe('FOUND_UNRECORDED');expect(report.issues.some(i=>i.code==='SUBMISSION_FOUND')).toBe(true);
 expect(uncertain.state).toBe('SUBMITTING');expect(owner.state).toBe('OPEN');
});
test('order not found remains unknown without declaring it safe to retry or exposing broker errors',async()=>{
 const f=fixture();f.fail();const report=await inspectDeltaOwnership(f.exchange,[owner],[saved]);
 expect(report.issues.some(i=>i.code==='ORDER_UNKNOWN')).toBe(true);expect(report.issues.some(i=>i.code==='INCOMPLETE_HISTORY')).toBe(true);
 expect(JSON.stringify(report)).not.toContain('private signed');expect(report.orders[0]?.filled).toBeNull();
});
test('partial fills prove only filled contracts; a manual quantity change is reported',async()=>{
 const f=fixture();f.positions.push(f.position(1));f.setOrder({id:'broker',symbol,clientOrderId:'client',filled:1,remaining:1,status:'open',side:'buy',amount:2} as Order);
 let report=await inspectDeltaOwnership(f.exchange,[owner],[saved]);expect(report.issues).toHaveLength(0);
 f.positions[0]=f.position(2);report=await inspectDeltaOwnership(f.exchange,[owner],[saved]);expect(report.issues.some(i=>i.code==='QUANTITY_MISMATCH')).toBe(true);
});
test('incomplete order quantities or direction cannot prove a submission safe to reconcile',async()=>{
 const complete={id:'broker',symbol,clientOrderId:'client',filled:2,remaining:0,status:'closed',side:'buy',amount:2} as Order;
 for(const actual of [
  {...complete,amount:undefined},
  {...complete,side:undefined},
  {...complete,side:'sell'},
  {...complete,filled:1,remaining:0},
  {...complete,filled:3,remaining:0},
 ]) {
  const f=fixture();f.setOrder(actual as Order);
  const report=await inspectDeltaOwnership(f.exchange,[owner],[saved]);
  expect(report.orders[0]?.verification).toBe('UNKNOWN');
  expect(report.issues.some(i=>i.code==='INCOMPLETE_HISTORY')).toBe(true);
 }
});
test('manual exposure, foreign entries and orphan protection remain visible',async()=>{
 const f=fixture();f.positions.push(f.position());f.pending.push({id:'foreign',symbol,clientOrderId:'foreign',remaining:1,reduceOnly:false} as Order);
 const manual=await inspectDeltaOwnership(f.exchange,[],[]);expect(manual.issues.map(i=>i.code)).toEqual(['UNOWNED_POSITION','UNOWNED_ORDER']);
 f.positions.length=0;f.pending[0]={id:'stop',symbol,remaining:1,reduceOnly:true} as Order;
 expect((await inspectDeltaOwnership(f.exchange,[owner],[saved])).issues.some(i=>i.code==='FLAT_WITH_PENDING')).toBe(true);
 f.pending.length=0;expect((await inspectDeltaOwnership(f.exchange,[owner],[saved])).issues.some(i=>i.code==='FLAT_OWNER')).toBe(true);
});
test('identity mismatches and excessive records refuse complete verification',async()=>{
 const f=fixture();f.setOrder({id:'broker',symbol,clientOrderId:'wrong',filled:2,remaining:0,status:'closed'} as Order);
 expect((await inspectDeltaOwnership(f.exchange,[owner],[saved])).orders[0]?.verification).toBe('UNKNOWN');
 await expect(inspectDeltaOwnership(f.exchange,[],Array.from({length:501},()=>saved))).rejects.toThrow('limits');
 f.positions.push({symbol,contracts:NaN,info:{size:NaN}} as Position);
 await expect(inspectDeltaOwnership(f.exchange,[],[])).rejects.toThrow();
});
