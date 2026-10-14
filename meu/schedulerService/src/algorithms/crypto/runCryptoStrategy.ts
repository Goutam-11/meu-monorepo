import type { Db } from 'mongodb';
import type { Exchange, Order, Position } from 'ccxt';
import { createHash } from 'node:crypto';
import { loadDeltaBacktestData } from '../../../../../shared/trading/delta-data';
import { evaluateStrategy, strategyStateKey } from '../../../../../shared/trading/strategies';
import { advancePaperState, initializePaperState, type PaperState } from '../../../../../shared/trading/paperTrading';
import type { Candle } from '../../../../../shared/trading/emaCrossover';
import type { AutomaticSizingDiagnostics } from '../../../../../shared/trading/sizing';
import { evaluateMeanReversionEntry, type Contract } from '../../../../../shared/trading/perpetualBacktest';
import { getCryptoTools } from '../../execution/crypto/cryptoTools';
import {prepareDeltaStrategyAccount} from '../../brokers/delta/deltaStart';
import { cryptoEntrySnapshot, previewAutomaticCryptoLeverage, cryptoEntryMarket, fetchCryptoLeverage, fetchCryptoOpenOrders, normalizeCryptoPositions } from '../../brokers/crypto/cryptoRisk';
import { OrderRejectedError, DeltaLeverageUncertainError, type ExecutionSafety } from '../../execution/tradeGuard';
import { logger, errMeta } from '../../lib/logger';

