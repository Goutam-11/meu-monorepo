import {prepareBinanceAccount,submitBinanceProtectedEntry} from '../../brokers/binance/binanceExecution';
import { instrumentTools } from "@/lib/toolLogging";
import { CryptoSettingsUncertainError, DeltaLeverageUncertainError, OrderRejectedError, type ExecutionSafety } from "../tradeGuard";
import { cryptoEntryMarket, cryptoEntrySnapshot, fetchCryptoOpenOrders, normalizeCryptoPositions, sizeCryptoEntry, previewAutomaticCryptoLeverage, fetchCryptoLeverage } from "../../brokers/crypto/cryptoRisk";
import { createHash, randomUUID } from "node:crypto";
import { tool } from "ai";
import { InsufficientFunds, InvalidOrder, type Exchange } from "ccxt";
import z from "zod";
import { logger, errMeta } from "@/lib/logger";

import { prepareDeltaStrategyAccount } from "../../brokers/delta/deltaStart";

const log = logger.child({ module: "cryptoTools" });

export function getCryptoTools({ exchange, safety }: { exchange: Exchange; safety?: ExecutionSafety }) {
  const orderPrefix = `m${createHash("sha256").update(safety?.agentId ?? "").digest("hex").slice(0, 12)}-`;
  function scopedSymbol(symbol: string) {
    if (!safety) throw new OrderRejectedError("Execution authorization is required");
    const canonical = exchange.market(symbol)?.symbol ?? symbol;
    if (!safety.policy.symbols.some(allowed => (exchange.market(allowed)?.symbol ?? allowed) === canonical)) {
      throw new OrderRejectedError("Symbol outside agent scope");
    }
    return canonical;
  }
  async function entryQuote(symbol: string, side: "buy" | "sell", requestedPrice?: number) {
    const ticker = await exchange.fetchTicker(symbol);
    const quote = requestedPrice ?? (exchange.id === "binance" && safety?.policy.sizing?.mode === "STOP_LOSS" ? (side === "buy" ? ticker.ask : ticker.bid) : (side === "buy" ? ticker.bid : ticker.ask));
    if (!Number.isFinite(quote) || !quote || quote <= 0) throw new OrderRejectedError("A valid entry limit price is required");
    return Number(exchange.priceToPrecision(symbol, quote));
  }
  function nativeStopPrice(symbol: string, side: "buy" | "sell", price: number, fraction?: number) {
    if (!fraction || !Number.isFinite(fraction) || fraction <= 0 || fraction >= 1)
      throw new OrderRejectedError("Native-stop entries require a stop_loss price fraction between 0 and 1");
    const stop = Number(exchange.priceToPrecision(symbol, price * (side === "buy" ? 1 - fraction : 1 + fraction)));
    if (!(stop > 0) || (side === "buy" ? stop >= price : stop <= price))
      throw new OrderRejectedError("Native stop is within one price tick or on the wrong side");
    return stop;
  }
  async function closePosition(symbol: string, amount: number) {
    if (!safety) throw new OrderRejectedError("Execution authorization is required");
    symbol = scopedSymbol(symbol);
    await safety.assertActive();
    const clientOrderId = `${orderPrefix}${randomUUID().replaceAll("-", "").slice(0,16)}`;
    return safety.executeOrder({ symbol, amount, reduceOnly: true, action:'crypto-reduction', clientOrderId }, async () => {
      const market = exchange.market(symbol);
      if (!market.contract) throw new OrderRejectedError("Reduce-only position closure requires a supported contract market");
      const positions = normalizeCryptoPositions(exchange, await exchange.fetchPositions([symbol]));
      const position = positions.find(p => p.symbol === symbol && Number(p.contracts) > 0);
      if (!position || position.hedged === true || !["long", "short"].includes(position.side ?? "") || !Number.isFinite(amount) || amount <= 0 || amount > Number(position.contracts)) {
        throw new OrderRejectedError("A matching one-way position and bounded close amount are required");
      }
      const side = position.side === "short" ? "buy" : "sell";
      await safety.crypto?.assertOwnsPosition(symbol, position);
      await safety.crypto?.recordSubmission(clientOrderId, symbol, side, amount, true);
      let order;
      try { order = await exchange.createOrder(symbol, "market", side, amount, undefined, { reduceOnly: true, ...(safety.crypto ? { clientOrderId } : {}) }); }
      catch (error) {
        if (error instanceof InvalidOrder || error instanceof InsufficientFunds) {
          await safety.crypto?.recordRefused(clientOrderId);
          throw new OrderRejectedError("Broker refused the position reduction");
        }
        throw error;
      }
      await safety.crypto?.recordAccepted(clientOrderId, order);
      return order;
    });
  }
  return instrumentTools({
    createBuyOrder: tool({
      description: "Open or add to a long (buy) or short (sell) linear perpetual on Delta India or Binance USD-M. Uses isolated margin, server sizing, account-wide risk snapshots and daily counters. Delta and full-notional Binance entries use post-only LIMIT; native-stop Binance entries use IOC LIMIT and can take liquidity or expire unfilled. Amount is contracts; omit it for the deterministic maximum. Delta requires stop_loss as a price fraction (0.01 = 1%) and supports optional take_profit as a price fraction. Binance full-notional entries omit both fractions; native-stop Binance uses terminal IOC fills followed by verified conditional stop/target orders. Opposite-side entries must use closePosition first. Do not retry a refused order in this run.",
      inputSchema: z.object({
        symbol: z.string(), side: z.enum(["buy", "sell"]), amount: z.number().positive().optional(),
        price: z.number().positive().optional(), stop_loss: z.number().positive().lt(1).optional(),
        take_profit: z.number().positive().lt(1).optional(),
      }),
      execute: async (input) => {
        try {
          if (!safety) throw new OrderRejectedError("Execution authorization is required");
          const symbol = scopedSymbol(input.symbol);
          const market = cryptoEntryMarket(exchange, symbol, safety.policy.capital.currency);
          if (exchange.id === "delta" && (!input.stop_loss || input.stop_loss >= 1)) throw new OrderRejectedError("Native-stop entries require a stop_loss price fraction between 0 and 1");
          if (exchange.id === "binance" && safety.policy.sizing?.mode!=="STOP_LOSS" && (input.stop_loss !== undefined || input.take_profit !== undefined)) throw new OrderRejectedError("Binance attached bracket stops are not supported; no order was sent");
          if(exchange.id==='binance' && safety.policy.sizing?.mode==='STOP_LOSS') {
            const price=await entryQuote(symbol,input.side,input.price);
            const stopPrice=nativeStopPrice(symbol,input.side,price,input.stop_loss);
            const takeProfitPrice=input.take_profit===undefined ? undefined : Number(exchange.priceToPrecision(symbol,price*(input.side==='buy'?1+input.take_profit:1-input.take_profit)));
            if(takeProfitPrice!==undefined&&(!(takeProfitPrice>0)||(input.side==='buy'?takeProfitPrice<=price:takeProfitPrice>=price)))throw new OrderRejectedError('Invalid native take-profit price');
            return {success:true,data:await submitBinanceProtectedEntry(exchange,safety,{symbol,side:input.side,price,stopPrice,takeProfitPrice,amount:input.amount})};
          }
          const clientOrderId = `${orderPrefix}${randomUUID().replaceAll("-", "").slice(0, 16)}`;
          const result = await safety.executeOrder({ ...input, symbol, clientOrderId, action: "crypto-entry" }, async () => {
            let price: number;
            try { price = await entryQuote(symbol, input.side, input.price); }
            catch (error) { throw new OrderRejectedError(`Entry quote unavailable: ${error instanceof Error ? error.message : "invalid quote"}`); }
            let snapshot = await cryptoEntrySnapshot(exchange, market, safety.policy);
            if (safety.crypto) snapshot = await safety.crypto.scopeSnapshot(snapshot, market);
            const opposite = input.side === "buy" ? "short" : "long";
            if (snapshot.positions.some(p => p.symbol === symbol && Number(p.contracts) > 0 && p.side === opposite) ||
                snapshot.orders.some(o => o.symbol === symbol && Number(o.remaining) > 0 && !o.reduceOnly && !o.info?.reduce_only && o.side !== input.side)) {
              throw new OrderRejectedError("Close the opposite position or cancel its pending entry before opening this side");
            }
            const params: Record<string, unknown> = { clientOrderId };
            if (exchange.id === "delta") {
              params.post_only = true;
              params.bracket_stop_trigger_method = "mark_price";
              try {
                const stop = nativeStopPrice(symbol, input.side, price, input.stop_loss);
                params.bracket_stop_loss_price = String(stop);
                if (input.take_profit !== undefined) {
                  const target = Number(exchange.priceToPrecision(symbol, price * (input.side === "buy" ? 1 + input.take_profit : 1 - input.take_profit)));
                  if (!(target > 0) || (input.side === "buy" ? target <= price : target >= price)) throw new Error("target is within one price tick");
                  params.bracket_take_profit_price = String(target);
                }
              } catch (error) { throw new OrderRejectedError(`Invalid bracket prices: ${error instanceof Error ? error.message : "precision failed"}`); }
            } else {
              params.postOnly = true;
            }
            const sizing = sizeCryptoEntry(exchange, market, safety.policy, snapshot, price, input.amount,
              exchange.id === "delta" ? { side: input.side, stopPrice: Number(params.bracket_stop_loss_price) } : undefined);
            await safety.assertActive();
            await safety.reserveDailyEntry(symbol, !snapshot.openSymbols.has(symbol));
            await safety.crypto?.recordSubmission(clientOrderId, symbol, input.side, sizing.amount, false);
            let order;
            try { order = await exchange.createOrder(symbol, "limit", input.side, sizing.amount, price, params); }
            catch (error) {
              if (error instanceof InvalidOrder || error instanceof InsufficientFunds) {
                await safety.crypto?.recordRefused(clientOrderId);
                throw new OrderRejectedError(`Broker refused entry: ${error.message}`);
              }
              throw error;
            }
            if (!order.id) throw new Error("Broker response has no order identity; reconciliation required");
            if (exchange.id === "delta" && Number(order.info?.bracket_stop_loss_price) !== Number(params.bracket_stop_loss_price)) {
              throw new Error(`Delta order ${order.id} did not confirm its stop-loss bracket; reconciliation required`);
            }
            if (exchange.id === "delta" && params.bracket_take_profit_price !== undefined && Number(order.info?.bracket_take_profit_price) !== Number(params.bracket_take_profit_price)) {
              throw new Error(`Delta order ${order.id} did not confirm its take-profit bracket; reconciliation required`);
            }
            await safety.crypto?.recordAccepted(clientOrderId, order);
            return { order, sizing };
          });
          return { success: true, data: result };
        } catch (error) {
          if (error instanceof OrderRejectedError) log.info({ ...errMeta(error) }, "crypto entry refused");
          else log.error({ ...errMeta(error) }, "crypto entry failed");
          return { success: false, error: error instanceof Error ? error.message : "Entry failed" };
        }
      },
    }),
    calculatePositionSize: tool({
      description: "Preview deterministic entry sizing in contracts from a fresh account risk snapshot. Does not reserve counters or send orders.",
      inputSchema: z.object({ symbol: z.string(), side: z.enum(["buy", "sell"]), price: z.number().positive().optional(), stop_loss: z.number().positive().lt(1).optional() }),
      execute: async ({ symbol: inputSymbol, side, price: requestedPrice, stop_loss }) => {
        try {
          if (!safety) throw new OrderRejectedError("Execution authorization is required");
          await safety.assertActive();
          const symbol = scopedSymbol(inputSymbol);
          const market = cryptoEntryMarket(exchange, symbol, safety.policy.capital.currency);
          const price = await entryQuote(symbol, side, requestedPrice);
          let snapshot = await cryptoEntrySnapshot(exchange, market, safety.policy);
          if (safety.crypto) snapshot = await safety.crypto.scopeSnapshot(snapshot, market);
          const protection = safety.policy.futures || safety.policy.sizing?.mode === 'STOP_LOSS' ? { side, stopPrice: nativeStopPrice(symbol, side, price, stop_loss) } : undefined;
          return { success: true, data: sizeCryptoEntry(exchange, market, safety.policy, snapshot, price, undefined, protection) };
        } catch (error) { log.warn(errMeta(error), "Sizing failed"); return { success: false, error: 'Sizing preview failed', ...(error instanceof OrderRejectedError ? {guardReason:error.message} : {}) }; }
      },
    }),
    fetchOrders: tool({
      description: "List pending orders created by this agent for its allowed symbols.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          if (!safety) throw new OrderRejectedError("Execution authorization is required");
          const allowed = new Set(safety.policy.symbols.map(scopedSymbol));
          return { success: true, data: (await fetchCryptoOpenOrders(exchange)).filter(order => allowed.has(order.symbol) && order.clientOrderId?.startsWith(orderPrefix)) };
        } catch (error) { log.warn(errMeta(error), "Order lookup failed"); return { success: false, error: error instanceof Error ? error.message : "Order lookup failed" }; }
      },
    }),
    cancelOrder: tool({
      description: "Cancel a pending order created by this agent. Order ID and symbol are required.",
      inputSchema: z.object({ symbol: z.string(), order_id: z.string() }),
      execute: async ({ symbol: inputSymbol, order_id }) => {
        try {
          if (!safety) throw new OrderRejectedError("Execution authorization is required");
          const symbol = scopedSymbol(inputSymbol);
          const data = await safety.executeOrder({ symbol, order_id, action: "cancel" }, async () => {
            let order;
            try { order = (await fetchCryptoOpenOrders(exchange)).find(o => o.id === order_id && o.symbol === symbol); }
            catch { throw new OrderRejectedError("Could not verify pending order ownership; no cancellation sent"); }
            if (!order?.clientOrderId?.startsWith(orderPrefix)) throw new OrderRejectedError("Order was not created by this agent or is no longer pending");
            if((order.triggerPrice||order.stopPrice)&& (await exchange.fetchPositions([symbol])).some(p=>p.symbol===symbol&&Number(p.contracts)>0))throw new OrderRejectedError('Close the protected position before canceling its stop');
            return exchange.cancelOrder(order_id, symbol, order.triggerPrice||order.stopPrice ? { trigger: true } : {});
          });
          return { success: true, data };
        } catch (error) { log.warn(errMeta(error), "Cancellation failed"); return { success: false, error: error instanceof Error ? error.message : "Cancellation failed" }; }
      },
    }),
    setLeverage: tool({
      description: "Supported native-stop AUTO only: calculate and verify the lowest leverage funding the saved sizing objective (TARGET_RISK maximizes bounded quantity; MINIMUM_ORDER or legacy chooses the first tradable size) within the user's saved ceiling. Requires a flat ticker and no pending orders. Provide entry side and stop_loss fraction. Never increases risk, margin or exposure limits, changes account margin mode, or places an entry. Call calculatePositionSize again after success.",
      inputSchema: z.object({symbol:z.string(),side:z.enum(['buy','sell']),stop_loss:z.number().positive().lt(1)}),
      execute: async ({symbol:inputSymbol,side,stop_loss}) => {
        try {
          if (!safety || !['delta','binance'].includes(exchange.id) || safety.policy.sizing?.mode!=='STOP_LOSS' || safety.policy.sizing.leverageMode!=='AUTO')
            throw new OrderRejectedError('Enable supported native-stop sizing and automatic leverage in the agent settings first');
          await safety.assertActive();
          const symbol=scopedSymbol(inputSymbol),market=cryptoEntryMarket(exchange,symbol,safety.policy.capital.currency);
          const price=await entryQuote(symbol,side);
          let snapshot=await cryptoEntrySnapshot(exchange,market,safety.policy);
          if(safety.crypto)snapshot=await safety.crypto.scopeSnapshot(snapshot,market);
          if(snapshot.positions.some(p=>p.symbol===symbol&&Number(p.contracts)>0)||snapshot.orders.some(o=>o.symbol===symbol&&Number(o.remaining)>0))
            throw new OrderRejectedError('Leverage changes require a flat ticker with no pending orders');
          const selected=previewAutomaticCryptoLeverage(exchange,market,safety.policy,snapshot,price,{side,stopPrice:nativeStopPrice(symbol,side,price,stop_loss)});
          const data=await safety.executeOrder({action:exchange.id==='delta'?'delta-leverage':'crypto-leverage',symbol,leverage:selected.leverage,leverageCeiling:safety.policy.sizing.leverage},async()=>{
            let writeAttempted=false;
            try {
              if(exchange.id==='binance')return await prepareBinanceAccount(exchange,symbol,selected.leverage,async()=>{await safety.assertActive();writeAttempted=true;});
              return await prepareDeltaStrategyAccount(exchange,symbol,selected.leverage,{allowAccountModeChange:false,requireFlatSymbol:true,
                beforeWrite:async change=>{if(change!=='leverage')throw new OrderRejectedError('This tool cannot change account margin mode');await safety.assertActive();writeAttempted=true;}});
            }catch(error){
              if(writeAttempted)throw exchange.id==='delta' ? new DeltaLeverageUncertainError(symbol,selected.leverage) : new CryptoSettingsUncertainError(symbol,selected.leverage);
              if(error instanceof OrderRejectedError)throw error;
              throw new OrderRejectedError('Leverage preflight could not verify broker settings. No setting change was requested.');
            }
          });
          return {success:true,data,sizing:selected.sizing,diagnostics:selected.diagnostics,message:'Leverage verified. Recalculate entry sizing from a fresh snapshot before placing an order.'};
        }catch(error){log.warn(errMeta(error),'LLM leverage preparation failed');return {success:false,error:error instanceof Error?error.message:'Leverage preparation failed'};}
      },
    }),
    fetchLeverage: tool({
      description: "Tool to fetch leverage for a symbol.",
      inputSchema: z.object({
        symbol: z.string(),
      }),
      execute: async ({ symbol }) => {
        try {
          const leverage = await fetchCryptoLeverage(exchange,scopedSymbol(symbol));
          return {
            success: true,
            data: leverage,
            message: `Leverage fetched successfully for ${symbol}`,
          };
        } catch (error) {
          log.error({ ...errMeta(error) }, "fetchLeverage error");
          const parsedError = {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "UNKNOWN_ERROR",
            type: error instanceof Error ? error.name : "ExchangeError",
          };
          return {
            success: false,
            error: parsedError,
          };
        }
      },
    }),
    fetchTrades: tool({
      description: "Tool to fetch trades.Use limit to fetch a limited number of trades to save on tokens.Default is 10",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional().default(10),
      }),
      execute: async ({ limit }) => {
        try {
          const trades = await exchange.fetchMyTrades(undefined, undefined,limit);
          log.info({ count: trades?.length ?? 0 }, "Trades fetched");
          return {
            success: true,
            data: trades,
            message: `${limit} Trades fetched successfully`,
          };
        } catch (error) {
          log.error({ ...errMeta(error) }, "fetchTrades error");
    
          const parsedError = {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "UNKNOWN_ERROR",
            type: error instanceof Error ? error.name : "ExchangeError",
          };
    
          return {
            success: false,
            error: parsedError,
          };
        }
      },
    }),
    fetchPositions: tool({
      description: "Tool to fetch positions.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const positions = normalizeCryptoPositions(exchange, await exchange.fetchPositions());
          log.info({ count: positions?.length ?? 0 }, "Positions fetched");
          return {
            success: true,
            data: positions,
            message: `Positions fetched successfully`,
          }; 
        } catch (error) {
          log.error({ ...errMeta(error) }, "fetchPositions error");
    
          const parsedError = {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "UNKNOWN_ERROR",
            type: error instanceof Error ? error.name : "ExchangeError",
          };
    
          return {
            success: false,
            error: parsedError,
          };
        }
      },
    }),
    closePosition: tool({
      description: "Reduce an existing scoped position; buys to close shorts and sells to close longs.",
      inputSchema: z.object({ symbol: z.string(), amount: z.number().positive() }),
      execute: async ({ symbol, amount }) => {
        try { return { success: true, data: await closePosition(symbol, amount) }; }
        catch (error) { log.warn(errMeta(error), "Close failed"); return { success: false, error: error instanceof Error ? error.message : "Close failed" }; }
      },
    }),
    closeAllPositions: tool({
      description: "Reduce only existing positions in this agent's allowed symbols.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          if (!safety) throw new Error("Execution authorization is required");
          const allowed = safety.policy.symbols.map(scopedSymbol);
          const positions = normalizeCryptoPositions(exchange, await exchange.fetchPositions(allowed));
          const closed = [];
          for (const p of positions) {
            if (p.symbol && Number(p.contracts) > 0 && allowed.includes(p.symbol)) {
              closed.push(await closePosition(p.symbol, Number(p.contracts)));
            }
          }
          return { success: true, data: closed };
        } catch (error) { log.warn(errMeta(error), "Close failed"); return { success: false, error: error instanceof Error ? error.message : "Close failed" }; }
      },
    }),
    checkAccountBalance: tool({
      description: "Tool to check account balance.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const balance = await exchange.fetchBalance();
          const totalWithBalance = Object.entries(balance?.total ?? {}).filter(([, v]) => Number(v) > 0).map(([k]) => k);
          log.info({ currencies: totalWithBalance }, "Account balance fetched");
          return {
            success: true,
            data: balance,
            message: `Account balance fetched successfully`,
          };
        } catch (error) {
          log.error({ ...errMeta(error) }, "checkAccountBalance error");
    
          const parsedError = {
            message: error instanceof Error ? error.message : "Unknown error",
            code: "UNKNOWN_ERROR",
            type: error instanceof Error ? error.name : "ExchangeError",
          };
    
          return {
            success: false,
            error: parsedError,
          };
        }
      },
    }),
  });
}
