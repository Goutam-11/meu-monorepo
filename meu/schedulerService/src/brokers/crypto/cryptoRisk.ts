import { marketDayStart, exchangeMarketTimezone } from '../../../../../shared/trading/marketDay';
import {loadBinanceTier} from '../binance/binanceExecution';
import { sizeEntry, validateSizingPolicy, selectAutomaticLeverage, type AutoSizing } from "../../../../../shared/trading/sizing";
import type { Exchange, MarketInterface, Order, Position } from "ccxt";
import { z } from "zod";
import { assertOrderAllowed, OrderRejectedError, type TradingPolicy } from "../../execution/tradeGuard";

import type { AccountRiskLimits } from "./cryptoAccount";

const deltaPage = z.object({
  success: z.literal(true), result: z.array(z.record(z.string(), z.unknown())),
  meta: z.object({ after: z.string().nullish() }).optional(),
});

export function cryptoDayStart(exchangeId: string, now = Date.now()) {
  return marketDayStart(now / 1000, exchangeMarketTimezone(exchangeId)) * 1000;
}

function number(value: unknown, label: string, minimum = -Infinity) {
  if (value === undefined || value === null || value === "" || typeof value === "boolean") {
    throw new OrderRejectedError(`Missing ${label}`);
  }
  const result = Number(value);
  if (!Number.isFinite(result) || result < minimum) throw new OrderRejectedError(`Invalid ${label}`);
  return result;
}

/** Delta's CCXT parser currently leaves short contracts signed and side as buy/sell. */
export function normalizeCryptoPositions(exchange: Exchange, positions: Position[]): Position[] {
  return positions.map(position => {
    if (exchange.id !== "delta") return position;
    const signed = number(position.info?.size ?? position.contracts, "position size");
    return {
      ...position, contracts: Math.abs(signed), side: signed < 0 ? "short" : "long", hedged: false,
      marginMode: position.info?.margin_mode ?? position.marginMode,
      unrealizedPnl: position.info?.unrealized_pnl === undefined ? position.unrealizedPnl : number(position.info.unrealized_pnl, "unrealized PnL"),
      markPrice: position.info?.mark_price === undefined ? position.markPrice : number(position.info.mark_price, "mark price", 0),
      collateral: position.info?.margin === undefined ? position.collateral : number(position.info.margin, "isolated margin", 0),
    };
  });
}

export function cryptoEntryMarket(exchange: Exchange, symbol: string, currency: string): MarketInterface {
  if (!["delta", "binance"].includes(exchange.id)) {
    throw new OrderRejectedError("Crypto entries currently support Delta India and Binance USD-M perpetuals");
  }
  const market = exchange.market(symbol);
  const settlement = exchange.id === "delta" ? "USD" : "USDT";
  if (!market || !market.active || !market.contract || !market.swap || !market.linear || market.inverse || market.quanto || market.info?.is_quanto === true ||
      market.quote !== settlement || market.settle !== settlement || currency !== settlement) {
    throw new OrderRejectedError(`Use an active linear ${settlement} perpetual and allocate capital in ${settlement}`);
  }
  number(market.contractSize, "contract size", Number.MIN_VALUE);
  return market;
}

/** Delta India omits marginMode from some leverage responses; read its account profile then. */
export async function fetchCryptoLeverage(exchange: Exchange, symbol: string) {
  const leverage = exchange.id === "binance" ? (await exchange.fetchLeverages([symbol]))[exchange.market(symbol).symbol] : await exchange.fetchLeverage(symbol);
  if (!leverage) throw new OrderRejectedError("Broker leverage response is missing this ticker");
  if (exchange.id !== "delta" || leverage.marginMode) return leverage;
  const mode = await exchange.fetchMarginMode(symbol);
  return { ...leverage, marginMode: mode.marginMode };
}

async function deltaRows(exchange: Exchange, path: string, params: Record<string, unknown>) {
  const rows: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  let after: string | undefined;
  for (let page = 0; page < 100; page++) {
    const response = deltaPage.parse(await exchange.request(path, "private", "GET", {
      ...params, page_size: 100, ...(after ? { after } : {}),
    }));
    rows.push(...response.result);
    const cursor = response.meta?.after;
    if (!response.result.length || (response.result.length < 100 && !cursor) || (response.meta && !cursor)) return rows;
    if (!cursor || seen.has(cursor)) throw new OrderRejectedError(`Incomplete Delta ${path} pagination`);
    seen.add(cursor);
    after = cursor;
  }
  throw new OrderRejectedError(`Delta ${path} exceeds the complete snapshot limit`);
}

