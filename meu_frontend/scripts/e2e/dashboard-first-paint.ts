/**
 * Browser E2E for issue #4: prove the dashboard's first paint is decoupled
 * from the broker round-trip.
 *
 * Scenarios
 *   1. snapshot-first-paint   cached snapshot renders before a slow broker reply
 *   2. failed-refresh         a failed refresh keeps the snapshot + shows the
 *                             "Showing last known values" notice, no skeleton
 *   3. error-backoff          polling slows to 60 s after the failure settles
 *   4. hidden-tab             polling stops while the tab is hidden and resumes
 *
 * The broker is never contacted: every `exData.getById` request is fulfilled
 * from this script. Requires a running app + seeded DB; see README.md.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { base64, launchChrome, openPage, type ChromeHandle, type PageHandle } from "./cdp";
import { seedDashboard } from "./seed";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ARTIFACT_DIR = process.env.E2E_ARTIFACT_DIR ?? join(import.meta.dir, "../../../.tmp/e2e");

const SNAPSHOT_TOTAL = 4242.42;
const SNAPSHOT_MARKER = "$4,242.42";
const SNAPSHOT_DATA = {
  positions: [
    { symbol: "E2E-BTCUSD", contracts: 3, side: "long", entryPrice: 100, markPrice: 110, unrealizedPnl: 30, leverage: 5 },
    { symbol: "E2E-ETHUSD", contracts: 1, side: "short", entryPrice: 2000, markPrice: 1980, unrealizedPnl: 20, leverage: 2 },
  ],
  trades: [],
  balance: { USD: { free: 1000, used: SNAPSHOT_TOTAL - 1000, total: SNAPSHOT_TOTAL } },
};

type BrokerBehavior = { kind: "success"; delayMs: number } | { kind: "error"; delayMs: number };

type Assertion = { label: string; ok: boolean; detail: string };
type Scenario = {
  name: string;
  assertions: Assertion[];
  metrics: Record<string, number | string | number[]>;
};

const results: Scenario[] = [];
let failures = 0;

function assert(scenario: Scenario, label: string, ok: boolean, detail: string) {
  scenario.assertions.push({ label, ok, detail });
  if (!ok) failures++;
}

async function evaluate<T>(page: PageHandle, expression: string): Promise<T> {
  const response = await page.client.send<{ result: { value: T }; exceptionDetails?: { text?: string } }>("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(`evaluate failed: ${response.exceptionDetails.text}\n${expression}`);
  return response.result.value;
}

async function waitFor(page: PageHandle, expression: string, timeoutMs: number, intervalMs = 50): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate<boolean>(page, `Boolean(${expression})`)) return true;
    await Bun.sleep(intervalMs);
  }
  return false;
}

function initScript(exchangeId: string): string {
  const snapshot = JSON.stringify({
    version: 1,
    fetchedAt: Date.now() - 45_000,
    source: "broker",
    data: SNAPSHOT_DATA,
  });
  return `(() => {
  try {
    localStorage.setItem(${JSON.stringify(`meu:exchange-snapshot:${exchangeId}`)}, ${JSON.stringify(snapshot)});
  } catch (error) {}
  const state = { fcp: null, snapshotVisibleAt: null, skeletonSeen: false, noticeAt: null, hiddenSeen: null };
  Object.defineProperty(window, "__e2e", { value: state, configurable: true });
  const marker = ${JSON.stringify(SNAPSHOT_MARKER)};
  const check = () => {
    const body = document.body;
    if (!body) return;
    if (state.snapshotVisibleAt === null && body.innerText.includes(marker)) state.snapshotVisibleAt = performance.now();
    if (state.noticeAt === null && body.innerText.includes("Showing last known values")) state.noticeAt = performance.now();
    if (!state.skeletonSeen && document.querySelector('[aria-label="Loading portfolio"]')) state.skeletonSeen = true;
    state.hiddenSeen = document.visibilityState;
  };
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (entry.name === "first-contentful-paint") state.fcp = entry.startTime;
    }).observe({ type: "paint", buffered: true });
  } catch (error) {}
  document.addEventListener("DOMContentLoaded", () => {
    try { new MutationObserver(check).observe(document.documentElement, { subtree: true, childList: true, characterData: true }); } catch (error) {}
    check();
  });
  const loop = () => { check(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();`;
}

function successBody() {
  return JSON.stringify([{ result: { data: { json: { ...SNAPSHOT_DATA, positionsError: null, tradesError: null, balanceError: null, hasError: null }, meta: { values: {} } } } }]);
}

function errorBody() {
  return JSON.stringify([
    {
      error: {
        json: {
          message: "E2E simulated broker outage",
          code: -32603,
          data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
        },
      },
    },
  ]);
}

type Prepared = {
  page: PageHandle;
  requestTimes: number[];
  fulfilledTimes: number[];
  requestsAt: (expression: string) => Promise<number>;
  close: () => Promise<void>;
};

/** Open a page, install the snapshot + instrumentation, intercept the broker. */
async function preparePage(chrome: ChromeHandle, exchangeId: string, cookie: string, behavior: BrokerBehavior): Promise<Prepared> {
  const page = await openPage(chrome.port);
  const requestTimes: number[] = [];
  const fulfilledTimes: number[] = [];

  await page.client.send("Page.enable");
  await page.client.send("Runtime.enable");
  await page.client.send("Network.enable");
  await page.client.send("Network.setCookie", { name: "better-auth.session_token", value: cookie.split("=")[1], url: BASE });
  await page.client.send("Page.addScriptToEvaluateOnNewDocument", { source: initScript(exchangeId) });
  await page.client.send("Fetch.enable", { patterns: [{ urlPattern: "*exData.getById*", requestStage: "Request" }] });

  page.client.on("Fetch.requestPaused", (params) => {
    const requestId = params.requestId as string;
    requestTimes.push(Date.now());
    void (async () => {
      if (behavior.delayMs > 0) await Bun.sleep(behavior.delayMs);
      if (behavior.kind === "success") {
        await page.client.send("Fetch.fulfillRequest", {
          requestId,
          responseCode: 200,
          responseHeaders: [
            { name: "content-type", value: "application/json" },
            { name: "cache-control", value: "no-store" },
          ],
          body: base64(successBody()),
        });
      } else {
        await page.client.send("Fetch.fulfillRequest", {
          requestId,
          responseCode: 500,
          responseHeaders: [{ name: "content-type", value: "application/json" }],
          body: base64(errorBody()),
        });
      }
      fulfilledTimes.push(Date.now());
    })();
  });

  await page.client.send("Page.navigate", { url: `${BASE}/dashboard` });
  return {
    page,
    requestTimes,
    fulfilledTimes,
    requestsAt: async (expression: string) => evaluate<number>(page, expression),
    close: async () => {
      await page.close();
    },
  };
}

