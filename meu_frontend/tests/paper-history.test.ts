import {test,expect,mock} from 'bun:test';
import {strategyStateKey} from '../../shared/trading/strategies';
const agentId='a'.repeat(24),currentId=`${agentId}:12345678-1234-1234-1234-123456789abc`;
let owner='alice';const reads:any[]=[];
mock.module('server-only',()=>({}));
mock.module('next/headers',()=>({headers:async()=>new Headers()}));
mock.module('@/lib/auth',()=>({auth:{api:{getSession:async()=>({user:{id:owner}})}}}));
mock.module('@/lib/db',()=>({default:{
 agent:{findFirst:async({where}:any)=>where.userId==='alice'?{id:agentId,executionMode:'PAPER',strategyConfig:{stateId:currentId}}:null},
 $runCommandRaw:async(command:any)=>{
  reads.push(command);return{ok:1,cursor:{id:0,firstBatch:command.projection.state?[{state:{cash:100,position:null,history:[{close:1}],trades:[]}}]:[{_id:agentId,secret:'hidden',config:{id:'ema',timeframe:'1h'},updatedAt:{$date:'2026-10-01T00:00:00Z'}},{_id:currentId,config:{id:'donchian',timeframe:'4h'}}]}};
 },
}}));
const {backtestsRouter}=await import('../src/features/backtests/server/router');
const caller=backtestsRouter.createCaller({userId:'ignored',requestId:'test'});
test('paper portfolio revisions scope current and retained snapshots to the owned agent',async()=>{
 const sessions=await caller.paperSessions({agentId});expect(sessions.map(s=>s.current)).toEqual([false,true]);expect(JSON.stringify(sessions)).not.toContain('hidden');
 const current=await caller.paperState({agentId});expect(current).not.toHaveProperty('history');expect(reads.at(-1).filter).toEqual({_id:currentId,userId:'alice',agentId});
 await caller.paperState({agentId,sessionId:agentId});expect(reads.at(-1).filter).toEqual({_id:agentId,userId:'alice'});
 await expect(caller.paperState({agentId,sessionId:`${'b'.repeat(24)}:12345678-1234-1234-1234-123456789abc`})).rejects.toMatchObject({code:'BAD_REQUEST'});
 owner='bob';const before=reads.length;await expect(caller.paperSessions({agentId})).rejects.toMatchObject({code:'NOT_FOUND'});await expect(caller.paperState({agentId})).rejects.toMatchObject({code:'NOT_FOUND'});expect(reads).toHaveLength(before);
});
test('legacy state keys are retained and foreign or malformed revisions are rejected',()=>{
 expect(strategyStateKey(agentId,null)).toBe(agentId);expect(strategyStateKey(agentId,{stateId:currentId})).toBe(currentId);
 expect(()=>strategyStateKey('other',{stateId:currentId})).toThrow();expect(()=>strategyStateKey(agentId,{stateId:`${agentId}:unsafe`})).toThrow();
});