import { intervals, MissedLiveCandlesError, type CryptoStrategyConfig } from './cryptoStrategyConfig';
export { validateCryptoStrategy, MissedLiveCandlesError, type CryptoStrategyConfig } from './cryptoStrategyConfig';
const log = logger.child({ module:'cryptoStrategy' });
type LiveState = { _id:string; userId:string; lastCandle:number; history:Candle[]; activeAfter?:number; entryOrderId?:string; side?:'long'|'short'; filled?:number; positionObserved?:boolean; lastExitCandle?:number; usedEntryProposalIds?:string[] };
async function history(symbol:string,c:CryptoStrategyConfig,lastCandle?:number) {
  const interval=intervals[c.timeframe], end=Math.floor(Date.now()/1000/interval)*interval;
  const warmup=Math.max(c.slowPeriod,c.lookback,c.atrPeriod,15)*5+2;
  const start=lastCandle===undefined?end-warmup*interval:lastCandle+interval;
  if(start>=end)return null;
  return loadDeltaBacktestData({symbol,timeframe:c.timeframe,start,end});
}
function sameContract(a:Contract,b:Contract) {
  if(a.symbol!==b.symbol||a.contractSize!==b.contractSize||a.maintenanceMarginRate!==b.maintenanceMarginRate) throw new Error('Contract terms changed; review the strategy before resuming');
}
export async function runPaperStrategy({db,agentId,userId,symbol,config,safety,activeAfter=0}:{db:Db;agentId:string;userId:string;symbol:string;config:CryptoStrategyConfig;safety:ExecutionSafety;activeAfter?:number}) {
  const records=db.collection<{_id:string;userId:string;state:PaperState;contract:Contract;updatedAt:Date}>('PaperTradingState');
  const stateId = strategyStateKey(agentId,config);
  const saved=await records.findOne({_id:stateId,userId});
  const data=await history(symbol,config,saved?.state.lastCandle);
  if(!data)return 'PAPER: waiting for the next completed candle.';
  sameContract(config.contract,data.contract);
  const initial=saved?.state??initializePaperState(config.simulation.initialCapital,data.candles.at(-1)!.timestamp,config.simulation.dailyTimezone);
  const result=advancePaperState(initial,data.candles,data.contract,config,config.simulation,intervals[config.timeframe],activeAfter);
  await safety.assertActive();
  const doc={_id:stateId,agentId,userId,state:result.state,config,contract:data.contract,updatedAt:new Date()};
  if(saved) {
    const updated=await records.replaceOne({_id:stateId,userId,'state.lastCandle':saved.state.lastCandle},doc);
    if(!updated.modifiedCount)throw new Error('Paper state changed concurrently; review required');
  }else await records.insertOne(doc);
  log.info({event:'paper.advanced',candleCount:result.processed,tradeCount:result.state.totalTradeCount},'Paper portfolio advanced');
  return `PAPER: ${result.processed} new closed candles; simulated cash ${result.state.cash.toFixed(2)} USD; ${result.state.position?'open simulated position':'flat'}; ${result.state.totalTradeCount} completed trades. Funding/liquidation are approximate.`;
}
async function invoke(tool:{execute?:unknown},input:Record<string,unknown>) {
  if(typeof tool.execute!=='function')throw new Error('Trading operation is unavailable');
  return await tool.execute(input,{toolCallId:'deterministic',messages:[]}) as {success:boolean;data?:{order?:Order;amount?:number;price?:number};guardReason?:string;error?:unknown};
}
function ownedPosition(position:Position|undefined,state:LiveState,entry:Order|undefined) {
  if(!position)return;
  if(!state.entryOrderId||!entry||entry.id!==state.entryOrderId||!Number.isFinite(entry.filled)||Number(entry.filled)<=0||Number(position.contracts)!==Number(entry.filled)||position.side!==state.side)throw new Error('Unowned or changed account position; no reduction sent');
}
/** Live entries size stop risk, collateral and leveraged exposure separately. */
export async function runLiveCryptoStrategy({db,agentId,userId,symbol,config,safety,exchange,activeAfter=0}:{db:Db;agentId:string;userId:string;symbol:string;config:CryptoStrategyConfig;safety:ExecutionSafety;exchange:Exchange;activeAfter?:number}) {
  if (config.simulation.exitPolicy !== undefined) throw new OrderRejectedError('Adaptive exits are not enabled for live trading: verified protective-order amendment and recovery are required');
  if(exchange.id!=='delta')throw new Error('Deterministic crypto execution currently supports Delta India only');
  const limits = safety.policy.futures;
  if (!limits || limits.leverage !== config.simulation.leverage || limits.maxMarginPct !== config.simulation.maxMarginPct ||
      limits.maxNotional !== safety.policy.capital.allocated * (config.simulation.maxExposureMultiple ?? config.simulation.leverage) ||
      limits.maintenanceMarginRate !== config.contract.maintenanceMarginRate || limits.feeBps !== config.simulation.feeBps || limits.slippageBps !== config.simulation.slippageBps)
    throw new OrderRejectedError('Saved strategy futures limits are required and must match execution policy');
  const market=cryptoEntryMarket(exchange,symbol,'USD');
  if(market.contractSize!==config.contract.contractSize)throw new Error('Contract size changed; review required');
  const records=db.collection<LiveState>('CryptoStrategyState');
  const stateId = strategyStateKey(agentId,config);
  let state=await records.findOne({_id:stateId,userId});
  // Start preflight changes activeAfter on explicit Resume, not on process restart.
  // Legacy cursors have no marker; only an activation after their processed close
  // can prove a deliberate restart. Never infer Resume just from a candle gap.
  const resumed=!!state && activeAfter>0 && (state.activeAfter!==undefined ? activeAfter>state.activeAfter : activeAfter>state.lastCandle+intervals[config.timeframe]);
  const data=await history(symbol,config,resumed ? undefined : state?.lastCandle);
  if(!data)return 'ALGO: waiting for the next closed candle.';
  sameContract(config.contract,data.contract);
  if(!state) {
    const [initialPositions, initialOrders] = await Promise.all([exchange.fetchPositions([market.symbol]), fetchCryptoOpenOrders(exchange)]);
    if (normalizeCryptoPositions(exchange,initialPositions).some(p=>Number(p.contracts)>0) || initialOrders.some(o=>o.symbol===market.symbol)) throw new Error('Strategy symbol must be flat with no pending orders before its first live run');
    state={_id:stateId,userId,lastCandle:data.candles.at(-1)!.timestamp,history:data.candles,activeAfter};
    await safety.assertActive();await records.insertOne(state);
    return 'ALGO: indicator history initialized; awaiting a fresh completed candle.';
  }
  if(!resumed && state.history.length+data.candles.length>10000)throw new Error('Strategy history reached 10,000 candles; review/reset required');
  if(!resumed && data.candles[0]!.timestamp!==state.lastCandle+intervals[config.timeframe])throw new Error('Strategy candle gap; review required');
  // Never trade a stale backlog. Paper can replay protection, live cannot recreate fills.
  if(!resumed && data.candles.length>1)throw new MissedLiveCandlesError();
  const nextHistory=resumed ? data.candles : [...state.history,...data.candles],candle=data.candles.at(-1)!;
  if(resumed && (candle.timestamp<state.lastCandle || (candle.timestamp-state.lastCandle)%intervals[config.timeframe]!==0))throw new Error('Resume history does not match the saved candle cursor');
  const {signal,rawSignal,decision,atr,entryProposal,exitSide,mean}=evaluateStrategy(nextHistory,config,activeAfter);
  const improved=!!config.executionRules;
  const canonical=market.symbol;
  const prefix=`m${createHash('sha256').update(agentId).digest('hex').slice(0,12)}-`;
  const [positions,orders]=await Promise.all([exchange.fetchPositions([canonical]),fetchCryptoOpenOrders(exchange)]);
  const position=normalizeCryptoPositions(exchange,positions).find(p=>p.symbol===canonical&&Number(p.contracts)>0);
  let entry:Order|undefined;
  if(state.entryOrderId) {
    entry=await exchange.fetchOrder(state.entryOrderId,canonical);
    if(!entry.clientOrderId?.startsWith(prefix))throw new Error('Stored entry ownership could not be verified');
  }
  ownedPosition(position,state,entry);
  if(orders.some(o=>o.symbol===canonical&&!o.reduceOnly&&!o.info?.reduce_only&&o.id!==state!.entryOrderId))throw new Error('Foreign pending entry on strategy symbol; review required');
  const tools=getCryptoTools({exchange,safety});
  const wantsExit=improved&&config.id==='meanReversion' ? exitSide===position?.side && !!position : rawSignal==='exit'||(rawSignal==='long'&&position?.side==='short')||(rawSignal==='short'&&position?.side==='long');
  // Broker-native stops/targets can close between polls. Persist the observed exit
  // before any fresh signal is allowed to re-enter. Unfilled orders are not exits.
  if(!position && (state.positionObserved || (entry && Number(entry.filled)>0 && Number(entry.remaining)===0))) {
    state.lastExitCandle=candle.timestamp;state.entryOrderId=undefined;state.side=undefined;
  }
  state.positionObserved=!!position;
  const cooldownActive=state.lastExitCandle!==undefined && (candle.timestamp-state.lastExitCandle)/intervals[config.timeframe] <= (config.entryTiming?.cooldownBars??-1);
  if(entry&&Number(entry.remaining)>0) {
    // A stale limit must never fill after an obsolete signal. Partial fills require review
    // rather than canceling an entry whose native bracket behavior could be ambiguous.
    if(Number(entry.filled)>0)throw new Error('Partially filled algorithm entry requires reconciliation');
    const canceled=await invoke(tools.cancelOrder,{symbol:canonical,order_id:entry.id});
    if(!canceled.success)throw new Error('Entry cancellation was not confirmed');
    const confirmed=await exchange.fetchOrder(entry.id,canonical);
    if(confirmed.status!=='canceled'||Number(confirmed.filled)>0)throw new Error('Entry changed during cancellation; reconcile before resuming');
    state.entryOrderId=undefined;state.side=undefined;
  }
  if(resumed) {
    await safety.assertActive();
    const updated=await records.replaceOne({_id:stateId,userId,lastCandle:state.lastCandle},{...state,history:nextHistory,lastCandle:candle.timestamp,activeAfter});
    if(!updated.modifiedCount)throw new Error('Resume candle cursor changed concurrently; reconcile before resuming');
    log.info({event:'strategy.resumed',candleTimestamp:candle.timestamp},'Resume history refreshed without evaluating stale entry or exit signals');
    return `ALGO: ${symbol} resumed; indicator history refreshed through the latest closed ${config.timeframe} candle. Paused-period signals were skipped; existing position tracking was preserved. Native protection remains broker-managed. Waiting for a fresh completed candle.`;
  }
  let entryRefusal:string|undefined;
  let executionAction:string|undefined;
  let selectedLeverage:number|undefined;
  let sizingDiagnostics:AutomaticSizingDiagnostics|undefined;
  if(position&&wantsExit) {
    const result=await invoke(tools.closePosition,{symbol:canonical,amount:Number(position.contracts)});
    if(!result.success)throw new Error('Strategy reduction was not confirmed');
    state.lastExitCandle=candle.timestamp;
    executionAction='Strategy exit requested a position close; waiting for broker confirmation before another entry';
    // Do not flip within this run: wait until authoritative account reads confirm flat.
  } else if(!position&&!cooldownActive&&!orders.some(o=>o.symbol===canonical&&o.id!==entry?.id)&&candle.timestamp>=activeAfter&&atr&&signal!=='hold'&&signal!=='exit'&&((signal==='long'&&config.simulation.direction!=='short')||(signal==='short'&&config.simulation.direction!=='long'))) {
    const proposalRefusal=improved ? !entryProposal ? 'No confirmed entry setup' : (state.usedEntryProposalIds??[]).includes(entryProposal.id) ? 'This setup already submitted an entry' : Date.now()/1000>=entryProposal.expiresTimestamp ? 'Confirmed setup expired before execution' : undefined : undefined;
    if(proposalRefusal)entryRefusal=proposalRefusal;
    const leverage=await fetchCryptoLeverage(exchange,canonical);
    if(leverage.marginMode!=='isolated'||(config.simulation.leverageMode!=='AUTO'&&(leverage.longLeverage!==config.simulation.leverage||leverage.shortLeverage!==config.simulation.leverage)))throw new OrderRejectedError('Saved isolated leverage must be verified on Delta before entry');
    const fraction=atr*config.stopAtr/candle.close;
    if(!(fraction>0&&fraction<1&&fraction*config.rewardRisk<1))throw new OrderRejectedError('ATR brackets are outside supported price fractions');
    const side = signal==='long'?'buy':'sell';
    const validateQuote=(price:number):string|undefined=>{
      if(!Number.isFinite(price)||price<=0)return 'Fresh entry quote is unavailable or invalid';
      if(improved&&entryProposal&&(signal==='long'?price<=entryProposal.level:price>=entryProposal.level))return 'Fresh quote invalidated the confirmed setup level';
      if(entryProposal?.priceLimit!==undefined&&(signal==='long'?price>entryProposal.priceLimit:price<entryProposal.priceLimit))return 'Fresh quote exceeds the completed-candle EMA extension bound; no chasing entry requested';
      if(improved&&entryProposal&&Date.now()/1000>=entryProposal.expiresTimestamp)return 'Confirmed setup expired before execution';
      if(improved&&config.id==='meanReversion') {
        const stopPrice=Number(exchange.priceToPrecision(canonical,price*(side==='buy'?1-fraction:1+fraction)));
        const targetPrice=Number(exchange.priceToPrecision(canonical,mean??NaN));
        const feeRate=Math.max(Number(market.info?.taker_commission_rate??market.taker??0),config.simulation.feeBps/10000,0.001);
        const economics=evaluateMeanReversionEntry({side:signal as 'long'|'short',entryPrice:price,stopPrice,meanPrice:targetPrice,feeRate,slippageRate:config.simulation.slippageBps/10000});
        if(!economics.ok)return 'Expected return to the mean does not cover stop risk and round-trip trading costs';
      }
    };
    if(improved&&!entryRefusal) {
      const quote=await exchange.fetchTicker(canonical);
      entryRefusal=validateQuote(Number(exchange.priceToPrecision(canonical,side==='buy'?quote.bid!:quote.ask!)));
    }
    if(config.simulation.leverageMode==='AUTO'&&!entryRefusal) {
      try {
        const quote=await exchange.fetchTicker(canonical);
        const price=Number(exchange.priceToPrecision(canonical,side==='buy'?quote.bid!:quote.ask!));
        const refusal=validateQuote(price);if(refusal)throw new OrderRejectedError(refusal);
        const stopPrice=Number(exchange.priceToPrecision(canonical,price*(side==='buy'?1-fraction:1+fraction)));
        let snapshot=await cryptoEntrySnapshot(exchange,market,safety.policy);
        if(safety.crypto)snapshot=await safety.crypto.scopeSnapshot(snapshot,market);
        const selected=previewAutomaticCryptoLeverage(exchange,market,safety.policy,snapshot,price,{side,stopPrice},config.simulation.autoSizing);
        selectedLeverage=selected.leverage;
        sizingDiagnostics=selected.diagnostics;
      }catch(error){
        entryRefusal=error instanceof OrderRejectedError ? error.message : 'Automatic leverage sizing could not verify a fresh quote or account snapshot; no settings or order change requested';
        log.info({event:'strategy.auto_sizing_unavailable',...errMeta(error)},'Automatic entry sizing refused before broker settings changes');
      }
      if(selectedLeverage!==undefined) {
        const selected=selectedLeverage;
        try {
          if(leverage.longLeverage!==selected||leverage.shortLeverage!==selected) {
            await safety.executeOrder({action:'delta-leverage',symbol:canonical,leverage:selected,leverageCeiling:config.simulation.leverage},async()=>{
              let writeAttempted=false;
              try {
                return await prepareDeltaStrategyAccount(exchange,canonical,selected,{allowAccountModeChange:false,requireFlatSymbol:true,
                  beforeWrite:async change=>{if(change!=='leverage')throw new OrderRejectedError('Automatic leverage cannot change account-wide margin mode');await safety.assertActive();writeAttempted=true;}});
              }catch(error){
                if(writeAttempted)throw new DeltaLeverageUncertainError(canonical,selected);
                if(error instanceof OrderRejectedError)throw error;
                throw new OrderRejectedError('Automatic leverage preflight could not verify the flat ticker, margin preferences or broker leverage. No setting change was requested.');
              }
            });
          }
          limits.leverage=selected;
          limits.maxNotional=Math.min(limits.maxNotional,safety.policy.capital.allocated*selected);
          log.info({event:'strategy.leverage_selected',selectedLeverage:selected,leverageCeiling:config.simulation.leverage,...sizingDiagnostics},'Automatic isolated leverage verified before entry');
        }catch(error){if(!(error instanceof OrderRejectedError))throw error;entryRefusal=error.message;selectedLeverage=undefined;}
      }
    }
    const preview = entryRefusal ? {success:false,guardReason:entryRefusal} : await invoke(tools.calculatePositionSize,{symbol:canonical,side,stop_loss:fraction});
    if (!preview.success || !preview.data?.amount || !preview.data.price) {
      if(!preview.guardReason)throw new OrderRejectedError('Sizing preview could not read a valid exchange snapshot; no entry sent');
      entryRefusal=preview.guardReason;
      log.info({event:'strategy.entry_refused',reason:entryRefusal},'Sizing guard declined the signal without requesting an order');
    } else {
    const amount = preview.data.amount;
    if (!Number.isSafeInteger(amount) || amount < 1) throw new OrderRejectedError('Configured margin/risk budget is below one contract');
    entryRefusal=validateQuote(preview.data.price);
    const takeProfit=improved&&config.id==='meanReversion' ? Math.abs(Number(exchange.priceToPrecision(canonical,mean!))-preview.data.price)/preview.data.price : fraction*config.rewardRisk;
    if(!(takeProfit>0&&takeProfit<1))entryRefusal='Native target is outside supported price fractions';
    const result=entryRefusal ? {success:false} : await invoke(tools.createBuyOrder,{symbol:canonical,side,amount,price:preview.data.price,stop_loss:fraction,take_profit:takeProfit});
    if(result.success) {
      const order=result.data?.order;
      if(!order?.id)throw new Error('Missing algorithm order identity; reconcile before resuming');
      state.entryOrderId=order.id;state.side=signal==='long'?'long':'short';
      if(improved&&entryProposal)state.usedEntryProposalIds=[...(state.usedEntryProposalIds??[]),entryProposal.id].slice(-10000);
      executionAction='Protected entry order submitted; a submitted order is not yet a confirmed fill';
    }else {
      // Any ambiguous tool failure is also detected by worker safety before completion.
      log.info({event:'strategy.entry_refused'},'Deterministic entry did not pass execution guards');
    }
    }
  }
  await safety.assertActive();
  const updated=await records.replaceOne({_id:stateId,userId,lastCandle:state.lastCandle},{...state,history:nextHistory,lastCandle:candle.timestamp,activeAfter});
  if(!updated.modifiedCount)throw new Error('Strategy cursor persistence failed; reconcile orders');
  log.info({event:'strategy.evaluated',signal,candleTimestamp:candle.timestamp},'Deterministic strategy evaluated');
  return entryRefusal ? `ALGO: ${symbol} ${signal} on ${config.timeframe} closed candle; entry skipped: ${entryRefusal}. No entry order was requested; waiting for the next completed candle.` : `ALGO: ${symbol} ${signal} on ${config.timeframe} closed candle; ${selectedLeverage ? `automatic leverage ${selectedLeverage}× (ceiling ${config.simulation.leverage}×); ${config.simulation.autoSizing && sizingDiagnostics ? `target ${sizingDiagnostics.targetAmount} contracts, funded ${sizingDiagnostics.fundedAmount} (${sizingDiagnostics.limitingConstraint}); ` : ''}` : ''}${cooldownActive?'Re-entry cooldown active. ':''}${executionAction??decision}. Live sizing bounds stop-loss risk, margin and leveraged exposure. Native brackets govern position protection.`;
}
