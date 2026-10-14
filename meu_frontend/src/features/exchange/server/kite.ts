import "server-only";
import crypto from "crypto";
import prisma from "../../../lib/db";
import type { Balances, Position, Trade } from "ccxt";
import { decryptSecret, encryptSecret } from "../../../lib/security/encryption";
import { appLog } from "../../../lib/logging/app-logger";

/**
 * Zerodha Kite Connect server helpers for the frontend dashboard.
 *
 * The access token (valid for ONE trading day) is stored on the Exchange
 * row by the authenticated dashboard token flow — both services share the same Mongo
 * database. When the token is missing/expired we surface a `kiteTokenExpired`
 * flag instead of erroring, and the UI drives the re-auth flow.
 */

const KITE_BASE = "https://api.kite.trade";
const KITE_VERSION = "3";

export function isZerodhaExchange(name: string | null | undefined): boolean {
  return (name ?? "").toUpperCase() === "ZERODHA";
}

/** "YYYY-MM-DD" in IST. */
function istDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Token is trusted only if it was issued "today" in IST. */
export function isKiteTokenFresh(exchange: {
  accessToken?: string | null;
  tokenIssuedAt?: Date | null;
}): boolean {
  if (!exchange.accessToken || !exchange.tokenIssuedAt) return false;
  return istDateKey(new Date()) === istDateKey(new Date(exchange.tokenIssuedAt));
}