async function scenarioFirstPaint(chrome: ChromeHandle, exchangeId: string, cookie: string): Promise<void> {
  const scenario: Scenario = { name: "snapshot-first-paint", assertions: [], metrics: {} };
  const brokerDelayMs = 3_000;
  const prepared = await preparePage(chrome, exchangeId, cookie, { kind: "success", delayMs: brokerDelayMs });
  try {
    const painted = await waitFor(prepared.page, "window.__e2e && window.__e2e.snapshotVisibleAt !== null", 10_000);
    // Wait for the delayed broker reply so its resource-timing entry exists.
    let replied = false;
    const replyDeadline = Date.now() + 15_000;
    while (Date.now() < replyDeadline) {
      if (prepared.fulfilledTimes.length > 0) {
        replied = true;
        break;
      }
      await Bun.sleep(50);
    }
    const state = await evaluate<{ fcp: number | null; snapshotVisibleAt: number | null; skeletonSeen: boolean }>(prepared.page, "window.__e2e");
    const resource = await evaluate<{ responseEnd: number } | null>(
      prepared.page,
      `(() => { const entries = performance.getEntriesByType("resource").filter((entry) => entry.name.includes("exData.getById")); const entry = entries[entries.length - 1]; return entry ? { responseEnd: entry.responseEnd } : null; })()`,
    );
    const brokerRespondedAt = resource?.responseEnd ?? null;

    assert(scenario, "broker reply observed", replied, replied ? "intercepted reply fulfilled" : "no reply within 15 s");
    assert(scenario, "snapshot value rendered", painted, `marker ${SNAPSHOT_MARKER} ${painted ? "seen" : "missing"}`);
    assert(scenario, "no loading skeleton with a snapshot", state.skeletonSeen === false, `skeleton seen: ${state.skeletonSeen}`);
    if (state.snapshotVisibleAt !== null) {
      assert(
        scenario,
        "paint precedes the broker response",
        brokerRespondedAt !== null && state.snapshotVisibleAt < brokerRespondedAt,
        `paint ${state.snapshotVisibleAt.toFixed(1)} ms vs response ${brokerRespondedAt === null ? "unknown" : brokerRespondedAt.toFixed(1)} ms`,
      );
      assert(
        scenario,
        "paint precedes the broker response by a wide margin",
        brokerRespondedAt !== null && brokerRespondedAt - state.snapshotVisibleAt > 1_000,
        `${brokerRespondedAt === null ? "unknown" : (brokerRespondedAt - state.snapshotVisibleAt).toFixed(1)} ms before the reply`,
      );
    }
    assert(scenario, "FCP recorded", state.fcp !== null, `FCP ${state.fcp === null ? "missing" : `${state.fcp.toFixed(1)} ms`}`);

    scenario.metrics = {
      brokerDelayMs,
      fcpMs: state.fcp === null ? -1 : Number(state.fcp.toFixed(1)),
      snapshotVisibleMs: state.snapshotVisibleAt === null ? -1 : Number(state.snapshotVisibleAt.toFixed(1)),
      brokerResponseMs: brokerRespondedAt === null ? -1 : Number(brokerRespondedAt.toFixed(1)),
      brokerRequests: prepared.requestTimes.length,
    };
  } finally {
    await prepared.close();
  }
  results.push(scenario);
}