export async function fetchCryptoOpenOrders(exchange: Exchange): Promise<Order[]> {
  if (exchange.id === "delta") {
    const raw = await deltaRows(exchange, "orders", { states: "open,pending" });
    return raw.map(order => exchange.parseOrder(order));
  }
  if (exchange.id === "binance") {
    // Binance now exposes regular and conditional/algo orders on separate endpoints.
    const params = { type: "future", subType: "linear" };
    const [regular, conditional] = await Promise.all([
      exchange.fetchOpenOrders(undefined, undefined, undefined, params),
      exchange.fetchOpenOrders(undefined, undefined, undefined, { ...params, trigger: true }),
    ]);
    return [...regular, ...conditional];
  }
  return exchange.fetchOpenOrders();
}

export type LossEvent = { timestamp: number; amount: number; productId?: string };
export type CryptoRiskSnapshot = {
  positions: Position[]; orders: Order[]; exposure: number; notionalExposure: number; marginUsed: number; existingLossReserve: number;
  availableFunds: number; openSymbols: Set<string>; dailyPnl: number; realizedLosses: number; leverage: Awaited<ReturnType<typeof fetchCryptoLeverage>>;
  walletEquity: number; dayStart: number; lossEvents: LossEvent[];
  metrics: {symbol:string;exposure:number;notional:number;margin:number;lossReserve:number}[];
  account?: { limits: AccountRiskLimits; equity:number; dailyEquity:number; realizedLosses:number;existingLossReserve:number;marginUsed:number;notionalExposure:number;openSymbols:Set<string> };
};

/** Losses and charges never get offset by winning trades or deposits. */
async function fetchDailyCryptoLossReport(exchange: Exchange, market: MarketInterface, now = Date.now()) {
  const start = cryptoDayStart(exchange.id, now);
  let losses = 0;
  const events: LossEvent[] = [];
  const seen = new Set<string>();
  if (exchange.id === "delta") {
    const assetId = number(market.info?.settling_asset?.id, "settlement asset id", 1);
    const rows = await deltaRows(exchange, "wallet/transactions", {
      asset_ids: String(assetId), start_time: start * 1000, end_time: now * 1000,
    });
    for (const row of rows) {
      const timestamp = Date.parse(String(row.created_at));
      if (!Number.isFinite(timestamp) || timestamp < start || timestamp > now) throw new OrderRejectedError("Invalid wallet transaction time");
      if (number(row.asset_id, "ledger asset id", 1) !== assetId) throw new OrderRejectedError("Unexpected ledger settlement asset");
      const id = String(row.id ?? row.uuid ?? "");
      if (!id || seen.has(id)) throw new OrderRejectedError("Missing or duplicate wallet transaction identity");
      seen.add(id);
      if (typeof row.transaction_type !== "string") throw new OrderRejectedError("Missing wallet transaction type");
      const amount = number(row.amount, "wallet transaction amount");
      // External cash movements do not count as trading PnL. Unknown debits do.
      if (!["deposit", "withdrawal", "sub_account_transfer", "sub_account_transfer_in", "sub_account_transfer_out"].includes(row.transaction_type)) {
        const loss = Math.max(0, -amount);
        losses += loss;
        if (loss > 0) events.push({ timestamp, amount: loss, ...(Number.isSafeInteger(Number(row.product_id)) && Number(row.product_id) > 0 ? { productId: String(row.product_id) } : {}) });
      }
    }
    return { total: losses, events };
  }
  if (exchange.id !== "binance") throw new OrderRejectedError("Daily loss accounting is unavailable for this exchange");
  for (let page = 1; page <= 100; page++) {
    const entries = await exchange.fetchLedger(undefined, start, 1000, { type: "future", subType: "linear", endTime: now, page });
    for (const entry of entries) {
      const timestamp = number(entry.timestamp, "income time", start);
      if (timestamp > now) throw new OrderRejectedError("Invalid income time");
      const id = `${entry.info?.incomeType ?? entry.type}:${entry.id ?? ""}`;
      if (!entry.id || seen.has(id)) throw new OrderRejectedError("Missing or duplicate income identity");
      seen.add(id);
      if (!["in", "out"].includes(entry.direction ?? "") || !entry.type) throw new OrderRejectedError("Unknown income direction or type");
      const amount = number(entry.amount, "income amount", 0);
      if (["transfer", "deposit", "withdrawal"].includes(entry.type)) continue;
      if (entry.direction === "out" && amount > 0) {
        if (entry.currency !== market.settle) throw new OrderRejectedError("Non-USDT fees/income cannot be valued safely");
        losses += amount;
        events.push({ timestamp, amount, ...(entry.info?.symbol ? {productId:String(entry.info.symbol)} : {}) });
      }
    }
    if (entries.length < 1000) return { total: losses, events };
  }
  throw new OrderRejectedError("Binance income history exceeds the complete snapshot limit");
}

