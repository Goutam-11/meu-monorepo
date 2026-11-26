/**
 * Capture the README screenshots from the real app.
 *
 * Requires the app on E2E_BASE_URL and a seeded database (see README.md).
 * The dashboard's `exData.getById` is fulfilled from this script, so the
 * images never depend on a live broker.
 *
 *   cd meu_frontend && bun run screenshots
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { base64, launchChrome, openPage } from "./cdp";
import { seedDemo } from "./seed";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUTPUT = process.env.E2E_SCREENSHOT_DIR ?? join(import.meta.dir, "../../../docs/images");

const day = 86_400_000;
const now = Date.now();
const trade = (daysAgo: number, symbol: string, side: "buy" | "sell", price: number, amount: number, fee: number) => ({
  timestamp: now - daysAgo * day,
  datetime: new Date(now - daysAgo * day).toISOString(),
  symbol,
  side,
  price,
  amount,
  cost: price * amount,
  fee,
});

const DEMO_DATA = {
  positions: [
    { symbol: "BTCUSD", side: "long", contracts: 2.5, entryPrice: 61_240.0, markPrice: 63_180.5, unrealizedPnl: 4_851.25, leverage: 5, marginMode: "isolated" },
    { symbol: "ETHUSD", side: "long", contracts: 12, entryPrice: 2_410.2, markPrice: 2_388.75, unrealizedPnl: -257.4, leverage: 3, marginMode: "isolated" },
    { symbol: "SOLUSD", side: "short", contracts: 45, entryPrice: 148.6, markPrice: 143.2, unrealizedPnl: 243.0, leverage: 2, marginMode: "cross" },
    { symbol: "XRPUSD", side: "long", contracts: 800, entryPrice: 0.582, markPrice: 0.5915, unrealizedPnl: 7.6, leverage: 2, marginMode: "isolated" },
  ],
  trades: [
    trade(1, "BTCUSD", "buy", 62_880.0, 0.8, 12.58),
    trade(2, "ETHUSD", "sell", 2_402.4, 4, 2.4),
    trade(3, "SOLUSD", "buy", 146.2, 30, 1.1),
    trade(4, "BTCUSD", "sell", 61_940.0, 0.5, 7.74),
    trade(5, "XRPUSD", "buy", 0.579, 500, 0.72),
    trade(6, "ETHUSD", "buy", 2_368.1, 6, 3.55),
    trade(7, "SOLUSD", "sell", 149.8, 18, 0.67),
    trade(8, "BTCUSD", "buy", 60_410.0, 0.4, 6.04),
    trade(9, "ETHUSD", "sell", 2_455.6, 3, 1.84),
    trade(10, "SOLUSD", "buy", 141.3, 22, 0.78),
    trade(11, "XRPUSD", "sell", 0.571, 300, 0.43),
    trade(12, "BTCUSD", "buy", 59_870.0, 0.3, 4.49),
  ],
  balance: { USD: { free: 8_230.15, used: 4_250.4, total: 12_480.55 } },
  positionsError: null,
  tradesError: null,
  balanceError: null,
  hasError: null,
};

function successBody() {
  return JSON.stringify([{ result: { data: { json: DEMO_DATA, meta: { values: {} } } } }]);
}

async function evaluate<T>(page: Awaited<ReturnType<typeof openPage>>, expression: string): Promise<T> {
  const response = await page.client.send<{ result: { value: T } }>("Runtime.evaluate", { expression, returnByValue: true });
  return response.result.value;
}

async function waitForText(page: Awaited<ReturnType<typeof openPage>>, text: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate<boolean>(page, `document.body ? document.body.innerText.includes(${JSON.stringify(text)}) : false`)) return true;
    await Bun.sleep(100);
  }
  return false;
}

async function capture(
  chrome: Awaited<ReturnType<typeof launchChrome>>,
  options: { name: string; path: string; cookie?: string; readyText: string; interceptBroker?: boolean },
) {
  const page = await openPage(chrome.port);
  try {
    await page.client.send("Page.enable");
    await page.client.send("Runtime.enable");
    await page.client.send("Network.enable");
    await page.client.send("Emulation.setDeviceMetricsOverride", { width: 1_440, height: 900, deviceScaleFactor: 2, mobile: false });
    if (options.cookie) {
      await page.client.send("Network.setCookie", { name: "better-auth.session_token", value: options.cookie.split("=")[1], url: BASE });
    }
    if (options.interceptBroker) {
      await page.client.send("Fetch.enable", { patterns: [{ urlPattern: "*exData.getById*", requestStage: "Request" }] });
      page.client.on("Fetch.requestPaused", (params) => {
        void page.client.send("Fetch.fulfillRequest", {
          requestId: params.requestId as string,
          responseCode: 200,
          responseHeaders: [{ name: "content-type", value: "application/json" }],
          body: base64(successBody()),
        });
      });
    }
    await page.client.send("Page.navigate", { url: `${BASE}${options.path}` });
    const ready = await waitForText(page, options.readyText, 30_000);
    if (!ready) throw new Error(`${options.name}: "${options.readyText}" never rendered`);
    await Bun.sleep(1_800); // settle chart and layout animations
    const shot = await page.client.send<{ data: string }>("Page.captureScreenshot", { format: "webp", quality: 84, captureBeyondViewport: false });
    const file = join(OUTPUT, `${options.name}.webp`);
    writeFileSync(file, Buffer.from(shot.data, "base64"));
    const bytes = Buffer.from(shot.data, "base64").byteLength;
    console.log(`${options.name.padEnd(10)} ${(bytes / 1024).toFixed(1)} KB  ${file}`);
  } finally {
    await page.close();
  }
}

async function main() {
  const seeded = await seedDemo();
  mkdirSync(OUTPUT, { recursive: true });
  const chrome = await launchChrome({ profileDir: join(import.meta.dir, "../../../.tmp/chrome-screenshots") });
  try {
    await capture(chrome, { name: "login", path: "/login", readyText: "Sign in" });
    await capture(chrome, { name: "dashboard", path: "/dashboard", cookie: seeded.cookie, readyText: "Total balance", interceptBroker: true });
    await capture(chrome, { name: "agents", path: "/agents", cookie: seeded.cookie, readyText: "BTC momentum" });
  } finally {
    await chrome.close();
  }
  console.log(`\nwrote screenshots to ${OUTPUT}`);
}

await main();
