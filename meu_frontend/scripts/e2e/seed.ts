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
  const seeded = await seedDashboard();
  console.log(JSON.stringify(seeded, null, 2));
  await prisma.$disconnect();
}