export async function fetchDailyCryptoLoss(exchange: Exchange, market: MarketInterface, now = Date.now()) {
  return (await fetchDailyCryptoLossReport(exchange, market, now)).total;
}

export async function cryptoEntrySnapshot(exchange: Exchange, market: MarketInterface, policy: TradingPolicy): Promise<CryptoRiskSnapshot> {
  try {
    if(exchange.id==='binance' && policy.sizing?.mode==='STOP_LOSS')await loadBinanceTier(exchange,market.symbol);
    const params = exchange.id === "binance" ? { type: "future", subType: "linear", useV2: true } : {};
    const [balance, rawPositions, orders, losses, leverage] = await Promise.all([
      exchange.fetchBalance(params), exchange.fetchPositions(undefined, params), fetchCryptoOpenOrders(exchange),
      fetchDailyCryptoLossReport(exchange, market), fetchCryptoLeverage(exchange, market.symbol),
    ]);
    if (leverage.marginMode !== "isolated") throw new OrderRejectedError("Set isolated margin before opening crypto positions");
    number(leverage.longLeverage, "long leverage", 1);
    number(leverage.shortLeverage, "short leverage", 1);
    if (exchange.id === "delta") {
      const prefs = await exchange.request("users/trading_preferences", "private", "GET");
      if (prefs?.success !== true || prefs?.result?.default_auto_topup !== false) {
        throw new OrderRejectedError("Disable Delta default automatic margin top-up before opening positions");
      }
      if (prefs.result.deto_for_commission !== false) throw new OrderRejectedError("Use settlement-currency fees; DETO fees cannot be valued safely");
    } else {
      const mode = await exchange.fetchPositionMode(market.symbol) as { hedged?: boolean };
      if (mode.hedged !== false || balance.info?.multiAssetsMargin !== false) {
        throw new OrderRejectedError("Binance entries require one-way, single-asset USD-M mode");
      }
    }
    const positions = normalizeCryptoPositions(exchange, rawPositions);
    let exposure = 0;
    let notionalExposure = 0;
    let marginUsed = 0;
    let existingLossReserve = 0;
    const openSymbols = new Set<string>();
    const metrics: CryptoRiskSnapshot["metrics"] = [];
    for (const position of positions) {
      const contracts = number(position.contracts, "position contracts", 0);
      if (contracts === 0) continue;
      const positionMarket = cryptoEntryMarket(exchange, position.symbol, policy.capital.currency);
      if (position.marginMode !== "isolated" || position.hedged !== false || !["long", "short"].includes(position.side ?? "")) {
        throw new OrderRejectedError("Existing positions must be isolated and use one-way mode");
      }
      const autoTopup = exchange.id === "delta" ? position.info?.auto_topup : position.info?.isAutoAddMargin;
      if (autoTopup !== false && autoTopup !== "false") throw new OrderRejectedError("Existing position auto top-up must be disabled");
      const mark = position.markPrice ?? (await exchange.fetchTicker(position.symbol)).markPrice;
      const price = Math.max(number(mark, "mark price", Number.MIN_VALUE), number(position.entryPrice, "entry price", Number.MIN_VALUE));
      const collateral = number(position.collateral, "isolated collateral", 0);
      const notional = contracts * number(positionMarket.contractSize, "contract size", Number.MIN_VALUE) * price;
      exposure += Math.max(notional, collateral);
      notionalExposure += notional;
      marginUsed += collateral;
      // Do not assume unrelated positions have reliable stops. Reserve all their
      // isolated collateral, plus adverse unrealized PnL, against further entries.
      existingLossReserve += collateral + (policy.futures || policy.sizing?.mode === 'STOP_LOSS' ? Math.max(0, -number(position.unrealizedPnl, "unrealized PnL")) : 0);
      metrics.push({ symbol: position.symbol, exposure: Math.max(notional, collateral), notional, margin: collateral, lossReserve: collateral + (policy.futures || policy.sizing?.mode === 'STOP_LOSS' ? Math.max(0, -number(position.unrealizedPnl, "unrealized PnL")) : 0) });
      openSymbols.add(position.symbol);
    }
    for (const order of orders) {
      if (order.reduceOnly === true || order.info?.reduce_only === true || order.info?.closePosition === true || order.info?.closePosition === "true") continue;
      const remaining = number(order.remaining, "pending order amount", 0);
      if (remaining === 0) continue;
      const pendingMarket = cryptoEntryMarket(exchange, order.symbol, policy.capital.currency);
      if (order.type !== "limit" || order.triggerPrice || order.stopPrice || !["buy", "sell"].includes(order.side ?? "")) {
        throw new OrderRejectedError("Unbounded pending crypto entry prevents risk accounting");
      }
      const price = number(order.price, "pending entry price", Number.MIN_VALUE);
      const pendingLeverage = order.symbol === market.symbol ? leverage : await fetchCryptoLeverage(exchange, order.symbol);
      if (pendingLeverage.marginMode !== "isolated") throw new OrderRejectedError("Pending entries must use isolated margin");
      const pendingNotional = remaining * number(pendingMarket.contractSize, "contract size", Number.MIN_VALUE) * price;
      const pendingFeeRate = Math.max(number(pendingMarket.info?.taker_commission_rate ?? pendingMarket.taker, "pending fee rate", 0), (policy.futures?.feeBps ?? policy.sizing?.feeBps ?? 0) / 10000, 0.001);
      if (pendingFeeRate > 0.05) throw new OrderRejectedError("Invalid pending fee rate");
      const pendingCostRate = pendingFeeRate + (policy.futures?.slippageBps ?? policy.sizing?.slippageBps ?? 0) / 10000;
      // Unknown pending stops receive no risk credit. Reserve isolated margin
      // and costs using up to twice the entry price for an adverse short exit.
      const pendingMargin = pendingNotional / number(order.side === "buy" ? pendingLeverage.longLeverage : pendingLeverage.shortLeverage, "pending leverage", 1) + 3 * pendingNotional * pendingCostRate;
      exposure += pendingNotional;
      notionalExposure += pendingNotional;
      marginUsed += pendingMargin;
      existingLossReserve += pendingMargin;
      metrics.push({ symbol: order.symbol, exposure: pendingNotional, notional: pendingNotional, margin: pendingMargin, lossReserve: pendingMargin });
      openSymbols.add(order.symbol);
    }
    const availableFunds = number((balance.free as unknown as Record<string, unknown>)?.[policy.capital.currency], "available settlement balance", 0);
    return { positions, orders, exposure, notionalExposure, marginUsed, existingLossReserve,
      availableFunds, openSymbols, dailyPnl: -losses.total - exposure, realizedLosses: losses.total, leverage,
      walletEquity: Number((balance.total as unknown as Record<string, unknown>)?.[policy.capital.currency]),
      dayStart: cryptoDayStart(exchange.id), lossEvents: losses.events, metrics };
  } catch (error) {
    if (error instanceof OrderRejectedError) throw error;
    // All reads happen before createOrder. A failed read is a refusal, not an uncertain order.
    throw new OrderRejectedError(`Could not verify crypto account risk: ${error instanceof Error ? error.message : "snapshot failed"}`);
  }
}