export function kiteLoginUrl(apiKey: string): string {
  return `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
}

type ExchangeRow = {
  id: string;
  userId: string;
  name: string | null;
  apiKey: string | null;
  secret: string | null;
  accessToken?: string | null;
  tokenIssuedAt?: Date | null;
};

async function kiteGet<T>(exchange: ExchangeRow, path: string): Promise<T> {
  const apiKey = decryptSecret(exchange.apiKey ?? "");
  const accessToken = decryptSecret(exchange.accessToken ?? "");
  const res = await fetch(`${KITE_BASE}${path}`, {
    headers: {
      Authorization: `token ${apiKey}:${accessToken}`,
      "X-Kite-Version": KITE_VERSION,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json()) as { status: string; data: T; message?: string };
  if (!res.ok || json.status !== "success") {
    throw new Error(json.message ?? `Kite API error (${res.status})`);
  }
  return json.data;
}

/** Exchange a login request_token for an access token and persist it. */
export async function exchangeKiteRequestToken(
  exchangeId: string,
  userId: string,
  requestToken: string,
): Promise<{ ok: boolean; error?: string }> {
  const exchange = await prisma.exchange.findFirst({
    where: { id: exchangeId, userId },
  });
  if (!exchange) return { ok: false, error: "Exchange not found" };
  if (!isZerodhaExchange(exchange.name)) {
    return { ok: false, error: "Not a Zerodha exchange" };
  }

  const apiKey = decryptSecret(exchange.apiKey ?? "");
  const secret = decryptSecret(exchange.secret ?? "");
  const checksum = crypto
    .createHash("sha256")
    .update(`${apiKey}${requestToken}${secret}`)
    .digest("hex");

  const body = new URLSearchParams({
    api_key: apiKey,
    request_token: requestToken,
    checksum,
  });

  const res = await fetch(`${KITE_BASE}/session/token`, {
    method: "POST",
    headers: {
      "X-Kite-Version": KITE_VERSION,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await res.json()) as {
    status: string;
    data?: { access_token: string };
    message?: string;
  };

  if (!res.ok || json.status !== "success" || !json.data?.access_token) {
    return { ok: false, error: json.message ?? "Kite session exchange failed" };
  }

  await prisma.exchange.update({
    where: { id: exchange.id },
    data: {
      accessToken: encryptSecret(json.data.access_token),
      tokenIssuedAt: new Date(),
    },
  });

  return { ok: true };
}

export type KiteDashboardData = {
  kiteTokenExpired: boolean;
  loginUrl: string | null;
  exchangeId: string;
  positions: Position[];
  trades: Trade[];
  balance: Balances;
  positionsError: string | null;
  tradesError: string | null;
  balanceError: string | null;
};

const EMPTY_BALANCE = { USD: { total: 0, free: 0, used: 0 }, info: {} } as unknown as Balances;

/**
 * Dashboard payload for a Zerodha exchange. When the daily token is absent
 * or expired, returns `{ kiteTokenExpired: true, loginUrl }` so the UI can
 * drive re-auth instead of showing broken data.
 */
export async function getKiteDashboardData(
  exchangeId: string,
  userId: string,
  requestId?: string,
): Promise<KiteDashboardData> {
  const exchange = await prisma.exchange.findFirst({
    where: { id: exchangeId, userId },
  });

  if (!exchange) {
    return {
      kiteTokenExpired: true,
      loginUrl: null,
      exchangeId,
      positions: [],
      trades: [],
      balance: EMPTY_BALANCE,
      positionsError: null,
      tradesError: null,
      balanceError: null,
    };
  }

  const loginUrl = kiteLoginUrl(decryptSecret(exchange.apiKey ?? ""));

  if (!isKiteTokenFresh(exchange)) {
    return {
      kiteTokenExpired: true,
      loginUrl,
      exchangeId: exchange.id,
      positions: [],
      trades: [],
      balance: EMPTY_BALANCE,
      positionsError: null,
      tradesError: null,
      balanceError: null,
    };
  }

  type KitePosition = {
    tradingsymbol: string;
    exchange: string;
    product: string;
    quantity: number;
    average_price: number;
    last_price: number;
    pnl: number;
  };
  type KiteOrder = {
    order_id: string;
    tradingsymbol: string;
    transaction_type: string;
    quantity: number;
    filled_quantity: number;
    average_price: number;
    order_timestamp: string | Date;
    order_type: string;
    status: string;
  };

  const errors: { positions?: string; trades?: string; balance?: string } = {};
  let positions: Position[] = [];
  let trades: Trade[] = [];
  let balance = { USD: { total: 0, free: 0, used: 0 }, info: {} } as unknown as Balances;

  try {
    const margins = await kiteGet<{
      equity: { available?: { live_balance?: number }; utilised?: { debits?: number }; net?: number };
    }>(exchange, "/user/margins");
    const equity = margins.equity ?? {};
    balance = {
      USD: {
        total: equity.net ?? 0,
        free: equity.available?.live_balance ?? 0,
        used: equity.utilised?.debits ?? 0,
      },
      info: equity,
    } as unknown as Balances;
  } catch (err) {
    appLog("warn", "exchange.snapshot.failed", { requestId, operation: "kite.balance", code: "BROKER_ERROR" });
    errors.balance = (err as Error).message;
    balance = EMPTY_BALANCE;
  }

  try {
    const pos = await kiteGet<{ net: KitePosition[] }>(exchange, "/portfolio/positions");
    positions = (pos.net ?? [])
      .filter((p) => p.quantity !== 0)
      .map((p) => {
        const notional = Math.abs(p.average_price * p.quantity) || 1;
        return {
          symbol: p.tradingsymbol,
          side: p.quantity > 0 ? "long" : "short",
          contracts: Math.abs(p.quantity),
          entryPrice: p.average_price,
          liquidationPrice: null,
          leverage: null,
          percentage: (p.pnl / notional) * 100,
          info: {
            unrealized_pnl: p.pnl,
            mark_price: p.last_price,
            margin: p.product,
          },
        } as unknown as Position;
      });
  } catch (err) {
    appLog("warn", "exchange.snapshot.failed", { requestId, operation: "kite.positions", code: "BROKER_ERROR" });
    errors.positions = (err as Error).message;
  }

  try {
    const orders = await kiteGet<KiteOrder[]>(exchange, "/orders");
    trades = (orders ?? [])
      .filter((o) => o.status === "COMPLETE")
      .map((o) => ({
        id: o.order_id,
        symbol: o.tradingsymbol,
        side: o.transaction_type?.toLowerCase() ?? "buy",
        type: o.order_type,
        amount: o.filled_quantity || o.quantity,
        price: o.average_price,
        cost: (o.average_price ?? 0) * (o.filled_quantity || o.quantity),
        fee: { cost: 0 },
        takerOrMaker: "taker",
        timestamp: new Date(o.order_timestamp).getTime(),
      } as unknown as Trade));
  } catch (err) {
    appLog("warn", "exchange.snapshot.failed", { requestId, operation: "kite.trades", code: "BROKER_ERROR" });
    errors.trades = (err as Error).message;
  }

  return {
    kiteTokenExpired: false,
    loginUrl,
    exchangeId: exchange.id,
    positions,
    trades,
    balance,
    positionsError: errors.positions ?? null,
    tradesError: errors.trades ?? null,
    balanceError: errors.balance ?? null,
  };
}