async function scenarioFailedRefreshAndBackoff(chrome: ChromeHandle, exchangeId: string, cookie: string): Promise<void> {
  const scenario: Scenario = { name: "failed-refresh-and-backoff", assertions: [], metrics: {} };
  const prepared = await preparePage(chrome, exchangeId, cookie, { kind: "error", delayMs: 250 });
  try {
    const noticed = await waitFor(
      prepared.page,
      `(() => { const alert = [...document.querySelectorAll('[role="alert"]')].find((node) => node.textContent.includes("Showing last known values from")); return Boolean(alert); })()`,
      15_000,
    );
    const state = await evaluate<{ snapshotVisibleAt: number | null; skeletonSeen: boolean }>(prepared.page, "window.__e2e");
    const noticeText = await evaluate<string>(
      prepared.page,
      `(() => { const alert = [...document.querySelectorAll('[role="alert"]')].find((node) => node.textContent.includes("Showing last known values from")); return alert ? alert.textContent : ""; })()`,
    );

    assert(scenario, "failed refresh shows the last-known-values notice", noticed, noticed ? "notice visible" : "notice missing");
    assert(scenario, "notice names the last successful snapshot", /Showing last known values from .+/.test(noticeText), noticeText.replace(/\s+/g, " ").trim().slice(0, 140) || "no notice text");
    assert(scenario, "snapshot painted before the failure arrived", state.snapshotVisibleAt !== null, `marker ${SNAPSHOT_MARKER} ${state.snapshotVisibleAt === null ? "missing" : "painted"}`);
    assert(scenario, "no skeleton during the failed refresh", state.skeletonSeen === false, `skeleton seen: ${state.skeletonSeen}`);

    // Retries run with exponential backoff; wait until the client is quiet
    // before measuring whether the 60 s error interval holds.
    let quietSince = Date.now();
    let lastCount = prepared.requestTimes.length;
    const quietDeadline = Date.now() + 20_000;
    while (Date.now() < quietDeadline) {
      await Bun.sleep(200);
      if (prepared.requestTimes.length !== lastCount) {
        lastCount = prepared.requestTimes.length;
        quietSince = Date.now();
        continue;
      }
      if (Date.now() - quietSince >= 6_000) break;
    }
    const settledCount = prepared.requestTimes.length;
    const observeWindowMs = 10_000;
    await Bun.sleep(observeWindowMs);
    const requestsAfterSettle = prepared.requestTimes.length - settledCount;
    const gaps = prepared.requestTimes.slice(1).map((time, index) => time - prepared.requestTimes[index]);

    assert(scenario, "initial failure retried twice", prepared.requestTimes.length >= 3, `${prepared.requestTimes.length} requests`);
    assert(scenario, "no 5 s polling after the failure settles", requestsAfterSettle === 0, `${requestsAfterSettle} requests in the ${observeWindowMs / 1000} s after settle`);
    assert(
      scenario,
      "retry gaps stay short, then polling stops",
      gaps.length >= 2 && Math.max(...gaps) < 5_000,
      `gaps ${gaps.map((gap) => `${gap} ms`).join(", ") || "none"}`,
    );

    scenario.metrics = {
      brokerRequests: prepared.requestTimes.length,
      requestsAfterSettle,
      observeWindowMs,
      retryGapsMs: gaps,
    };
  } finally {
    await prepared.close();
  }
  results.push(scenario);
}

