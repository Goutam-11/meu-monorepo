import { KiteConnect } from "kiteconnect";

type Kite = InstanceType<typeof KiteConnect>;
import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import { logger, errMeta } from "@/lib/logger";
import { emitNotification } from "@/lib/notifications";

const log = logger.child({ module: "kite-tokens" });

/**
 * Kite Connect access tokens are valid for ONE TRADING DAY: a token issued
 * on day D is rejected at ~06:00 IST (some sources say 07:30) the next day.
 * There is no refresh token in Kite Connect v3 — the only way to obtain an
 * access token is the browser login flow:
 *
 *   1. User opens  https://kite.zerodha.com/connect/login?v=3&api_key=<KEY>
 *   2. After login Zerodha redirects to the app's redirect URL with
 *      ?request_token=XXX&action=login&status=success
 *   3. Server exchanges it: generateSession(request_token, api_secret)
 *      → { access_token } — valid for the rest of the trading day.
 *
 * This module stores the issued token + issued date on the Exchange doc and
 * emits a WARNING notification (with the login URL) whenever a fresh login
 * is needed. The authenticated frontend exchange.kiteAuth procedure accepts
 * the request_token to complete step 3.
 */

/** Token is trusted only if issued "today" in IST and before 06:00 IST cutoff. */
function isTokenFresh(tokenIssuedAt: Date | undefined | null): boolean {
  if (!tokenIssuedAt) return false;
  const now = new Date();
  const ist = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  const todayKey = ist.format(now);
  const issuedKey = ist.format(tokenIssuedAt);
  if (issuedKey !== todayKey) return false;
  // After 06:00 IST, tokens issued the previous calendar day are dead —
  // but a token issued today is fine all day.
  return true;
}

export function kiteLoginUrl(apiKey: string): string {
  return `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
}

type ExchangeDoc = {
  _id: ObjectId | string;
  name?: string;
  apiKey?: string;
  secret?: string;
  accessToken?: string;
  tokenIssuedAt?: Date;
};

async function notifyTokenNeeded(db: Db, doc: ExchangeDoc): Promise<void> {
  await emitNotification({
    type: "WARNING",
    source: "AGENT",
    title: "Zerodha login required",
    code: "KITE_TOKEN_EXPIRED",
    userId: String((doc as { userId?: string }).userId ?? ""),
    exchangeId: String(doc._id),
    message:
      `Zerodha access token expired (valid for one trading day). ` +
      `Re-authenticate: open ${kiteLoginUrl(doc.apiKey ?? "")} and the request_token ` +
      `must be submitted on the exchange dashboard.`,
  }).catch((err) => log.warn(errMeta(err), "token notification failed"));
}

/**
 * Returns an authenticated KiteConnect instance for the exchange, or null
 * (and notifies the user) when a fresh daily login is required.
 */
export async function getKiteForExchange(
  db: Db,
  doc: ExchangeDoc,
): Promise<Kite | null> {
  const kc = new KiteConnect({ api_key: doc.apiKey ?? "" });

  if (doc.accessToken && isTokenFresh(doc.tokenIssuedAt)) {
    kc.setAccessToken(doc.accessToken);
    // Cheap validity probe — if the token was invalidated server-side
    // (logout elsewhere / manual revoke), fall through to re-auth.
    try {
      await kc.getProfile();
      return kc;
    } catch (err) {
      log.info({ ...errMeta(err), exchangeId: String(doc._id) }, "stored token rejected");
    }
  }

  await notifyTokenNeeded(db, doc);
  return null;
}

