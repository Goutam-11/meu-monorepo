import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function probe(script: string) {
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, NODE_ENV: "production", PRETTY_LOGS: "false", LOG_LEVEL: "info",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "synthetic-public", VAPID_PRIVATE_KEY: "synthetic-private" },
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  return result.stdout.trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
}
const deliveryId = "11111111-1111-4111-8111-111111111111";
const mockPush = `
  import {mock} from 'bun:test';
  mock.module('web-push',()=>({default:{setVapidDetails(){},generateRequestDetails(sub){return {endpoint:sub.endpoint,method:'POST',headers:{},body:null};}}}));
  globalThis.fetch=async()=>new Response(null,{status:201});
`;

describe("notification logging", () => {
  test("logs safe error classification but excludes raw errors, nested data and child secrets", () => {
    const logs = probe(`
      import {log,errMeta} from './src/infrastructure/logger';
      const error=Object.assign(new Error('synthetic-error-secret'),{statusCode:401,body:'synthetic-response-secret',code:11000});
      log.child({deliveryId:'${deliveryId}',apiKey:'synthetic-api-secret',headers:{authorization:'synthetic-auth-secret'}})
        .child({endpoint:'https://example.invalid/synthetic-endpoint-secret',keys:{auth:'synthetic-push-secret'}})
        .error({event:'push.failed',err:error,payload:{title:'synthetic-title-secret'},metadata:{token:'synthetic-token-secret'},userId:'synthetic-user-secret'},'Push failed');
      log.error({event:'push.failed',...errMeta(error)},'Push failed');
    `);
    expect(JSON.stringify(logs)).not.toContain("synthetic-");
    expect(logs[0].service).toBe("notificationService");
    expect(logs[0].deliveryId).toBe(deliveryId);
    expect(logs[0].err).toEqual({name: "Error", statusCode: 401, code: 11000});
    expect(logs[1].err).toEqual(logs[0].err);
  });

  test("correlates retries, successes, expiration and failures across concurrent subscriptions", () => {
    const logs = probe(`
      import {mock} from 'bun:test';
      import {strict as assert} from 'node:assert';
      const attempts=new Map();
      mock.module('web-push',()=>({default:{setVapidDetails(){},generateRequestDetails(sub){return {endpoint:sub.endpoint,method:'POST',headers:{},body:null};}}}));
      globalThis.fetch=async endpoint=>{
        const type=endpoint.split('/').at(-1);
        const count=(attempts.get(type)??0)+1;attempts.set(type,count);
        const statusCode=type==='retry'&&count===1?429:type==='expired'?410:type==='fail'?401:201;
        return new Response(null,{status:statusCode});
      };
      const {sendPush}=await import('./src/channels/web-push/delivery');
      const point=Buffer.alloc(65);point[0]=4;
      const subscriptions=['retry','expired','fail','invalid'].map(type=>({_id:type,endpoint:'https://fcm.googleapis.com/send/'+type,
        p256dh:point.toString('base64url'),auth:type==='invalid'?'synthetic-invalid':Buffer.alloc(16).toString('base64url')}));
      const deleted=[];
      const db={collection:()=>({find:()=>({toArray:async()=>subscriptions}),deleteOne:async f=>deleted.push(f._id)})};
      await sendPush(db,'synthetic-user-secret',{title:'synthetic-title-secret',body:'synthetic-message-secret'},
        {deliveryId:'${deliveryId}',runId:'run-1',jobId:'1'});
      assert.equal(attempts.get('retry'),2);assert.equal(attempts.get('expired'),1);assert.equal(attempts.get('fail'),1);
      assert.equal(attempts.get('invalid'),undefined);assert.deepEqual(deleted,['expired']);
    `);
    expect(JSON.stringify(logs)).not.toContain("synthetic-");
    for (const entry of logs) {
      expect(entry.deliveryId).toBe(deliveryId);
      expect(entry.runId).toBe("run-1");
      expect(entry.jobId).toBe("1");
    }
    expect(logs.filter(entry => entry.event === "push.retry")).toHaveLength(1);
    expect(logs.find(entry => entry.event === "push.expired").err.statusCode).toBe(410);
    const summary = logs.find(entry => entry.event === "push.summary");
    expect(summary).toMatchObject({count: 4, delivered: 1, expired: 1, failed: 2, invalid: 1});
    expect(summary.level).toBe(40);
  });

  test("logs persistence, invalid payloads, legacy IDs and DB failure without exposing contents", () => {
    const logs = probe(mockPush + `
      import {strict as assert} from 'node:assert';
      const {createNotificationProcessor}=await import('./src/workers/notification-processor');
      let persisted=0;let fail=false;
      const db={collection:()=>({updateOne:async filter=>{
        persisted++; if(fail)throw new Error('synthetic-db-credential');
        assert.equal(filter.deliveryJobId,'123-3');return {upsertedCount:1};
      },find:()=>({toArray:async()=>[]})})};
      const processor=createNotificationProcessor(db);
      await processor({id:'2',timestamp:123,attemptsMade:0,data:{title:'synthetic-invalid-title',message:'synthetic-invalid-message'}});
      assert.equal(persisted,0);
      const job={id:'3',timestamp:123,attemptsMade:0,data:{type:'INFO',source:'AGENT',userId:'synthetic-user',runId:'run-1',
        title:'synthetic-private-title',message:'synthetic-private-message',code:'synthetic-private-code',metadata:{token:'synthetic-private-token'}}};
      await processor(job);assert.equal(persisted,1);
      fail=true;let failed=false;
      try{await processor(job)}catch{failed=true}
      assert.equal(failed,true);
    `);
    expect(JSON.stringify(logs)).not.toContain("synthetic-");
    expect(logs[0].event).toBe("notification.invalid");
    expect(logs[0].issueCount).toBeGreaterThan(0);
    expect(logs.find(entry => entry.event === "notification.persisted")).toMatchObject({deliveryId: "123-3", runId: "run-1", inserted: true});
    expect(logs.find(entry => entry.event === "push.skipped").reasonCode).toBe("no_subscriptions");
    expect(logs.find(entry => entry.event === "notification.failed")).toMatchObject({deliveryId: "123-3", runId: "run-1", err: {name: "Error"}});
  });

  test("a push promise that never settles releases the notification queue slot", () => {
    const logs = probe(`
      import {mock} from 'bun:test';
      import {strict as assert} from 'node:assert';
      const realTimeout=globalThis.setTimeout;
      globalThis.setTimeout=(fn,ms,...args)=>realTimeout(fn,ms===12000?5:ms,...args);
      let attempts=0;
      mock.module('web-push',()=>({default:{setVapidDetails(){},generateRequestDetails(sub){return {endpoint:sub.endpoint,method:'POST',headers:{},body:null};}}}));
      globalThis.fetch=()=>{attempts++;return new Promise(()=>{});};
      const {createNotificationProcessor}=await import('./src/workers/notification-processor');
      const point=Buffer.alloc(65);point[0]=4;
      const db={collection:()=>({updateOne:async()=>({upsertedCount:1}),find:()=>({toArray:async()=>[
        {_id:'sub',endpoint:'https://fcm.googleapis.com/send/example',p256dh:point.toString('base64url'),auth:Buffer.alloc(16).toString('base64url')}
      ]})})};
      await createNotificationProcessor(db)({id:'8',timestamp:123,attemptsMade:0,data:{type:'ERROR',source:'AGENT',userId:'owner',title:'Run failed',message:'Review',code:'AGENT_REVIEW_REQUIRED'}});
      assert.equal(attempts,3);
    `);
    expect(logs.find(entry=>entry.event==='push.failed').err.code).toBe('PUSH_DELIVERY_TIMEOUT');
    expect(logs.find(entry=>entry.event==='push.summary')).toMatchObject({failed:1,delivered:0});
    expect(logs.at(-1).event).toBe('notification.processed');
  });

  test("large subscription lists have bounded HTTP concurrency without dropping deliveries", () => {
    const logs = probe(`
      import {mock} from 'bun:test';
      import {strict as assert} from 'node:assert';
      let active=0;let maximum=0;let delivered=0;
      mock.module('web-push',()=>({default:{setVapidDetails(){},generateRequestDetails(sub){return {endpoint:sub.endpoint,method:'POST',headers:{},body:null};}}}));
      globalThis.fetch=async()=>{
        active++;maximum=Math.max(maximum,active);
        await new Promise(resolve=>setTimeout(resolve,5));
        active--;delivered++;return new Response(null,{status:201});
      };
      const {sendPush}=await import('./src/channels/web-push/delivery');
      const point=Buffer.alloc(65);point[0]=4;
      const subscriptions=Array.from({length:13},(_,i)=>({_id:'sub-'+i,
        endpoint:'https://fcm.googleapis.com/send/'+i,p256dh:point.toString('base64url'),auth:Buffer.alloc(16).toString('base64url')}));
      const db={collection:()=>({find:()=>({toArray:async()=>subscriptions})})};
      await sendPush(db,'owner',{});
      assert.equal(maximum,5);assert.equal(delivered,13);
    `);
    expect(logs.find(entry=>entry.event==='push.summary')).toMatchObject({count:13,delivered:13,failed:0});
  });

  test("disabled push is logged without querying subscriptions", () => {
    const logs = probe(mockPush + `
      delete process.env.VAPID_PRIVATE_KEY;
      const {sendPush}=await import('./src/channels/web-push/delivery');
      await sendPush({collection(){throw new Error('DB should not be queried')}},'owner',{}, {deliveryId:'${deliveryId}'});
    `);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({event: "push.skipped", deliveryId, reasonCode: "push_disabled"});
  });
});
