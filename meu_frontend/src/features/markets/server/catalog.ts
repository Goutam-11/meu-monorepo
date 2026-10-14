import 'server-only';
import ccxt from 'ccxt';
import {TRPCError} from '@trpc/server';
import prisma from '@/lib/db';
import {decryptSecret} from '@/lib/security/encryption';
import {isKiteTokenFresh} from '@/features/exchange/server/kite';

export type MarketChoice = {
  value:string; symbol:string; nativeSymbol:string; name:string;
  kind:'perpetual'|'equity'; venue:string; settlement:string;
  contractSize:number|null; lotSize:number|null; tickSize:number|null;
};
type Catalog={markets:MarketChoice[];loadedAt:string};
const cryptoAdapters={DELTA:ccxt.delta,BINANCE:ccxt.binance,BYBIT:ccxt.bybit,KRAKEN:ccxt.kraken,KUCOIN:ccxt.kucoin};
const cached=new Map<string,{catalog:Catalog;expires:number}>();
const pending=new Map<string,Promise<Catalog>>();
const normalize=(text:string)=>text.toLowerCase().replace(/[^a-z0-9]/g,'');
const positive=(value:unknown)=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;

// Handles quoted names, escaped quotes, embedded newlines and CRLF in Kite CSV.
export function parseInstrumentCsv(csv:string) {
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
  for(let i=0;i<csv.length;i++) {
    const char=csv[i];
    if(char==='"') {
      if(quoted&&csv[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    } else if(!quoted&&(char===','||char==='\n')) {
      row.push(cell.replace(/\r$/,''));cell='';
      if(char==='\n'){if(row.some(Boolean))rows.push(row);row=[];}
    } else cell+=char;
    if(rows.length>50000)throw new Error('Instrument list too large');
  }
  if(quoted)throw new Error('Incomplete instrument CSV');
  row.push(cell.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);
  const header=rows.shift()?.map(c=>c.replace(/^\uFEFF/,''));
  if(!header||!['tradingsymbol','name','instrument_token','instrument_type','segment','exchange','lot_size','tick_size'].every(key=>header.includes(key)))throw new Error('Invalid instrument CSV');
  return rows.map(values=>{
    if(values.length!==header.length)throw new Error('Incomplete instrument row');
    return Object.fromEntries(header.map((key,index)=>[key,values[index]]));
  });
}
async function kiteMarkets(connection:{apiKey:string;accessToken?:string|null}) {
  const response=await fetch('https://api.kite.trade/instruments/NSE',{
    headers:{Authorization:`token ${decryptSecret(connection.apiKey)}:${decryptSecret(connection.accessToken ?? '')}`,'X-Kite-Version':'3'},
    cache:'no-store',signal:AbortSignal.timeout(15000),
  });
  if(!response.ok||!response.body)throw new Error('Kite instrument request failed');
  const reader=response.body.getReader();const decoder=new TextDecoder();let csv='',bytes=0;
  try {
    for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>8*1024*1024)throw new Error('Instrument response too large');csv+=decoder.decode(value,{stream:true});}
    csv+=decoder.decode();
  } finally {await reader.cancel();}
  return parseInstrumentCsv(csv).filter(row=>row.exchange==='NSE'&&row.segment==='NSE'&&row.instrument_type==='EQ').map((row):MarketChoice=>{
    if(!row.tradingsymbol||!positive(row.instrument_token)||!positive(row.lot_size)||!positive(row.tick_size))throw new Error('Invalid instrument metadata');
    return{value:row.tradingsymbol,symbol:row.tradingsymbol,nativeSymbol:row.tradingsymbol,name:row.name||row.tradingsymbol,kind:'equity',venue:'NSE',settlement:'INR',contractSize:null,lotSize:Number(row.lot_size),tickSize:Number(row.tick_size)};
  });
}
async function cryptoMarkets(name:keyof typeof cryptoAdapters,sandbox:boolean) {
  // Public market discovery never receives saved account credentials.
  const exchange=new cryptoAdapters[name]({timeout:15000,enableRateLimit:true,verbose:false});
  if(name==='DELTA') {
    exchange.urls.api={public:'https://api.india.delta.exchange',private:'https://api.india.delta.exchange'};
    exchange.urls.test={public:'https://cdn-ind.testnet.deltaex.org',private:'https://cdn-ind.testnet.deltaex.org'};
  }
  if(name==='BINANCE')exchange.options={...exchange.options,defaultType:'future',defaultSubType:'linear',fetchMarkets:{types:['linear']}};
  if(sandbox)exchange.setSandboxMode(true);
  const markets=await exchange.loadMarkets();
  const choices:MarketChoice[]=[];
  for(const m of Object.values(markets)) {
    if(!m||!m.id||!m.symbol||!m.base||!m.settle||m.active!==true||!m.swap||!m.linear||m.inverse||m.quanto||m.info?.is_quanto===true||m.settle!==m.quote||!positive(m.contractSize)||
      (name==='DELTA'&&m.settle!=='USD')||(name==='BINANCE'&&m.settle!=='USDT'))continue;
    const label=exchange.currencies?.[m.base]?.name||m.info?.underlying_asset?.name||m.base;
    choices.push({value:name==='DELTA'?m.id:m.symbol,symbol:m.symbol,nativeSymbol:m.id,name:typeof label==='string'?label:m.base,
      kind:'perpetual',venue:name,settlement:m.settle,contractSize:positive(m.contractSize),lotSize:positive(m.limits?.amount?.min),tickSize:positive(m.info?.tick_size)});
  }
  return choices;
}
export async function loadMarketCatalog(userId:string,source:{exchangeId?:string;venue?:'DELTA';scope:'CRYPTO'|'STOCKS'}) {
  let name='DELTA',sandbox=false;
  let connection:Awaited<ReturnType<typeof prisma.exchange.findFirst>>=null;
  if(source.exchangeId) {
    connection=await prisma.exchange.findFirst({where:{id:source.exchangeId,userId}});
    if(!connection)throw new TRPCError({code:'NOT_FOUND',message:'Exchange connection not found'});
    name=connection.name.toUpperCase();sandbox=Boolean(connection.sandbox);
  } else if(source.venue!=='DELTA'||source.scope!=='CRYPTO')throw new TRPCError({code:'BAD_REQUEST',message:'Select an exchange first'});
  if((name==='ZERODHA')!==(source.scope==='STOCKS'))throw new TRPCError({code:'BAD_REQUEST',message:'Select an exchange matching the asset class'});
  if(name==='ZERODHA'&&(!connection?.apiKey||!isKiteTokenFresh(connection)))throw new TRPCError({code:'PRECONDITION_FAILED',message:'Sign in to Kite from the exchange dashboard today to load NSE tickers.'});
  if(name!=='ZERODHA'&&!Object.hasOwn(cryptoAdapters,name))throw new TRPCError({code:'BAD_REQUEST',message:'Market discovery is unavailable for this exchange'});
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date());
  const key=name==='ZERODHA'?`ZERODHA:${day}`:`${name}:${sandbox}`;
  const now=Date.now();
  for(const [key,entry] of cached)if(entry.expires<=now)cached.delete(key);
  const hit=cached.get(key);if(hit)return hit.catalog;
  const existing=pending.get(key);if(existing)return existing;
  if(pending.size>=4)throw new TRPCError({code:'TOO_MANY_REQUESTS',message:'Market discovery is busy. Try again shortly.'});
  const load=(async()=>{
    try {
      const markets=name==='ZERODHA'?await kiteMarkets(connection!):await cryptoMarkets(name as keyof typeof cryptoAdapters,sandbox);
      if(markets.length>50000)throw new Error('Empty or oversized market catalog');
      const catalog={markets:markets.sort((a,b)=>a.nativeSymbol.localeCompare(b.nativeSymbol)),loadedAt:new Date().toISOString()};
      if(cached.size>=16)cached.delete(cached.keys().next().value!);
      cached.set(key,{catalog,expires:Date.now()+(name==='ZERODHA'?24*3600000:5*60000)});
      return catalog;
    } catch {
      throw new TRPCError({code:'BAD_GATEWAY',message:name==='ZERODHA'?'Could not load Kite instruments. Check today’s Kite login and retry.':'Could not load exchange markets. Check the connection environment and retry.'});
    } finally {pending.delete(key);}
  })();
  pending.set(key,load);return load;
}
export function searchMarkets(catalog:Catalog,query:string) {
  const needle=normalize(query);
  const matches=catalog.markets.filter(m=>!needle||[m.nativeSymbol,m.symbol,m.name,m.settlement].some(value=>normalize(value).includes(needle)));
  if(needle)matches.sort((a,b)=>{
    const score=(m:MarketChoice)=>normalize(m.nativeSymbol)===needle||normalize(m.symbol)===needle?0:normalize(m.nativeSymbol).startsWith(needle)?1:2;
    return score(a)-score(b)||a.nativeSymbol.localeCompare(b.nativeSymbol);
  });
  return{markets:matches.slice(0,30),total:matches.length,loadedAt:catalog.loadedAt};
}
export async function assertMarketSymbols(userId:string,exchangeId:string,scope:'CRYPTO'|'STOCKS',symbols:string[]) {
  const catalog=await loadMarketCatalog(userId,{exchangeId,scope});
  if(symbols.length>100)throw new TRPCError({code:'BAD_REQUEST',message:'Choose at most 100 tickers per agent.'});
  const selected=new Set<string>();
  for(const symbol of symbols) {
    const market=catalog.markets.find(m=>m.value===symbol||m.nativeSymbol===symbol||m.symbol===symbol);
    if(!market)throw new TRPCError({code:'BAD_REQUEST',message:'A selected ticker is unavailable or unsupported. Reload the ticker picker.'});
    if(selected.has(market.symbol))throw new TRPCError({code:'BAD_REQUEST',message:'Choose distinct tickers for this agent.'});
    selected.add(market.symbol);
  }
}
