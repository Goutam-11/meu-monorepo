import 'server-only';
import { TRPCError } from '@trpc/server';
import prisma from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { executionConnection, registerExecutionAccount, linkedExchangeIds } from './execution-account';
import { inspectDeltaOwnership, type ReconciliationOwner, type ReconciliationOrder } from '../../../../../meu/schedulerService/src/agent/deltaReconciliation';

const active = new Set<string>();
export async function readRows<T>(command: Prisma.InputJsonObject, maximum: number): Promise<T[]> {
  const result = await prisma.$runCommandRaw({...command,limit:maximum+1,batchSize:maximum+1});
  const cursor = result.cursor as {firstBatch?:T[];id?:number|{$numberLong:string}} | undefined;
  const cursorId = typeof cursor?.id === 'object' ? cursor.id.$numberLong : String(cursor?.id);
  if (result.ok !== 1 || !Array.isArray(cursor?.firstBatch) || cursorId !== '0' || cursor.firstBatch.length > maximum)
    throw new Error('Incomplete reconciliation records');
  return cursor.firstBatch;
}
export async function reconciliationReport(exchangeId: string, userId: string) {
  let claimedAccount: string | undefined;
  try {
    const { exchange, connection } = await executionConnection(exchangeId, userId);
    const { accountKey } = await registerExecutionAccount(exchange, exchangeId, userId);
    if (active.has(accountKey) || active.size >= 4) throw new TRPCError({code:'TOO_MANY_REQUESTS',message:'An account scan is already running. Wait for it to finish.'});
    active.add(accountKey);
    claimedAccount = accountKey;
    const connectionIds = await linkedExchangeIds(accountKey, userId);
    const agents = await prisma.agent.findMany({where:{userId,exchangeId:{in:connectionIds}},select:{id:true,name:true,status:true,executionMode:true}});
    if (agents.length > 100) throw new TRPCError({code:'PRECONDITION_FAILED',message:'Too many linked agents to scan safely.'});
    if (agents.some(a => a.status === 'RUNNING' && a.executionMode !== 'PAPER'))
      throw new TRPCError({code:'PRECONDITION_FAILED',message:'Pause all live agents on this broker account before scanning.'});
    type Lock = {_id:string;executionId:string;kind?:string;state?:string;createdAt?:{$date:string}};
    const lockFilter = {_id:{$in:[`account:${accountKey}`,...connectionIds.map(id=>`exchange:${id}`),...agents.flatMap(a=>[`agent:${a.id}`,`recovery:${a.id}`])]}};
    async function locks() {
      return readRows<Lock>({find:'ExecutionLocks',filter:lockFilter},400);
    }
    const before = await locks();
    const owners = await readRows<ReconciliationOwner>({find:'CryptoPositionOwners',filter:{accountKey,userId,state:{$ne:'FLAT'}}},100);
    if (owners.some(o => !Array.isArray(o.orderRefs) || o.orderRefs.length > 128)) throw new Error('Incomplete owner order references');
    const orders = await readRows<ReconciliationOrder>({find:'ManagedCryptoOrders',filter:{accountKey,userId,$or:[{_id:{$in:owners.flatMap(o=>o.orderRefs)}},{state:'SUBMITTING'}]}},500);
    await exchange.loadMarkets();
    const broker = await inspectDeltaOwnership(exchange,owners,orders);
    const executionIds = [...new Set(before.map(lock=>lock.executionId))];
    type Execution={_id:string;state:string;agentId:string};
    type Intent={_id:string;executionId:string;state:string;intent?:{symbol?:string}};
    const [executions,intents] = await Promise.all([
      readRows<Execution>({find:'AgentExecutions',filter:{_id:{$in:executionIds}},projection:{_id:1,state:1,agentId:1}},300),
      readRows<Intent>({find:'OrderIntents',filter:{executionId:{$in:executionIds},state:'PENDING'},projection:{_id:1,executionId:1,state:1,'intent.symbol':1}},500),
    ]);
    const after = await locks();
    const running = await prisma.agent.count({where:{userId,exchangeId:{in:connectionIds},status:'RUNNING',OR:[{executionMode:null},{executionMode:{isSet:false}},{executionMode:{not:'PAPER'}}]}});
    const fingerprint=(rows:Lock[])=>JSON.stringify(rows.map(l=>[l._id,l.executionId,l.state,l.kind]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
    const changed = running>0 || fingerprint(before)!==fingerprint(after);
    const label=(id:string)=>agents.find(a=>a.id===id)?.name ?? 'Deleted or unavailable agent';
    return {
      checkedAt:new Date().toISOString(), connectionName:connection.displayName || connection.name, changedDuringScan:changed,
      issues:broker.issues.map(issue=>({...issue,agentName:issue.agentId ? label(issue.agentId) : null})),
      positions:broker.positions.map(p=>({...p,ownerName:p.ownerAgentId ? label(p.ownerAgentId):'Unowned'})),
      orders:broker.orders.map(o=>({...o,agentName:label(o.agentId)})), pending:broker.pending,
      locks:before.map(l=>({scope:l._id.split(':')[0],executionId:l.executionId,state:l.state ?? executions.find(e=>e._id===l.executionId)?.state ?? 'UNVERIFIED',kind:l.kind??'WORKER',createdAt:l.createdAt?.$date??null})),
      unresolvedIntents:intents.map(i=>({id:i._id,executionId:i.executionId,symbol:i.intent?.symbol??null,state:i.state})),
    };
  } catch(error) {
    if(error instanceof TRPCError)throw error;
    throw new TRPCError({code:'BAD_GATEWAY',message:'Could not complete the broker and ownership scan. Records and locks were left unchanged; check your Delta connection and retry.'});
  } finally {if (claimedAccount) active.delete(claimedAccount);}
}
