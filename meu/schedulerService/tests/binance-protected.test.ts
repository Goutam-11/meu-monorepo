import {test,expect} from 'bun:test';
import ccxt,{InvalidOrder,type Order,type MarketInterface,type Position} from 'ccxt';
import {configureCryptoExchange} from '../src/config/config';
import {prepareBinanceAccount,submitBinanceProtectedEntry,fetchManagedCryptoOrder} from '../src/brokers/binance/binanceExecution';
import type {ExecutionSafety} from '../src/execution/tradeGuard';
function fixture() {
 const exchange=new ccxt.binance();configureCryptoExchange(exchange,false);const symbol='BTC/USDT:USDT';
 exchange.setMarkets([{id:'BTCUSDT',symbol,base:'BTC',quote:'USDT',settle:'USDT',type:'swap',swap:true,contract:true,linear:true,inverse:false,active:true,contractSize:1,taker:0.0005,precision:{amount:0.001,price:0.1},limits:{amount:{min:0.001,max:100},cost:{min:5}},info:{}} as unknown as MarketInterface]);
 let leverage=2,marginMode='isolated',fillRatio=1,failProtection=false,loseEntry=false;
 const positions:Position[]=[],rows=new Map<string,Order>(),writes:unknown[][]=[],submitted:string[]=[],accepted:string[]=[],refused:string[]=[];
 exchange.fetchBalance=async()=>({free:{USDT:1000},total:{USDT:1000},info:{multiAssetsMargin:false}}) as never;
 exchange.fetchPositions=async()=>positions;exchange.fetchPositionMode=async()=>({hedged:false,info:{}});
 exchange.fetchLeverages=async()=>({[symbol]:{symbol,marginMode,longLeverage:leverage,shortLeverage:leverage,info:{}}});
 exchange.fetchMarketLeverageTiers=async()=>[{minNotional:0,maxNotional:100000,maintenanceMarginRate:0.005,maxLeverage:20,info:{}}];exchange.fetchLedger=async()=>[];
 exchange.fetchOpenOrders=async(_s,_since,_limit,params)=>[...rows.values()].filter(o=>o.status==='open'&&Boolean(o.triggerPrice)===Boolean((params as {trigger?:boolean})?.trigger));
 exchange.setMarginMode=async mode=>{writes.push(['margin',mode]);marginMode=mode;return {};};exchange.setLeverage=async value=>{writes.push(['leverage',value]);leverage=value;return {};};
 exchange.createOrder=async(_s,type,side,amount,price,params)=>{
   const options=params as Record<string,unknown>;
   writes.push([type,side,amount,price,params]);if(type==='STOP_MARKET'&&failProtection)throw new InvalidOrder('stop rejected');
   const id=String(writes.length),conditional=['STOP_MARKET','TAKE_PROFIT_MARKET'].includes(type),filled=conditional?0:amount*fillRatio;
   const order={id,symbol,side,clientOrderId:String(options?.clientOrderId??options?.clientAlgoId),amount:conditional?undefined:amount,filled,remaining:conditional?undefined:amount-filled,status:conditional?'open':filled===amount?'closed':'canceled',triggerPrice:conditional?options?.stopPrice:undefined,info:{...params,actualOrderId:0}} as unknown as Order;rows.set(id,order);
   if(type==='limit'&&filled>0)positions.push({symbol,side:side==='buy'?'long':'short',contracts:filled,notional:filled*price!,initialMargin:filled*price!/leverage,collateral:filled*price!/leverage,unrealizedPnl:0,marginMode:'isolated',hedged:false,markPrice:price,entryPrice:price,info:{isAutoAddMargin:false}} as Position);
   if(type==='market')positions.length=0;if(loseEntry&&type==='limit')throw new Error('lost response');return order;
 };
 exchange.fetchOrder=async id=>{const row=rows.get(id);if(!row)throw new Error('unknown order');return row;};
 const safety:ExecutionSafety={agentId:'a',policy:{symbols:[symbol],capital:{allocated:100,currency:'USDT'},risk:{maxRiskPerTradePct:2,maxDailyLossPct:5,maxOpenPositions:1,maxTradesPerDay:3,maxPositionsOpenedPerDay:1},sizing:{version:1,mode:'STOP_LOSS',leverage:2,maxMarginPct:100,maxExposureMultiple:2,feeBps:10,slippageBps:5}},assertActive:async()=>{},reserveDailyEntry:async()=>{},executeOrder:async(_intent,execute)=>execute(),crypto:{scopeSnapshot:async snapshot=>snapshot,assertOwnsPosition:async()=>{},recordSubmission:async id=>{submitted.push(id)},recordAccepted:async id=>{accepted.push(id)},recordRefused:async id=>{refused.push(id)}}};
 return {exchange,symbol,safety,writes,positions,submitted,accepted,refused,rows,enter:()=>submitBinanceProtectedEntry(exchange,safety,{symbol,side:'buy',price:100000,stopPrice:99000,takeProfitPrice:102000,amount:0.001}),setFill:(n:number)=>fillRatio=n,setFailure:()=>failProtection=true,setLost:()=>loseEntry=true,setCross:()=>marginMode='cross'};
}
test('Binance terminal IOC fills get verified mark-price stop and target with durable child records',async()=>{
 const s=fixture(),result=await s.enter();expect(result.protection).toHaveLength(2);expect(s.submitted).toHaveLength(3);expect(s.accepted).toEqual(s.submitted);expect(s.writes.map(w=>w[0])).toEqual(['limit','STOP_MARKET','TAKE_PROFIT_MARKET']);expect(s.writes[0]![4]).toMatchObject({timeInForce:'IOC'});
});
test('unfilled IOC creates no protection and uncertain entry is never repeated',async()=>{
 const s=fixture();s.setFill(0);expect((await s.enter()).protection).toEqual([]);expect(s.writes).toHaveLength(1);const lost=fixture();lost.setLost();await expect(lost.enter()).rejects.toThrow('lost response');expect(lost.writes).toHaveLength(1);
});
test('protection refusal attempts only a reduce-only emergency exit and keeps failure evidence',async()=>{
 const s=fixture();s.setFailure();await expect(s.enter()).rejects.toThrow('Native protection');expect(s.writes.map(w=>w[0])).toEqual(['limit','STOP_MARKET','market']);expect(s.writes[2]![4]).toMatchObject({reduceOnly:true});expect(s.refused).toHaveLength(1);
});
test('flat-only Binance settings verify isolated margin and leverage after mutation',async()=>{
 const s=fixture();s.setCross();const before:string[]=[];expect(await prepareBinanceAccount(s.exchange,s.symbol,3,async change=>{before.push(change)})).toMatchObject({leverage:3,marginMode:'isolated'});expect(before).toEqual(['marginMode','leverage']);s.positions.push({symbol:s.symbol,contracts:0.001} as Position);await expect(prepareBinanceAccount(s.exchange,s.symbol,4,async()=>{})).rejects.toThrow('flat');
});
test('triggered protection resolves actual-order fills without confusing algo IDs',async()=>{
 const s=fixture();s.rows.set('algo',{id:'algo',clientOrderId:'client',symbol:s.symbol,info:{actualOrderId:'actual'}} as Order);s.rows.set('actual',{id:'actual',symbol:s.symbol,filled:0.001,amount:0.001,remaining:0,status:'closed'} as Order);expect(await fetchManagedCryptoOrder(s.exchange,'algo',s.symbol,true,undefined,0.001)).toMatchObject({id:'algo',clientOrderId:'client',filled:0.001,status:'closed'});
});

