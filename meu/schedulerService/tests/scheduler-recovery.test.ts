import {afterAll,beforeEach,expect,mock,test} from 'bun:test';
import type {Collection,Document} from 'mongodb';

const jobs=new Map<string,{state:string}>();
let agents:Document[]=[];let queued:{id:string;runAt:number}[]=[];
mock.module('@/config/config',()=>({TICK_MS:60000}));
mock.module('@/lib/logger',()=>({logger:{child:()=>({info:()=>{},error:()=>{}})},errMeta:()=>({})}));
mock.module('@/lib/redis',()=>({setAgentCached:async()=>{}}));
mock.module('@/state/setStates',()=>({
  reconcileAgents:async()=>agents.filter(agent=>agent.status==='RUNNING'),
  toAgentCacheEntry:(agent:Document)=>({id:String(agent._id),userId:agent.userId}),
}));
mock.module('@/queue/queue',()=>({agentQueue:{
  getJob:async(id:string)=>jobs.has(id)?{getState:async()=>jobs.get(id)!.state}:null,
  add:async(_:string,data:{agentId:string;runAt:number},options:{jobId:string})=>{queued.push({id:data.agentId,runAt:data.runAt});jobs.set(options.jobId,{state:'delayed'});},
}}));
const {reconcileOnce,jobIdFor}=await import('../src/schedulers/scheduler');
const collection={
  findOne:async(filter:Document)=>agents.find(agent=>agent._id===filter._id&&agent.status===filter.status),
  updateOne:async(filter:Document,update:{$set:Document})=>{
    const agent=agents.find(agent=>agent._id===filter._id&&agent.status===filter.status&&agent.nextRunAt===filter.nextRunAt);
    if(agent)Object.assign(agent,update.$set);
  },
} as unknown as Collection<Document>;
beforeEach(()=>{agents=[];queued=[];jobs.clear();});
afterAll(()=>mock.restore());

test('an empty Redis queue recovers one overdue pointer without activating paused agents or replaying missed intervals',async()=>{
  const due=new Date(Date.now()-3600000);
  agents=[{_id:'running',userId:'owner',status:'RUNNING',market:{agentCycles:900},nextRunAt:due},{_id:'paused',userId:'owner',status:'PAUSED',market:{agentCycles:900},nextRunAt:due}];
  await reconcileOnce(collection);await reconcileOnce(collection);
  expect(queued).toEqual([{id:'running',runAt:due.getTime()}]);expect(agents[1]!.status).toBe('PAUSED');
  expect(agents[0]!.nextRunAt).toBe(due);
});

test('an active queued execution retains its pointer during scheduler restart',async()=>{
  const due=new Date(0);agents=[{_id:'running',userId:'owner',status:'RUNNING',market:{agentCycles:900},nextRunAt:due}];
  jobs.set(jobIdFor('running',0),{state:'active'});await reconcileOnce(collection);
  expect(queued).toHaveLength(0);expect(agents[0]!.nextRunAt).toBe(due);
});

test('a completed or failed job advances to a future pointer instead of executing its old ID again',async()=>{
  for(const state of ['completed','failed']){
    jobs.clear();queued=[];const due=new Date(0);
    agents=[{_id:'running',userId:'owner',status:'RUNNING',market:{agentCycles:900},nextRunAt:due}];
    jobs.set(jobIdFor('running',0),{state});const before=Date.now();await reconcileOnce(collection);
    expect(queued).toHaveLength(0);expect(new Date(agents[0]!.nextRunAt).getTime()).toBeGreaterThanOrEqual(before+900000);
    await reconcileOnce(collection);expect(queued).toHaveLength(1);expect(queued[0]!.runAt).not.toBe(0);
  }
});
