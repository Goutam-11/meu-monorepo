import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function probe(script: string) {
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, NODE_ENV: "production", PRETTY_LOGS: "false", LOG_LEVEL: "info", NOTIFICATION_TRANSPORT: "queue",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "synthetic-public", VAPID_PRIVATE_KEY: "synthetic-private" },
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  return result.stdout.trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
}

const setup = `
  import {mock} from 'bun:test';
  import {strict as assert} from 'node:assert';
  const queued=[];
  let fail=false;
  mock.module('@/lib/redis',()=>({redis:{}}));
  mock.module('bullmq',()=>({Worker:class{},Queue:class{on(){}async add(name,data){
    if(fail)throw new Error('synthetic-queue-credential');
    queued.push(data);return {id:String(queued.length)};
  }}}));
  mock.module('web-push',()=>({default:{setVapidDetails(){},async sendNotification(){throw new Error('No real push allowed')}}}));
  const {emitNotification,setLegacyNotificationCollection}=await import('./src/lib/notifications');
  const {runWithLogContext,getCurrentRunId}=await import('./src/lib/logger');
  const document={type:'INFO',source:'AGENT',userId:'synthetic-user',title:'synthetic-title',message:'synthetic-message',code:'synthetic-code'};
`;

describe("notification emission correlation", () => {
  test("passes the same delivery and run IDs from scheduler through notification persistence and push", () => {
    const logs = probe(setup + `
      await runWithLogContext({runId:'run-1',agentId:'agent-1'},()=>emitNotification({...document,runId:'ignored'}));
      assert.equal(queued.length,1);assert.equal(queued[0].runId,'run-1');
      assert.equal(getCurrentRunId(),undefined);
      const {createNotificationProcessor}=await import('../notificationService/src/index');
      const db={collection:()=>({updateOne:async filter=>{
        assert.equal(filter.deliveryJobId,queued[0].deliveryId);return {upsertedCount:1};
      },find:()=>({toArray:async()=>[]})})};
      await createNotificationProcessor(db)({id:'1',timestamp:123,attemptsMade:0,data:queued[0]});
    `);
    expect(JSON.stringify(logs)).not.toContain("synthetic-");
    const queued = logs.find(entry => entry.event === "notification.queued");
    expect(queued.service).toBe("schedulerService");
    expect(queued.deliveryId).toMatch(/^[0-9a-f-]{36}$/);
    const received = logs.filter(entry => entry.service === "notificationService");
    expect(received.map(entry => entry.event)).toEqual(["notification.started", "notification.persisted", "push.skipped", "notification.processed"]);
    for (const entry of received) {
      expect(entry.deliveryId).toBe(queued.deliveryId);
      expect(entry.runId).toBe("run-1");
      expect(entry.jobId).toBe("1");
    }
  });

  test("queue failure is safely logged without crashing the calling flow", () => {
    const logs = probe(setup + `
      fail=true;
      await runWithLogContext({runId:'run-2'},()=>emitNotification(document));
      assert.equal(queued.length,0);
    `);
    expect(JSON.stringify(logs)).not.toContain("synthetic-");
    expect(logs[0]).toMatchObject({event: "notification.emit_failed", runId: "run-2", err: {name: "Error"}});
  });

  test("legacy transport logs skips and persists the delivery ID with run correlation", () => {
    const logs = probe(setup + `
      process.env.NOTIFICATION_TRANSPORT='db';
      await emitNotification(document);
      let saved;
      setLegacyNotificationCollection({insertOne:async data=>{saved=data}});
      await runWithLogContext({runId:'run-3'},()=>emitNotification(document));
      assert.equal(saved.runId,'run-3');assert.match(saved.deliveryId,/^[0-9a-f-]{36}$/);
      assert.equal(queued.length,0);
    `);
    expect(JSON.stringify(logs)).not.toContain("synthetic-");
    expect(logs[0].event).toBe("notification.skipped");
    expect(logs[1]).toMatchObject({event: "notification.persisted", runId: "run-3"});
  });
});