function accountHeadroom(snapshot: CryptoRiskSnapshot, symbol: string) {
  const account = snapshot.account;
  if (!account) return { margin: Infinity, notional: Infinity, loss: Infinity };
  const values = [account.equity, account.dailyEquity, account.realizedLosses, account.existingLossReserve, account.marginUsed, account.notionalExposure];
  if (!values.every(n => Number.isFinite(n) && n >= 0) || account.equity <= 0 || account.dailyEquity <= 0) throw new OrderRejectedError("Invalid account-wide risk snapshot");
  const positions = account.openSymbols.size - (account.openSymbols.has(symbol) ? 1 : 0);
  if (positions >= account.limits.maxOpenPositions) throw new OrderRejectedError("Account-wide maximum open positions reached");
  const room = { margin: account.equity * account.limits.maxMarginPct / 100 - account.marginUsed,
    notional: account.equity * account.limits.maxNotionalMultiple - account.notionalExposure,
    loss: Math.min(account.equity, account.dailyEquity) * account.limits.maxDailyLossPct / 100 - account.realizedLosses - account.existingLossReserve };
  if (room.margin <= 0 || room.notional <= 0 || room.loss <= 0) throw new OrderRejectedError("Account-wide margin, exposure or daily loss budget exhausted");
  return room;
}

