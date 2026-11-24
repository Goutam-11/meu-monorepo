import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Separate process avoids the worker suite's logger mocks and verifies actual stdout.
function probe(script: string, env: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, NODE_ENV: "production", PRETTY_LOGS: "false", LOG_LEVEL: "info", ...env },
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  return result.stdout.trim().split("\n").map(line => JSON.parse(line));
}

describe("safe scheduler logging", () => {
  test("a thrown Error keeps its message in the log record", () => {
    const logs = probe(`
      import {logger} from './src/lib/logger';
      try { throw new Error('boom'); } catch (err) { logger.error({event:'run.failed', err}, 'Agent run failed'); }
    `);
    expect(logs[0]).toMatchObject({ event: "run.failed", err: { name: "Error", message: "boom" } });
  });

  test("stacks stay out of production logs but are available in development", () => {
    const script = `
      import {logger} from './src/lib/logger';
      try { throw new Error('boom'); } catch (err) { logger.error({err}, 'Agent run failed'); }
    `;
    expect(probe(script)[0].err.stack).toBeUndefined();
    expect(probe(script, { NODE_ENV: "development" })[0].err.stack).toContain("Error: boom");
    expect(probe(script, { LOG_ERROR_STACKS: "true" })[0].err.stack).toContain("Error: boom");
  });

  test("redacts nested fields, child bindings and arbitrary broker error text", () => {
    const logs = probe(`
      import {logger, errMeta} from './src/lib/logger';
      logger.child({accessToken:'synthetic-child-secret'}).info({
        apiKey:'synthetic-key', deep:{rows:[{refresh_token:'synthetic-refresh',headers:{cookie:'synthetic-cookie'},password:'synthetic-password'}]},
        ...errMeta(Object.assign(new Error('synthetic-message-secret'),{code:11000})),
        reason:'synthetic-reason-secret', response:'synthetic-response-secret', inputTokens:42, outputTokens:8, totalTokens:50
      }, 'audit.probe');
      logger.error({err:'synthetic-string-secret'}, 'audit.error');
    `);
    expect(JSON.stringify(logs)).not.toContain("synthetic-");
    expect(logs[0].err).toEqual({name: "Error", message: "[REDACTED]", code: 11000});
    expect(logs[0].totalTokens).toBe(50);
    expect(logs[0].inputTokens).toBe(42);
    expect(logs[0].accessToken).toBe("[REDACTED]");
    expect(logs[1].err).toBe("[REDACTED]");
  });

  test("tool logging preserves results and failures without exposing arguments or results", () => {
    const logs = probe(`
      import {instrumentTools} from './src/lib/toolLogging';
      const tools=instrumentTools({
        accepted:{execute:async input=>input},
        refused:{execute:async()=>({ok:false,error:'synthetic-result-secret'})},
        failed:{execute:async()=>{throw new Error('synthetic-thrown-secret')}},
      });
      const input={success:true,payload:'synthetic-input-secret'};
      if(await tools.accepted.execute(input)!==input) throw new Error('changed result');
      if((await tools.refused.execute()).ok!==false) throw new Error('changed refusal');
      try { await tools.failed.execute(); throw new Error('failure swallowed'); }
      catch(err) { if(err.message!=='synthetic-thrown-secret') throw err; }
    `);
    expect(logs.map(entry=>entry.event)).toEqual([
      "tool.started","tool.completed","tool.started","tool.unsuccessful","tool.started","tool.failed",
    ]);
    expect(JSON.stringify(logs)).not.toContain("synthetic-");
  });

  test("async run context stays isolated across concurrent runs and out of unrelated logs", () => {
    const logs = probe(`
      import {logger,runWithLogContext} from './src/lib/logger';
      await Promise.all(['a','b'].map(runId => runWithLogContext({runId,agentId:runId}, async()=>{
        await new Promise(resolve=>setTimeout(resolve,runId==='a'?10:0));
        logger.info({event:'tool.completed',expectedRun:runId}, 'audit.context');
      })));
      logger.info({event:'outside'}, 'audit.outside');
    `);
    for (const entry of logs.slice(0, 2)) {
      expect(entry.runId).toBe(entry.expectedRun);
      expect(entry.agentId).toBe(entry.expectedRun);
    }
    expect(logs[2].runId).toBeUndefined();
  });
});
