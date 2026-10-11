import type {Exchange,Order} from 'ccxt';
import {OrderRejectedError,CryptoProtectionError} from './tradeGuard';
import {fetchCryptoLeverage,fetchCryptoOpenOrders} from './cryptoRisk';

/** Futures settings only, with a flat ticker and a readback after each mutation. */
export async function prepareBinanceAccount(exchange:Exchange,symbol:string,leverage:number,beforeWrite:(change:'marginMode'|'leverage')=>Promise<void>) {
  if(exchange.id!=='binance'||!Number.isInteger(leverage)||leverage<1||leverage>20)throw new OrderRejectedError('Invalid Binance leverage target');
  const canonical=exchange.market(symbol).symbol;
  const flat=async()=>{
    const [positions,orders]=await Promise.all([exchange.fetchPositions(),fetchCryptoOpenOrders(exchange)]);
    if(positions.some(p=>p.symbol===canonical&&Number(p.contracts)>0)||orders.some(o=>o.symbol===canonical))throw new OrderRejectedError('Binance ticker must be flat with no pending orders before changing settings');
  };
  const [mode,balance]=await Promise.all([exchange.fetchPositionMode(canonical),exchange.fetchBalance({type:'future',subType:'linear',useV2:true})]);
  if((mode as {hedged?:boolean}).hedged!==false||balance.info?.multiAssetsMargin!==false)throw new OrderRejectedError('Binance requires one-way, single-asset mode; account-wide mode changes are not performed automatically');
  let current=await fetchCryptoLeverage(exchange,canonical);
  if(current.marginMode!=='isolated') {
    await flat();await beforeWrite('marginMode');await exchange.setMarginMode('isolated',canonical);
    current=await fetchCryptoLeverage(exchange,canonical);
    if(current.marginMode!=='isolated')throw new Error('Binance isolated-margin update was not verified');
  }
  if(current.longLeverage!==leverage||current.shortLeverage!==leverage) {
    await flat();await beforeWrite('leverage');await exchange.setLeverage(leverage,canonical);
  }
  current=await fetchCryptoLeverage(exchange,canonical);
  if(current.marginMode!=='isolated'||current.longLeverage!==leverage||current.shortLeverage!==leverage)throw new Error('Binance leverage readback differs from the target');
  return {marginMode:'isolated' as const,leverage};
}

/** Validate authenticated account-specific base tier before granting leverage credit. */
export async function loadBinanceTier(exchange:Exchange,symbol:string) {
  const rows=await exchange.fetchMarketLeverageTiers(symbol);
  const tier=rows.find(t=>t.minNotional===0);
  if(!tier||![tier.maxNotional,tier.maintenanceMarginRate,tier.maxLeverage].every(Number.isFinite)||Number(tier.maxNotional)<=0||Number(tier.maintenanceMarginRate)<=0||Number(tier.maxLeverage)<1)
    throw new OrderRejectedError('Binance base maintenance/leverage tier could not be verified');
  exchange.market(symbol).info={...exchange.market(symbol).info,meuRiskTier:{...tier}};
}

/** Algo IDs and triggered exchange order IDs are different on Binance. */
export async function fetchManagedCryptoOrder(exchange:Exchange,id:string,symbol:string,conditional=false,clientOrderId?:string,expectedAmount?:number):Promise<Order> {
  const actual=await exchange.fetchOrder(id,symbol,{...(conditional?{trigger:true}:{}),...(clientOrderId?{clientOrderId}: {})});
  if(exchange.id!=='binance'||!conditional)return actual;
  const filledId=actual.info?.actualOrderId;
  if(filledId && String(filledId)!=='0') {
    const fill=await exchange.fetchOrder(String(filledId),symbol);
    if(actual.info?.closePosition===true && (!Number.isFinite(expectedAmount)||Number(expectedAmount)<=0||!Number.isFinite(fill.filled)||Number(fill.filled)>Number(expectedAmount)))throw new Error('Triggered protection exceeds the tracked position quantity');
    return {...fill,...(actual.info?.closePosition===true?{amount:Number(expectedAmount),remaining:Number(expectedAmount)-Number(fill.filled)}:{}),id:actual.id,clientOrderId:actual.clientOrderId,info:{...actual.info,executedOrder:fill.info}};
  }
  const amount=actual.info?.closePosition===true ? expectedAmount : actual.amount;
  if(!Number.isFinite(amount)||Number(amount)<=0)throw new Error('Conditional quantity could not be verified');
  return {...actual,amount:Number(amount),filled:0,remaining:Number(amount),reduceOnly:true};
}

import {InvalidOrder,InsufficientFunds} from 'ccxt';
import type {ExecutionSafety} from './tradeGuard';
import {cryptoEntryMarket,cryptoEntrySnapshot,sizeCryptoEntry} from './cryptoRisk';
import {randomUUID,createHash} from 'node:crypto';

/** IOC limits bound entry price; protection follows confirmed terminal fills.
 * Every child submission is journalled before its request. Unknown outcomes
 * never become a retry and leave the parent execution available for recovery. */