test('installed CCXT emits conditional close-position request without quantity or reduceOnly',async()=>{
 const s=fixture(),exchange=new ccxt.binance();configureCryptoExchange(exchange,false);exchange.setMarkets([{...s.exchange.market(s.symbol),info:{orderTypes:['LIMIT','STOP_MARKET','TAKE_PROFIT_MARKET']}}]);
 const seen:Record<string,unknown>[]=[];
 exchange.request=async(path,_api,_method,params)=>{seen.push({path,...params});return {algoId:1,clientAlgoId:'client',symbol:'BTCUSDT',side:'SELL',algoStatus:'NEW',orderType:'STOP_MARKET',closePosition:true,triggerPrice:'99000',workingType:'MARK_PRICE'};};
 const stop=await exchange.createOrder(s.symbol,'STOP_MARKET','sell',0.001,undefined,{closePosition:true,stopPrice:99000,workingType:'MARK_PRICE',clientAlgoId:'client'});
 expect(seen[0]).toMatchObject({path:'algoOrder',closePosition:true,clientAlgoId:'client',workingType:'MARK_PRICE'});expect(seen[0]).not.toHaveProperty('quantity');expect(seen[0]).not.toHaveProperty('reduceOnly');expect(stop.clientOrderId).toBe('client');
});

test('Binance LLM tool chooses minimum viable leverage within the saved ceiling',async()=>{
 const s=fixture();s.safety.policy.sizing!.leverageMode='AUTO';s.safety.policy.sizing!.leverage=4;s.safety.policy.sizing!.maxExposureMultiple=4;
 s.exchange.fetchTicker=async()=>({bid:99999.9,ask:100000,last:100000}) as never;
 const {getCryptoTools}=await import('../src/execution/crypto/cryptoTools');
 const tools=getCryptoTools({exchange:s.exchange,safety:s.safety});
 const result=await (tools.setLeverage.execute as unknown as (input:unknown)=>Promise<{success:boolean;data?:{leverage:number}}> )({symbol:s.symbol,side:'buy',stop_loss:0.01});
 expect(result).toMatchObject({success:true,data:{leverage:2}});expect(s.safety.policy.sizing!.leverage).toBe(4);expect(s.writes).toEqual([]);
});