export function sizeCryptoEntry(
  exchange: Exchange, market: MarketInterface, policy: TradingPolicy,
  snapshot: Awaited<ReturnType<typeof cryptoEntrySnapshot>>, price: number, requestedAmount?: number,
  protection?: { side: "buy" | "sell"; stopPrice: number }, calculateTarget=false,
) {
  if (policy.sizing) {
    try { validateSizingPolicy(policy.sizing); } catch (error) { throw new OrderRejectedError((error as Error).message); }
    if (policy.sizing.mode === 'STOP_LOSS') {
      if (!['delta','binance'].includes(exchange.id)) throw new OrderRejectedError('Native-stop sizing is unavailable on this broker adapter; no order was sent');
      const p = policy.sizing;
      if (p.leverageMode === 'AUTO' && (!Number.isInteger(snapshot.leverage.longLeverage) || snapshot.leverage.longLeverage! < 1 || snapshot.leverage.longLeverage! > p.leverage || snapshot.leverage.shortLeverage !== snapshot.leverage.longLeverage)) throw new OrderRejectedError('Verified broker leverage must be within the saved ceiling');
      policy = {...policy, futures: {
        leverage:p.leverageMode === 'AUTO' ? snapshot.leverage.longLeverage : p.leverage, maxMarginPct:p.maxMarginPct,
        maxNotional:policy.capital.allocated * Math.min(p.maxExposureMultiple,p.leverageMode === 'AUTO' ? snapshot.leverage.longLeverage! : p.leverage),
        maintenanceMarginRate:exchange.id==='binance' ? number(market.info?.meuRiskTier?.maintenanceMarginRate,'Binance maintenance margin',Number.MIN_VALUE) : number(market.info?.maintenance_margin, 'maintenance margin', Number.MIN_VALUE) / 100,
        feeBps:p.feeBps, slippageBps:p.slippageBps,
      }};
    }
  }
  const scopedSymbol = policy.symbols.find(symbol => exchange.market(symbol)?.symbol === market.symbol);
  if (!scopedSymbol) throw new OrderRejectedError("Symbol outside agent scope");
  number(price, "entry price", Number.MIN_VALUE);
  const accountRoom = accountHeadroom(snapshot, market.symbol);
  const contractSize = number(market.contractSize, "contract size", Number.MIN_VALUE);
  const feeRate = number(market.info?.taker_commission_rate ?? market.taker, "fee rate", 0);
  if (feeRate > 0.05) throw new OrderRejectedError("Invalid fee rate");
  if (policy.futures) return sizeProtectedFuturesEntry(exchange, market, policy, snapshot, price, requestedAmount, protection, calculateTarget);
  if (policy.sizing) {
    const p = policy.sizing;
    const costFactor = 1 + 2 * (Math.max(feeRate, p.feeBps / 10000, 0.001) + p.slippageBps / 10000);
    try {
      const result = sizeEntry({
        riskBudget:Math.min(policy.capital.allocated * policy.risk.maxRiskPerTradePct / 100,
          policy.capital.allocated * policy.risk.maxDailyLossPct / 100 - Math.max(0, -snapshot.dailyPnl), accountRoom.loss),
        marginBudget:Math.min(policy.capital.allocated * p.maxMarginPct / 100 - snapshot.exposure, snapshot.availableFunds, accountRoom.margin),
        exposureBudget:Math.min(policy.capital.allocated * p.maxExposureMultiple - snapshot.exposure, accountRoom.notional),
        unitRisk:price * contractSize * costFactor, unitMargin:price * contractSize * costFactor,
        unitNotional:price * contractSize * costFactor,
        roundDown:n => Number(exchange.amountToPrecision(market.symbol, n)),
        minAmount:market.limits.amount?.min ?? (exchange.id === 'delta' ? 1 : 0), maxAmount:market.limits.amount?.max,
        minNotional:(market.limits.cost?.min ?? 0) * costFactor, maxNotional:market.limits.cost?.max === undefined ? undefined : market.limits.cost.max * costFactor,
        requestedAmount,
      });
      assertOrderAllowed(policy, scopedSymbol, result.notional, {...snapshot,
        openPositions:snapshot.openSymbols.size - (snapshot.openSymbols.has(market.symbol) ? 1 : 0)});
      return {...result, notional:result.notional / costFactor, reservedNotional:result.notional, price, settlement:market.settle};
    } catch (error) { throw new OrderRejectedError((error as Error).message); }
  }
  // Reserve both sides' fees, with a minimum buffer for fee taxes/rate differences.
  const costFactor = 1 + 2 * Math.max(feeRate, 0.001);
  const budget = Math.max(0, Math.min(
    policy.capital.allocated * policy.risk.maxRiskPerTradePct / 100,
    policy.capital.allocated - snapshot.exposure,
    snapshot.availableFunds,
    accountRoom.margin, accountRoom.notional, accountRoom.loss,
    policy.capital.allocated * policy.risk.maxDailyLossPct / 100 - Math.max(0, -snapshot.dailyPnl),
  ));
  let maxAmount: number;
  let amount: number;
  try {
    maxAmount = Number(exchange.amountToPrecision(market.symbol, budget / (price * contractSize * costFactor)));
    amount = Number(exchange.amountToPrecision(market.symbol, requestedAmount ?? maxAmount));
  } catch {
    throw new OrderRejectedError("Allocated risk budget is below the exchange amount precision");
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > maxAmount ||
      (requestedAmount !== undefined && (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || requestedAmount > maxAmount))) {
    throw new OrderRejectedError(`Entry amount exceeds the bounded size of ${maxAmount} contracts or is below precision`);
  }
  const notional = amount * contractSize * price;
  const minAmount = market.limits.amount?.min ?? 0;
  const maxMarketAmount = market.limits.amount?.max ?? Infinity;
  if (amount < minAmount || amount > maxMarketAmount || notional < (market.limits.cost?.min ?? 0) || notional > (market.limits.cost?.max ?? Infinity)) {
    throw new OrderRejectedError("Entry size violates exchange minimum/maximum amount or notional");
  }
  const reservedNotional = notional * costFactor;
  assertOrderAllowed(policy, scopedSymbol, reservedNotional, {
    ...snapshot,
    // Adding to an existing symbol does not open an additional simultaneous position.
    openPositions: snapshot.openSymbols.size - (snapshot.openSymbols.has(market.symbol) ? 1 : 0),
  });
  return { amount, maxAmount, notional, reservedNotional, price, settlement: market.settle };
}