export async function submitBinanceProtectedEntry(exchange:Exchange,safety:ExecutionSafety,input:{symbol:string;side:'buy'|'sell';price:number;stopPrice:number;takeProfitPrice?:number;amount?:number}) {
  if(exchange.id!=='binance'||safety.policy.sizing?.mode!=='STOP_LOSS'||!safety.crypto)throw new OrderRejectedError('Binance protected entry requires tracked account ownership');
  const market=cryptoEntryMarket(exchange,input.symbol,safety.policy.capital.currency),symbol=market.symbol;
  const prefix=`m${createHash('sha256').update(safety.agentId).digest('hex').slice(0,12)}-`;
  const id=()=>`${prefix}${randomUUID().replaceAll('-','').slice(0,16)}`;
  const clientOrderId=id();
  return safety.executeOrder({action:'crypto-entry',symbol,clientOrderId,protection:'binance-conditional',stopPrice:input.stopPrice},async()=>{
    let snapshot=await safety.crypto!.scopeSnapshot(await cryptoEntrySnapshot(exchange,market,safety.policy),market);
    if(snapshot.positions.some(p=>p.symbol===symbol&&Number(p.contracts)>0)||snapshot.orders.some(o=>o.symbol===symbol))throw new OrderRejectedError('Binance protected entries require a flat ticker without pending orders; close and clean up the prior position first');
    const sizing=sizeCryptoEntry(exchange,market,safety.policy,snapshot,input.price,input.amount,{side:input.side,stopPrice:input.stopPrice});
    await safety.assertActive();await safety.reserveDailyEntry(symbol,true);
    await safety.crypto!.recordSubmission(clientOrderId,symbol,input.side,sizing.amount,false);
    let order:Order;
    try {order=await exchange.createOrder(symbol,'limit',input.side,sizing.amount,input.price,{clientOrderId,timeInForce:'IOC'});}
    catch(error){if(error instanceof InvalidOrder||error instanceof InsufficientFunds){await safety.crypto!.recordRefused(clientOrderId);throw new OrderRejectedError(`Binance refused entry: ${error.message}`);}throw error;}
    if(!order.id)throw new Error('Binance entry has no order identity; reconcile before any retry');
    const terminal=await fetchManagedCryptoOrder(exchange,order.id,symbol);
    if(terminal.clientOrderId!==clientOrderId||terminal.symbol!==symbol||terminal.side!==input.side||!Number.isFinite(terminal.filled)||Number(terminal.filled)<0||Number(terminal.filled)>sizing.amount||!['closed','canceled','expired'].includes(terminal.status??''))throw new Error('Binance IOC terminal fill could not be verified; no repeat entry is allowed');
    await safety.crypto!.recordAccepted(clientOrderId,terminal);
    const filled=Number(terminal.filled);
    if(filled===0)return {order:terminal,sizing,protection:[],message:'IOC entry did not fill; no position opened'};
    const protective:Order[]=[];
    try {
      snapshot=await safety.crypto!.scopeSnapshot(await cryptoEntrySnapshot(exchange,market,safety.policy),market);
      const position=snapshot.positions.find(p=>p.symbol===symbol&&Number(p.contracts)>0);
      if(!position||Number(position.contracts)!==filled||position.side!==(input.side==='buy'?'long':'short'))throw new Error('Entry fill and position readback differ; protection requires reconciliation');
      for(const [type,triggerPrice] of [['STOP_MARKET',input.stopPrice],['TAKE_PROFIT_MARKET',input.takeProfitPrice]] as const) {
        if(triggerPrice===undefined)continue;
        const child=id(),side=input.side==='buy'?'sell':'buy';
        await safety.crypto!.recordSubmission(child,symbol,side,filled,true,{conditional:true,closePosition:true,triggerPrice,protectionType:type});
        let stop:Order;
        try {stop=await exchange.createOrder(symbol,type,side,filled,undefined,{closePosition:true,stopPrice:triggerPrice,workingType:'MARK_PRICE',clientAlgoId:child});}
        catch(error){if(error instanceof InvalidOrder||error instanceof InsufficientFunds)await safety.crypto!.recordRefused(child);throw error;}
        if(!stop.id)throw new Error('Binance protection acknowledgement has no algo ID');
        const verified=await fetchManagedCryptoOrder(exchange,stop.id,symbol,true,undefined,filled);
        if(verified.clientOrderId!==child||verified.symbol!==symbol||verified.side!==side||verified.info?.closePosition!==true||Number(verified.triggerPrice??verified.stopPrice??verified.info?.triggerPrice)!==triggerPrice||verified.info?.workingType!=='MARK_PRICE'||verified.status!=='open')throw new Error('Binance protection settings could not be verified');
        await safety.crypto!.recordAccepted(child,verified);protective.push(verified);
      }
      return {order:terminal,sizing,protection:protective,message:'Terminal fill and native mark-price protection verified'};
    }catch(error){
      // A known fill permits only a bounded reduce-only emergency exit, never a
      // new entry. Any uncertain child remains journalled for broker recovery.
      try {
      const positions=await exchange.fetchPositions([symbol]);
      const position=positions.find(p=>p.symbol===symbol&&Number(p.contracts)>0);
      if(position&&position.side===(input.side==='buy'?'long':'short')&&Number(position.contracts)<=filled) {
        const child=id(),side=input.side==='buy'?'sell':'buy',amount=Number(position.contracts);
        await safety.crypto!.recordSubmission(child,symbol,side,amount,true);
        const exit=await exchange.createOrder(symbol,'market',side,amount,undefined,{reduceOnly:true,clientOrderId:child});
        await safety.crypto!.recordAccepted(child,exit);
      }
      }catch { /* Failed emergency reduction remains uncertain in the parent intent. */ }
      throw new CryptoProtectionError(symbol);
    }
  });
}
