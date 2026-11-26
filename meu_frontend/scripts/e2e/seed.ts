/**
 * Seed a local user/session and one exchange row for the dashboard E2E.
 *
 * Runs against the dev server's better-auth endpoints (no direct cookie
 * forging) and the Prisma client. Dummy broker credentials only: the E2E
 * intercepts every `exData.getById` call, so no venue is ever contacted.
 */
import prisma from "../../src/lib/db";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const EMAIL = process.env.E2E_EMAIL ?? "e2e-dashboard@example.test";
const PASSWORD = process.env.E2E_PASSWORD ?? "e2e-dashboard-password";
const NAME = "E2E Dashboard";

export type SeededDashboard = {
  userId: string;
  exchangeId: string;
  cookie: string;
};

async function signUp(): Promise<{ cookie: string }> {
  const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: NAME }),
  });
  if (!response.ok) {
    const body = await response.text();
    // A previous run already created the user: sign in instead.
    const signIn = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (!signIn.ok) throw new Error(`sign-up ${response.status}: ${body}; sign-in ${signIn.status}: ${await signIn.text()}`);
    return parseAuth(signIn);
  }
  return parseAuth(response);
}

function parseAuth(response: Response): { cookie: string } {
  const setCookie = response.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((entry) => entry.split(";")[0]).join("; ");
  if (!cookie) throw new Error("auth response did not set a session cookie");
  return { cookie };
}

export async function seedDashboard(): Promise<SeededDashboard> {
  const auth = await signUp();
  const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
  const existing = await prisma.exchange.findFirst({ where: { userId: user.id } });
  const exchange = existing ?? await prisma.exchange.create({
    data: {
      userId: user.id,
      name: "DELTA",
      displayName: "E2E Delta",
      apiKey: "dummy-api-key",
      secret: "dummy-secret",
      sandbox: true,
      urls: { public: "https://cdn-ind.testnet.deltaex.org", private: "https://cdn-ind.testnet.deltaex.org" },
    },
  });
  return { userId: user.id, exchangeId: exchange.id, cookie: auth.cookie };
}

if (import.meta.main) {
  const seeded = process.argv.includes("--demo") ? await seedDemo() : await seedDashboard();
  console.log(JSON.stringify(seeded, null, 2));
  await prisma.$disconnect();
}

// ---------------------------------------------------------------------------
// Demo data for the documentation screenshots. Separate user so the E2E seed
// above stays minimal and repeatable.
// ---------------------------------------------------------------------------

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL ?? "demo@meu.example";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "demo-screenshot-password";
const DEMO_NAME = "Aarav Mehta";

export type DemoSeed = { userId: string; deltaExchangeId: string; binanceExchangeId: string; cookie: string };

export async function seedDemo(): Promise<DemoSeed> {
  const signUp = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD, name: DEMO_NAME }),
  });
  const auth = signUp.ok
    ? parseAuth(signUp)
    : await (async () => {
        const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
        });
        if (!response.ok) throw new Error(`demo sign-in ${response.status}: ${await response.text()}`);
        return parseAuth(response);
      })();

  const user = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_EMAIL } });
  const connection = async (name: string, displayName: string) => {
    const existing = await prisma.exchange.findFirst({ where: { userId: user.id, name } });
    return existing ?? prisma.exchange.create({
      data: {
        userId: user.id,
        name,
        displayName,
        apiKey: "demo-api-key",
        secret: "demo-secret",
        sandbox: true,
        urls: { public: "https://demo.invalid", private: "https://demo.invalid" },
      },
    });
  };
  const delta = await connection("DELTA", "Delta India");
  const binance = await connection("BINANCE", "Binance USD-M");

  await prisma.agent.deleteMany({ where: { userId: user.id } });
  const now = Date.now();
  const agent = (id: string, name: string, symbols: string[], capital: number, cycles: number, strategy: "ALGO_TRADING" | "LLM_TRADING", executionMode: string | null, lastRunMinutesAgo: number, model?: string) => ({
    id,
    name,
    userId: user.id,
    exchangeId: delta.id,
    status: "RUNNING" as const,
    executionMode,
    market: { symbols, agentCycles: cycles },
    risk: { maxRiskPerTradePct: 1.5, maxDailyLossPct: 4, maxOpenPositions: 3, maxTradesPerDay: 10, maxPositionsOpenedPerDay: 5 },
    capital: { allocated: capital, currency: "USD" },
    strategy,
    type: "CRYPTO" as const,
    llmModel: model,
    lastRun: new Date(now - lastRunMinutesAgo * 60_000),
    nextRunAt: new Date(now + cycles * 1000),
    strategyStartedAt: new Date(now - 86_400_000),
  });
  await prisma.agent.createMany({
    data: [
      agent("6651a2c4d5e6f7a8b9c0d1e2", "BTC momentum", ["BTCUSD"], 2_500, 300, "ALGO_TRADING", "PAPER", 3),
      agent("6651a2c4d5e6f7a8b9c0d1e3", "ETH mean reversion", ["ETHUSD"], 1_200, 600, "ALGO_TRADING", "LIVE", 12),
      agent("6651a2c4d5e6f7a8b9c0d1e4", "SOL breakout", ["SOLUSD"], 800, 900, "LLM_TRADING", null, 26, "anthropic/claude-sonnet-4"),
    ],
  });

  return { userId: user.id, deltaExchangeId: delta.id, binanceExchangeId: binance.id, cookie: auth.cookie };
}