function sizeProtectedFuturesEntry(
  exchange: Exchange, market: MarketInterface, policy: TradingPolicy,
  snapshot: Awaited<ReturnType<typeof cryptoEntrySnapshot>>, price: number,
  requestedAmount: number | undefined, protection: { side: "buy" | "sell"; stopPrice: number } | undefined, calculateTarget:boolean,
) {
  const accountRoom = accountHeadroom(snapshot, market.symbol);
  const limits = policy.futures!;
  const allocated = number(policy.capital.allocated, "allocation", Number.MIN_VALUE);
  if (!["delta","binance"].includes(exchange.id) || !protection || !["buy", "sell"].includes(protection.side))
    throw new OrderRejectedError("Leveraged sizing requires a confirmed Delta native-stop configuration");
  if (![limits.leverage, limits.maxMarginPct, limits.maxNotional, limits.maintenanceMarginRate, limits.feeBps, limits.slippageBps].every(Number.isFinite) ||
      limits.leverage < 1 || limits.leverage > 20 || limits.maxMarginPct <= 0 || limits.maxMarginPct > 100 ||
      limits.maxNotional <= 0 || limits.maxNotional > allocated * limits.leverage ||
      limits.maintenanceMarginRate <= 0 || limits.maintenanceMarginRate >= 1 / limits.leverage ||
      limits.feeBps < 0 || limits.feeBps > 100 || limits.slippageBps < 0 || limits.slippageBps > 100 ||
      ![policy.risk.maxRiskPerTradePct, policy.risk.maxDailyLossPct].every(n => Number.isFinite(n) && n > 0 && n <= 100) ||
      ![policy.risk.maxOpenPositions, policy.risk.maxTradesPerDay, policy.risk.maxPositionsOpenedPerDay].every(n => Number.isSafeInteger(n) && n > 0))
    throw new OrderRejectedError("Invalid futures constraints");
  if (snapshot.leverage.marginMode !== "isolated" || snapshot.leverage.longLeverage !== limits.leverage || snapshot.leverage.shortLeverage !== limits.leverage)
    throw new OrderRejectedError("Delta isolated leverage differs from the saved strategy");
  const stopPrice = number(protection.stopPrice, "native stop price", Number.MIN_VALUE);
  const stopDistance = protection.side === "buy" ? price - stopPrice : stopPrice - price;
  if (stopDistance <= 0) throw new OrderRejectedError("Native stop must be on the loss side of the entry");
  // Delta metadata expresses maintenance margin as a percentage, not a fraction.
  const maintenance = exchange.id === "binance" ? number(market.info?.meuRiskTier?.maintenanceMarginRate,"maintenance margin",Number.MIN_VALUE) : number(market.info?.maintenance_margin, "maintenance margin", Number.MIN_VALUE) / 100;
  if (maintenance !== limits.maintenanceMarginRate) throw new OrderRejectedError("Maintenance margin changed; review required");
  const initialMargin = exchange.id === "binance" ? 1/number(market.info?.meuRiskTier?.maxLeverage,"maximum leverage",1) : number(market.info?.initial_margin, "initial margin", Number.MIN_VALUE) / 100;
  if (initialMargin > 1 / limits.leverage) throw new OrderRejectedError("Configured leverage exceeds the product initial-margin limit");
  // Stay entirely below Delta's base-margin scaling threshold. Missing metadata
  // refuses entry; higher-size margin tiers are intentionally unsupported here.
  const baseTierNotional = number(exchange.id === "binance" ? market.info?.meuRiskTier?.maxNotional : market.info?.max_leverage_notional, "base margin-tier notional", Number.MIN_VALUE);
  if(exchange.id === "delta") {
    number(market.info?.initial_margin_scaling_factor, "initial margin scaling factor", 0);
    number(market.info?.maintenance_margin_scaling_factor, "maintenance margin scaling factor", 0);
  }
  const contractSize = number(market.contractSize, "contract size", Number.MIN_VALUE);
  const feeRate = Math.max(number(market.info?.taker_commission_rate ?? market.taker, "fee rate", 0), limits.feeBps / 10000, 0.001);
  if (feeRate > 0.05) throw new OrderRejectedError("Invalid fee rate");
  const slippage = limits.slippageBps / 10000;
  // Reserve entry/exit costs against both risk and available collateral. The
  // higher exit value also covers a short's adverse stop price and GST buffer.
  const costPerUnit = (price + Math.max(price, stopPrice)) * (feeRate + slippage);
  const unitNotional = contractSize * price;
  const unitRisk = contractSize * (stopDistance + costPerUnit);
  const unitMargin = unitNotional / limits.leverage + contractSize * costPerUnit;
  // Stop must be comfortably before a simplified isolated liquidation boundary.
  // This is a rejection check, not a guarantee of an exchange liquidation price.
  if (stopDistance / price + costPerUnit / price + 2 * maintenance >= 1 / limits.leverage)
    throw new OrderRejectedError("Native stop is too close to or beyond the isolated liquidation boundary");
  const remainingDailyLoss = allocated * policy.risk.maxDailyLossPct / 100 - snapshot.realizedLosses - snapshot.existingLossReserve;
  const marginRoom = allocated * limits.maxMarginPct / 100 - snapshot.marginUsed;
  const exposureRoom = Math.min(limits.maxNotional, baseTierNotional) - snapshot.notionalExposure;
  if (![snapshot.realizedLosses, snapshot.existingLossReserve, snapshot.marginUsed, snapshot.notionalExposure, snapshot.availableFunds].every(n => Number.isFinite(n) && n >= 0))
    throw new OrderRejectedError("A complete futures account snapshot is required");
  let result: ReturnType<typeof sizeEntry>;
  try {
    result = sizeEntry({
      riskBudget:Math.min(allocated * policy.risk.maxRiskPerTradePct / 100, remainingDailyLoss, accountRoom.loss),
      marginBudget:Math.min(marginRoom, snapshot.availableFunds, accountRoom.margin),
      exposureBudget:Math.min(exposureRoom, accountRoom.notional),
      unitRisk, unitMargin, unitNotional,
      minAmount:exchange.id === "delta" ? Math.max(1, market.limits.amount?.min ?? 1) : market.limits.amount?.min, maxAmount:market.limits.amount?.max,
      minNotional:market.limits.cost?.min, maxNotional:market.limits.cost?.max,
      roundDown:n => Number(exchange.amountToPrecision(market.symbol, n)), requestedAmount, calculateTarget,
    });
  } catch (error) { throw new OrderRejectedError((error as Error).message); }
  const {amount, maxAmount, notional} = result;
  if (exchange.id === 'delta' && !Number.isSafeInteger(amount)) throw new OrderRejectedError('Delta entries must use whole contracts');
  const openPositions = snapshot.openSymbols.size - (snapshot.openSymbols.has(market.symbol) ? 1 : 0);
  if (openPositions >= policy.risk.maxOpenPositions) throw new OrderRejectedError("Maximum open positions reached");
  return { amount, maxAmount, targetAmount:result.targetAmount, notional, reservedNotional: notional, price, settlement: market.settle,
    riskAtStop: amount * unitRisk, marginRequired: amount * unitMargin, remainingDailyLoss, limitingConstraint:result.limitingConstraint };
}