async function scenarioHiddenTab(chrome: ChromeHandle, exchangeId: string, cookie: string): Promise<void> {
  const scenario: Scenario = { name: "hidden-tab", assertions: [], metrics: {} };
  const prepared = await preparePage(chrome, exchangeId, cookie, { kind: "success", delayMs: 0 });
  try {
    const painted = await waitFor(prepared.page, "window.__e2e && window.__e2e.snapshotVisibleAt !== null", 10_000);
    // Wait for the first live response so the 5 s interval is armed.
    await Bun.sleep(1_500);
    const requestsBeforeHide = prepared.requestTimes.length;

    await evaluate(
      prepared.page,
      `(() => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
        return document.visibilityState;
      })()`,
    );
    await Bun.sleep(12_000);
    const requestsWhileHidden = prepared.requestTimes.length - requestsBeforeHide;

    await evaluate(
      prepared.page,
      `(() => {
        delete document.visibilityState;
        delete document.hidden;
        document.dispatchEvent(new Event("visibilitychange"));
        return document.visibilityState;
      })()`,
    );
    const unhiddenAt = Date.now();
    const requestsAtUnhide = prepared.requestTimes.length;
    const resumeDeadline = unhiddenAt + 8_000;
    let resumeDelayMs = -1;
    while (Date.now() < resumeDeadline) {
      if (prepared.requestTimes.length > requestsAtUnhide) {
        resumeDelayMs = prepared.requestTimes[prepared.requestTimes.length - 1] - unhiddenAt;
        break;
      }
      await Bun.sleep(100);
    }
    const resumed = resumeDelayMs >= 0;

    assert(scenario, "dashboard painted from the snapshot", painted, painted ? "marker visible" : "marker missing");
    assert(scenario, "no polling while the tab is hidden", requestsWhileHidden === 0, `${requestsWhileHidden} requests during 12 s hidden`);
    assert(scenario, "polling resumes when the tab becomes visible", resumed, resumed ? "request after unhide" : "no request within 8 s");
    assert(scenario, "one request before hiding", requestsBeforeHide >= 1, `${requestsBeforeHide} requests`);

    scenario.metrics = {
      requestsBeforeHide,
      requestsWhileHidden,
      resumeWithinMs: resumeDelayMs,
    };
  } finally {
    await prepared.close();
  }
  results.push(scenario);
}

async function warmUp(chrome: ChromeHandle, exchangeId: string, cookie: string): Promise<void> {
  const prepared = await preparePage(chrome, exchangeId, cookie, { kind: "success", delayMs: 0 });
  try {
    await waitFor(prepared.page, "window.__e2e && window.__e2e.snapshotVisibleAt !== null", 20_000);
  } finally {
    await prepared.close();
  }
}

async function preflight() {
  let response: Response;
  try {
    response = await fetch(`${BASE}/api/health`);
  } catch (error) {
    throw new Error(`no app at ${BASE}; start it first (see scripts/e2e/README.md): ${String(error)}`);
  }
  if (!response.ok) throw new Error(`${BASE}/api/health returned ${response.status}; is the seeded database reachable?`);
}

async function main() {
  await preflight();
  const seeded = await seedDashboard();
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const chrome = await launchChrome({ profileDir: join(ARTIFACT_DIR, "chrome-profile") });
  try {
    await warmUp(chrome, seeded.exchangeId, seeded.cookie);
    await scenarioFirstPaint(chrome, seeded.exchangeId, seeded.cookie);
    await scenarioFailedRefreshAndBackoff(chrome, seeded.exchangeId, seeded.cookie);
    await scenarioHiddenTab(chrome, seeded.exchangeId, seeded.cookie);
  } finally {
    await chrome.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    browser: "Chromium (Playwright build) via CDP, --headless=new --no-sandbox",
    scenarios: results,
    failedAssertions: failures,
  };
  const artifact = join(ARTIFACT_DIR, "dashboard-first-paint.json");
  writeFileSync(artifact, `${JSON.stringify(report, null, 2)}\n`);

  for (const scenario of results) {
    console.log(`\n${scenario.assertions.every((item) => item.ok) ? "PASS" : "FAIL"} ${scenario.name}`);
    for (const item of scenario.assertions) console.log(`  ${item.ok ? "ok  " : "FAIL"} ${item.label} — ${item.detail}`);
    console.log(`  metrics: ${JSON.stringify(scenario.metrics)}`);
  }
  console.log(`\nartifact: ${artifact}`);
  console.log(`failed assertions: ${failures}`);
  process.exit(failures === 0 ? 0 : 1);
}

await main();
