import type { Exchange } from "ccxt";
import { cryptoEntryMarket, fetchCryptoLeverage, fetchCryptoOpenOrders, normalizeCryptoPositions } from "../crypto/cryptoRisk";
import { OrderRejectedError } from "../../execution/tradeGuard";

type DeltaStartOptions = {
  allowAccountModeChange: boolean;
  requireFlatSymbol: boolean;
  beforeWrite?: (change: "marginMode" | "leverage") => Promise<void>;
};

function acknowledged(response: unknown, expectedMode?: string) {
  if (!response || typeof response !== "object") return false;
  const body = response as { success?: unknown; result?: { margin_mode?: unknown } };
  return body.success === true && (expectedMode === undefined || body.result?.margin_mode === expectedMode);
}

/** Configure and verify the Delta account settings required by one live strategy. */
export async function prepareDeltaStrategyAccount(
  exchange: Exchange,
  symbol: string,
  leverage: number,
  options: DeltaStartOptions,
) {
  if (exchange.id !== "delta") throw new OrderRejectedError("Live strategy setup currently supports Delta India only");
  if (!Number.isInteger(leverage) || leverage < 1 || leverage > 20) throw new OrderRejectedError("Saved leverage must be an integer from 1× to 20×");

  const [modeRead, rawPositions, orders, preferences] = await Promise.all([
    exchange.fetchMarginMode(symbol), exchange.fetchPositions(), fetchCryptoOpenOrders(exchange),
    exchange.request("users/trading_preferences", "private", "GET"),
  ]);
  if (preferences?.success !== true || preferences?.result?.default_auto_topup !== false || preferences?.result?.deto_for_commission !== false) {
    throw new OrderRejectedError("Disable Delta automatic margin top-up and DETO commission payments before starting");
  }

  const canonicalSymbol = cryptoEntryMarket(exchange, symbol, "USD").symbol;
  const positions = normalizeCryptoPositions(exchange, rawPositions);
  const openPositions = positions.filter(position => Number(position.contracts) > 0);
  if (openPositions.some(position => !position.symbol) || orders.some(order => !order.symbol)) throw new OrderRejectedError("Complete position and order symbols are required before preparing settings");
  const accountFlat = openPositions.length === 0 && orders.length === 0;
  const symbolHasExposure = openPositions.some(position => position.symbol === exchange.market(symbol).symbol);
  const symbolHasOrders = orders.some(order => order.symbol === exchange.market(symbol).symbol);
  if (options.requireFlatSymbol && (symbolHasExposure || symbolHasOrders)) throw new OrderRejectedError("Target symbol must be flat with no pending orders before its first live start");
  let changedMarginMode = false;
  let changedLeverage = false;

  const checkFlatAgain = async (accountWide: boolean) => {
    const [latestPositions, latestOrders] = await Promise.all([exchange.fetchPositions(), fetchCryptoOpenOrders(exchange)]);
    const nonzero = normalizeCryptoPositions(exchange, latestPositions).filter(position => Number(position.contracts) > 0);
    if (nonzero.some(position => !position.symbol) || latestOrders.some(order => !order.symbol)) throw new OrderRejectedError("Cannot verify current account exposure before updating settings");
    if (accountWide ? nonzero.length > 0 || latestOrders.length > 0 : nonzero.some(position => position.symbol === canonicalSymbol) || latestOrders.some(order => order.symbol === canonicalSymbol))
      throw new OrderRejectedError("Account exposure changed; no margin or leverage update sent");
  };

  if (modeRead.marginMode !== "isolated") {
    if (!(["cross", "portfolio"].includes(String(modeRead.marginMode))) || !options.allowAccountModeChange) {
      throw new OrderRejectedError("Delta account margin mode must be isolated. Pause other live agents before an account-wide margin-mode change");
    }
    if (!accountFlat) throw new OrderRejectedError("Delta account must have no positions or open orders before changing account-wide margin mode");
    const accountId = modeRead.info?.id;
    if (!((typeof accountId === "string" && /^[0-9]+$/.test(accountId)) || (typeof accountId === "number" && Number.isSafeInteger(accountId) && accountId > 0)))
      throw new OrderRejectedError("Delta account identity could not be verified before changing margin mode");
    await checkFlatAgain(true);
    await options.beforeWrite?.("marginMode");
    const response = await exchange.request("users/margin_mode", "private", "PUT", { margin_mode: "isolated", subaccount_user_id: String(accountId) });
    if (!acknowledged(response, "isolated")) throw new OrderRejectedError("Delta did not confirm the isolated margin mode change");
    const verified = await exchange.fetchMarginMode(canonicalSymbol);
    if (verified.marginMode !== "isolated") throw new OrderRejectedError("Delta margin mode readback did not confirm isolated mode");
    changedMarginMode = true;
  }

  const currentLeverage = await fetchCryptoLeverage(exchange, canonicalSymbol);
  if (currentLeverage.longLeverage !== leverage || currentLeverage.shortLeverage !== leverage) {
    if (symbolHasExposure || symbolHasOrders) {
      throw new OrderRejectedError("Target symbol must have no positions or open orders before changing leverage");
    }
    await checkFlatAgain(false);
    await options.beforeWrite?.("leverage");
    const response = await exchange.setLeverage(leverage, canonicalSymbol);
    if (!acknowledged(response)) throw new OrderRejectedError("Delta did not confirm the leverage change");
    changedLeverage = true;
  }

  const [verifiedMode, verifiedLeverage] = await Promise.all([
    exchange.fetchMarginMode(canonicalSymbol), fetchCryptoLeverage(exchange, canonicalSymbol),
  ]);
  if (verifiedMode.marginMode !== "isolated" || verifiedLeverage.marginMode !== "isolated" ||
      verifiedLeverage.longLeverage !== leverage || verifiedLeverage.shortLeverage !== leverage) {
    throw new OrderRejectedError("Delta account settings readback does not match the saved isolated leverage");
  }
  return { marginMode: "isolated" as const, leverage, changedMarginMode, changedLeverage };
}