/** What-if calculation only. The final entry re-reads actual broker leverage and account state. */
export function previewAutomaticCryptoLeverage(exchange: Exchange, market: MarketInterface, policy: TradingPolicy,
  snapshot: CryptoRiskSnapshot, price: number, protection: {side:'buy'|'sell';stopPrice:number}, autoSizing:AutoSizing | undefined=policy.sizing?.autoSizing) {
  if ((!policy.futures && !(policy.sizing?.mode === 'STOP_LOSS' && policy.sizing.leverageMode === 'AUTO')) || !['delta','binance'].includes(exchange.id)) throw new OrderRejectedError('Automatic leverage requires a protected supported broker policy');
  const ceiling=policy.sizing?.leverage ?? policy.futures!.leverage;
  let refusal='No valid contract size';
  const selected=selectAutomaticLeverage(ceiling,autoSizing,leverage=>{
    try {
      const trial=policy.sizing ? {...policy,sizing:{...policy.sizing,leverage,maxExposureMultiple:Math.min(policy.sizing.maxExposureMultiple,leverage)}} : {...policy,futures:{...policy.futures!,leverage,maxNotional:Math.min(policy.futures!.maxNotional,policy.capital.allocated*leverage)}};
      const sizing=sizeCryptoEntry(exchange,market,trial,{...snapshot,leverage:{...snapshot.leverage,longLeverage:leverage,shortLeverage:leverage}},price,undefined,protection,autoSizing==='TARGET_RISK');
      if(!('riskAtStop' in sizing) || !('targetAmount' in sizing))throw new OrderRejectedError('Protected sizing did not return a verified stop-loss budget');
      return sizing;
    } catch(error) {
      if(!(error instanceof OrderRejectedError))throw error;
      refusal=error.message;
      return undefined;
    }
  });
  if(selected)return selected;
  throw new OrderRejectedError(`No tradable quantity within the ${ceiling}× leverage ceiling: ${refusal}. Risk, margin and exposure limits were not increased.`);
}
