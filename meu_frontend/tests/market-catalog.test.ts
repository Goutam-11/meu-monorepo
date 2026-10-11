import {test,expect,mock} from 'bun:test';
let loads=0,fetches=0,fresh=true,fail=false;
const crypto=(id:string,settle='USD')=>({id,symbol:`${id.replace(/USD[T]?$/,'')}/${settle}:${settle}`,base:id.replace(/USD[T]?$/,''),quote:settle,settle,active:true,swap:true,linear:true,contractSize:1,limits:{amount:{min:1}},info:{tick_size:'0.01',underlying_asset:{name:id.startsWith('BTC')?'Bitcoin':'XRP'}}});
const calls:any[]=[];
class Adapter {
 urls:any={};options:any={};currencies:any={};sandbox=false;
 constructor(config:any){expect(config).not.toHaveProperty('apiKey');expect(config).not.toHaveProperty('secret');calls.push(this);}
 setSandboxMode(sandbox:boolean){this.sandbox=sandbox;}
 async loadMarkets(){loads++;if(fail)throw new Error('private upstream response');return{btc:crypto('BTCUSD'),xrp:crypto('XRPUSD'),binance:crypto('BTCUSDT','USDT'),inactive:{...crypto('OLDUSD'),active:false},spot:{...crypto('SPOTUSD'),swap:false},inverse:{...crypto('INVUSD'),linear:false},quanto:{...crypto('QUSD'),info:{is_quanto:true}},unknown:{...crypto('UNKNOWNUSD'),active:undefined}};}
}
mock.module('server-only',()=>({}));
mock.module('ccxt',()=>({default:{delta:Adapter,binance:Adapter,bybit:Adapter,kraken:Adapter,kucoin:Adapter}}));
mock.module('@/lib/encryption',()=>({decryptSecret:(value:string)=>value}));
mock.module('@/lib/kite',()=>({isKiteTokenFresh:()=>fresh}));
mock.module('@/lib/db',()=>({default:{exchange:{findFirst:async({where}:any)=>where.userId!=='owner'||where.id==='foreign'?null:{id:where.id,name:where.id.includes('kite')?'ZERODHA':where.id.includes('binance')?'BINANCE':'DELTA',sandbox:where.id.includes('demo'),apiKey:'fixture-key',accessToken:'fixture-token',tokenIssuedAt:new Date()}}}}));
const {loadMarketCatalog,searchMarkets,assertMarketSymbols,parseInstrumentCsv}=await import('../src/features/markets/server/catalog');
test('CCXT discovery pins India environment, filters supported perpetuals and caches public metadata',async()=>{
 const catalog=await loadMarketCatalog('owner',{exchangeId:'delta',scope:'CRYPTO'});
 expect(catalog.markets.map(m=>m.value)).toEqual(['BTCUSD','XRPUSD']);expect(calls[0].urls.api.public).toBe('https://api.india.delta.exchange');
 expect(searchMarkets(catalog,'bitcoin').markets[0]?.value).toBe('BTCUSD');expect(searchMarkets(catalog,'BTC / USD : USD').markets[0]?.value).toBe('BTCUSD');
 const before=loads;await loadMarketCatalog('owner',{exchangeId:'delta',scope:'CRYPTO'});expect(loads).toBe(before);
 await expect(loadMarketCatalog('outsider',{exchangeId:'delta',scope:'CRYPTO'})).rejects.toMatchObject({code:'NOT_FOUND'});
 await expect(loadMarketCatalog('owner',{exchangeId:'delta',scope:'STOCKS'})).rejects.toMatchObject({code:'BAD_REQUEST'});
 const demo=await loadMarketCatalog('owner',{exchangeId:'delta-demo',scope:'CRYPTO'});expect(demo.markets).toHaveLength(2);expect(calls.at(-1).sandbox).toBe(true);
});
test('Binance returns unified futures symbols and rejects unavailable or duplicate market aliases',async()=>{
 const catalog=await loadMarketCatalog('owner',{exchangeId:'binance',scope:'CRYPTO'});expect(catalog.markets.map(m=>m.value)).toEqual(['BTC/USDT:USDT']);
 expect(calls.at(-1).options.fetchMarkets).toEqual({types:['linear']});
 await expect(assertMarketSymbols('owner','binance','CRYPTO',['BTCUSDT','BTC/USDT:USDT'])).rejects.toMatchObject({code:'BAD_REQUEST'});
 await expect(assertMarketSymbols('owner','binance','CRYPTO',['SPOTUSD'])).rejects.toMatchObject({code:'BAD_REQUEST'});
 await assertMarketSymbols('owner','binance','CRYPTO',['BTC/USDT:USDT']);
});
test('CSV handles quoted names and rejects missing headers or partial records',()=>{
 expect(parseInstrumentCsv('tradingsymbol,name,instrument_token,instrument_type,segment,exchange,lot_size,tick_size\r\nABC,"A, B ""Limited""",12,EQ,NSE,NSE,1,0.05\r\n')[0]?.name).toBe('A, B "Limited"');
 expect(()=>parseInstrumentCsv('broken\nrow')).toThrow();expect(()=>parseInstrumentCsv('tradingsymbol,name,instrument_token,instrument_type,segment,exchange,lot_size,tick_size\nA,"unclosed')).toThrow();
});
test('Kite adapter requires an owned fresh token even on cache hits and includes only NSE equities',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=(async(input,options)=>{
  fetches++;expect(String(input)).toBe('https://api.kite.trade/instruments/NSE');expect((options?.headers as any)['X-Kite-Version']).toBe('3');
  return new Response('tradingsymbol,name,instrument_token,instrument_type,segment,exchange,lot_size,tick_size\nINFY,INFOSYS,408065,EQ,NSE,NSE,1,0.05\nNIFTYFUT,,1,FUT,NFO-FUT,NFO,50,0.05\nINFY,INFOSYS,2,EQ,BSE,BSE,1,0.05\n');
 }) as typeof fetch;
 try{
  const catalog=await loadMarketCatalog('owner',{exchangeId:'kite',scope:'STOCKS'});expect(catalog.markets.map(m=>m.value)).toEqual(['INFY']);expect(searchMarkets(catalog,'infosys').markets[0]?.value).toBe('INFY');
  const before=fetches;await loadMarketCatalog('owner',{exchangeId:'kite-other',scope:'STOCKS'});expect(fetches).toBe(before);
  fresh=false;await expect(loadMarketCatalog('owner',{exchangeId:'kite',scope:'STOCKS'})).rejects.toMatchObject({code:'PRECONDITION_FAILED'});
 }finally{fresh=true;globalThis.fetch=original;}
});
test('broker failures are sanitized and failed catalog loads can be retried',async()=>{
 fail=true;try{await loadMarketCatalog('owner',{exchangeId:'binance-demo',scope:'CRYPTO'});throw new Error('Expected failure');}catch(error){expect(error).toMatchObject({code:'BAD_GATEWAY'});expect(String(error)).not.toContain('private upstream');}
 fail=false;expect((await loadMarketCatalog('owner',{exchangeId:'binance-demo',scope:'CRYPTO'})).markets).toHaveLength(1);
});
test('search results are bounded without hiding an exact match beyond the first page',()=>{
 const markets=Array.from({length:100},(_,i)=>({value:`T${i}`,symbol:`T${i}`,nativeSymbol:`T${i}`,name:'Test',kind:'equity' as const,venue:'NSE',settlement:'INR',contractSize:null,lotSize:1,tickSize:0.05}));
 const catalog={markets,loadedAt:'fixture'};expect(searchMarkets(catalog,'').markets).toHaveLength(30);expect(searchMarkets(catalog,'').total).toBe(100);expect(searchMarkets(catalog,'T99').markets[0]?.value).toBe('T99');
});
