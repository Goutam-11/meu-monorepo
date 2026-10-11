import { createHash } from "node:crypto";

const API_ORIGIN = "https://api.india.delta.exchange";
const MAX_CANDLES = 10_000;
const CHUNK_CANDLES = 1_000;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_REQUESTS = 11;
const MAX_ATTEMPTS = 3;
const LOAD_BUDGET_MS = 60_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

const TIMEFRAMES = {
  "15m": 15 * 60,
  "1h": 60 * 60,
  "4h": 4 * 60 * 60,
  "1d": 24 * 60 * 60,
} as const;

export type DeltaTimeframe = keyof typeof TIMEFRAMES;

export type DeltaBacktestCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closed: true;
};

export type DeltaBacktestContract = {
  symbol: string;
  contractSize: number;
  minContracts: number;
  maintenanceMarginRate: number;
  settlement: "USD";
};

export type DeltaBacktestData = {
  symbol: string;
  timeframe: DeltaTimeframe;
  start: number;
  end: number;
  candles: DeltaBacktestCandle[];
  contract: DeltaBacktestContract;
  dataHash: string;
  warnings: string[];
};

export type LoadDeltaBacktestDataOptions = {
  symbol: string;
  timeframe: DeltaTimeframe;
  start: number;
  end: number;
  fetch?: typeof globalThis.fetch;
};

type ApiEnvelope<T> = { success?: boolean; result?: T };
type DeltaProduct = {
  symbol?: unknown;
  contract_type?: unknown;
  notional_type?: unknown;
  is_quanto?: unknown;
  contract_value?: unknown;
  maintenance_margin?: unknown;
  settling_asset?: { symbol?: unknown };
  settlement_asset?: { symbol?: unknown };
};
type RawCandle = {
  time?: unknown;
  open?: unknown;
  high?: unknown;
  low?: unknown;
  close?: unknown;
  volume?: unknown;
};

export class DeltaDataValidationError extends Error {
  readonly code = 'DELTA_DATA_INVALID';
  constructor(message:string) { super(message); this.name='DeltaDataValidationError'; }
}
function fail(message: string): never {
  throw new DeltaDataValidationError(message);
}

function parseFinite(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export type DeltaDataErrorCode = 'DELTA_DATA_TIMEOUT' | 'DELTA_DATA_NETWORK' | 'DELTA_DATA_RATE_LIMIT' | 'DELTA_DATA_UPSTREAM' | 'DELTA_DATA_HTTP' | 'DELTA_DATA_RESPONSE';
export class DeltaDataError extends Error {
  readonly retryable: boolean;
  constructor(readonly code: DeltaDataErrorCode, readonly endpoint: 'product details' | 'candle history', readonly attempts: number, readonly httpStatus?: number, readonly retryAfterMs = 0) {
    const reason = {
      DELTA_DATA_TIMEOUT: 'exceeded the 8-second request timeout',
      DELTA_DATA_NETWORK: 'could not connect or finish downloading the response',
      DELTA_DATA_RATE_LIMIT: 'was rate limited (HTTP 429)',
      DELTA_DATA_UPSTREAM: `returned a temporary server error (HTTP ${httpStatus})`,
      DELTA_DATA_HTTP: `was refused (HTTP ${httpStatus})`,
      DELTA_DATA_RESPONSE: 'returned an invalid or oversized response',
    }[code];
    super(`Delta India public ${endpoint} request ${reason} after ${attempts} attempt${attempts === 1 ? '' : 's'}.`);
    this.name = 'DeltaDataError';
    this.retryable = ['DELTA_DATA_TIMEOUT','DELTA_DATA_NETWORK','DELTA_DATA_RATE_LIMIT','DELTA_DATA_UPSTREAM'].includes(code);
  }
  details() {
    return { code:this.code, endpoint:this.endpoint, attempts:this.attempts, timeoutMs:REQUEST_TIMEOUT_MS, ...(this.httpStatus ? {httpStatus:this.httpStatus} : {}), retryAfterMs:this.retryAfterMs };
  }
}
function retryDelay(response: Response) {
  const value = response.headers.get('retry-after');
  if (!value) return 0;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds*1000 : Date.parse(value)-Date.now();
  return Number.isFinite(delay) && delay > 0 ? Math.min(24*60*60_000,Math.ceil(delay)) : 0;
}
async function getJson<T>(fetcher: typeof globalThis.fetch, url: URL, deadline: number): Promise<T> {
  const endpoint = url.pathname.includes('/products/') ? 'product details' : 'candle history';
  for (let attempt=1; attempt<=MAX_ATTEMPTS; attempt++) {
    const signal = AbortSignal.timeout(Math.max(1,Math.min(REQUEST_TIMEOUT_MS,deadline-Date.now())));
    let response: Response | undefined;
    try {
      response = await fetcher(url, { method:'GET', headers:{Accept:'application/json'}, signal, cache:'no-store', redirect:'error' });
      if (!response.ok) {
        const status=response.status;
        throw new DeltaDataError(status===429 ? 'DELTA_DATA_RATE_LIMIT' : status>=500 ? 'DELTA_DATA_UPSTREAM' : 'DELTA_DATA_HTTP',endpoint,attempt,status,retryDelay(response));
      }
      const contentLength=Number(response.headers.get('content-length'));
      if ((Number.isFinite(contentLength) && contentLength>MAX_RESPONSE_BYTES) || !response.body)
        throw new DeltaDataError('DELTA_DATA_RESPONSE',endpoint,attempt);
      const reader=response.body.getReader(), chunks:Uint8Array[]=[];
      let bytes=0;
      try {
        while (true) {
          const {done,value}=await reader.read();
          if(done)break;
          bytes+=value.byteLength;
          if(bytes>MAX_RESPONSE_BYTES)throw new DeltaDataError('DELTA_DATA_RESPONSE',endpoint,attempt);
          chunks.push(value);
        }
      } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
      const buffer=new Uint8Array(bytes);
      let offset=0;
      for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}
      let body:unknown;
      try {body=JSON.parse(new TextDecoder().decode(buffer));}
      catch {throw new DeltaDataError('DELTA_DATA_RESPONSE',endpoint,attempt);}
      if(!body || typeof body!=='object' || (body as ApiEnvelope<unknown>).success!==true)
        throw new DeltaDataError('DELTA_DATA_RESPONSE',endpoint,attempt);
      return (body as ApiEnvelope<T>).result as T;
    } catch (cause) {
      const error = cause instanceof DeltaDataError ? cause : new DeltaDataError(signal.aborted || (cause instanceof Error && ['TimeoutError','AbortError'].includes(cause.name)) ? 'DELTA_DATA_TIMEOUT' : 'DELTA_DATA_NETWORK',endpoint,attempt);
      await response?.body?.cancel().catch(()=>{});
      const delay=Math.max(500*2**(attempt-1),error.retryAfterMs);
      if(!error.retryable || attempt===MAX_ATTEMPTS || delay>2000 || Date.now()+delay>=deadline)throw error;
      await new Promise(resolve=>setTimeout(resolve,delay));
    }
  }
  throw new Error('Delta request attempts exhausted');
}

function validateRequest(options: LoadDeltaBacktestDataOptions): number {
  const { symbol, timeframe, start, end } = options;
  if (typeof symbol !== "string" || !/^[A-Z0-9-]{1,40}$/.test(symbol)) {
    return fail("Invalid Delta product symbol.");
  }
  if (!Object.hasOwn(TIMEFRAMES, timeframe)) return fail("Unsupported Delta timeframe.");
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start) {
    return fail("Start and end must be valid, increasing Unix timestamps in seconds.");
  }
  const interval = TIMEFRAMES[timeframe as DeltaTimeframe];
  if (start % interval !== 0 || end % interval !== 0) {
    return fail("Start and end must align to the selected candle timeframe.");
  }
  const count = (end - start) / interval;
  if (count > MAX_CANDLES) return fail(`Requested range exceeds ${MAX_CANDLES} candles.`);
  if (end > Math.floor(Date.now() / 1000)) return fail("End must not be in the future.");
  return count;
}

function verifyProduct(symbol: string, product: DeltaProduct | undefined): DeltaBacktestContract {
  if (!product || product.symbol !== symbol) return fail("Delta product metadata did not match the requested symbol.");
  const settlementSymbol = product.settling_asset?.symbol ?? product.settlement_asset?.symbol;
  if (product.contract_type !== "perpetual_futures" || product.notional_type !== "vanilla" || product.is_quanto !== false || settlementSymbol !== "USD") {
    return fail("Only verified linear USD-settled perpetual contracts are supported.");
  }
  const contractSize = parseFinite(product.contract_value);
  const maintenanceMarginRate = parseFinite(product.maintenance_margin);
  const minContracts = 1;
  if (contractSize === undefined || contractSize <= 0 || maintenanceMarginRate === undefined || maintenanceMarginRate <= 0 || maintenanceMarginRate >= 100) {
    return fail("Delta product metadata is missing verified contract sizing or margin fields.");
  }
  return { symbol, contractSize, minContracts, maintenanceMarginRate: maintenanceMarginRate / 100, settlement: "USD" };
}

function parseCandles(rawCandles: RawCandle[], timeframe: DeltaTimeframe): DeltaBacktestCandle[] {
  if (!Array.isArray(rawCandles)) return fail("Delta candle response was malformed.");
  const interval = TIMEFRAMES[timeframe];
  const candles = rawCandles.map((raw) => {
    if (!raw || typeof raw !== "object") return fail("Delta candle response was malformed.");
    const timestamp = parseFinite(raw.time);
    const open = parseFinite(raw.open);
    const high = parseFinite(raw.high);
    const low = parseFinite(raw.low);
    const close = parseFinite(raw.close);
    const volume = parseFinite(raw.volume);
    if ([timestamp, open, high, low, close, volume].some((value) => value === undefined)) {
      return fail("Delta candle contained invalid numeric fields.");
    }
    if (!Number.isSafeInteger(timestamp) || timestamp! < 0 || timestamp! % interval !== 0 || volume! < 0 || open! <= 0 || high! <= 0 || low! <= 0 || close! <= 0 || high! < Math.max(open!, close!, low!) || low! > Math.min(open!, close!, high!)) {
      return fail("Delta candle contained invalid OHLCV values.");
    }
    return { timestamp: timestamp!, open: open!, high: high!, low: low!, close: close!, volume: volume!, closed: true as const };
  });
  return candles;
}

/** Load bounded, read-only Delta India candles for a backtest. */
export async function loadDeltaBacktestData(options: LoadDeltaBacktestDataOptions): Promise<DeltaBacktestData> {
  const expectedCount = validateRequest(options);
  const { symbol, timeframe, start, end } = options;
  const fetcher = options.fetch ?? globalThis.fetch;
  const deadline = Date.now()+LOAD_BUDGET_MS;
  const productUrl = new URL(`${API_ORIGIN}/v2/products/${encodeURIComponent(symbol)}`);
  const envelopeProduct = await getJson<DeltaProduct | { product?: DeltaProduct }>(fetcher, productUrl, deadline);
  const product = envelopeProduct && "product" in envelopeProduct ? envelopeProduct.product : envelopeProduct as DeltaProduct;
  const contract = verifyProduct(symbol, product);

  const interval = TIMEFRAMES[timeframe];
  const all: DeltaBacktestCandle[] = [];
  let requestCount = 1;
  for (let cursor = start; cursor < end; cursor += CHUNK_CANDLES * interval) {
    if (++requestCount > MAX_REQUESTS) return fail("Delta request limit exceeded.");
    const chunkEnd = Math.min(end, cursor + CHUNK_CANDLES * interval);
    const url = new URL(`${API_ORIGIN}/v2/history/candles`);
    url.searchParams.set("resolution", timeframe);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("start", String(cursor));
    url.searchParams.set("end", String(chunkEnd - 1));
    const raw = await getJson<RawCandle[]>(fetcher, url, deadline);
    const candles = parseCandles(raw, timeframe);
    if (candles.length > CHUNK_CANDLES) return fail("Delta returned more candles than the bounded request allows.");
    all.push(...candles.filter((candle) => candle.timestamp >= cursor && candle.timestamp < chunkEnd));
  }

  all.sort((a, b) => a.timestamp - b.timestamp);
  const deduped: DeltaBacktestCandle[] = [];
  for (const candle of all) {
    const previous = deduped[deduped.length - 1];
    if (!previous || candle.timestamp !== previous.timestamp) deduped.push(candle);
    else if (JSON.stringify(candle) !== JSON.stringify(previous)) return fail("Delta returned conflicting candles for the same interval.");
  }
  if (deduped.length !== expectedCount) return fail("Delta candle history contains missing or duplicate intervals.");
  for (let index = 0; index < deduped.length; index += 1) {
    const expectedTimestamp = start + index * interval;
    if (deduped[index]!.timestamp !== expectedTimestamp) return fail("Delta candle history contains a gap.");
    if (deduped[index]!.timestamp + interval > Math.floor(Date.now() / 1000)) {
      return fail("Delta returned an unfinished candle.");
    }
  }

  const canonical = JSON.stringify({ symbol, timeframe, start, end, contract, candles: deduped });
  return {
    symbol,
    timeframe,
    start,
    end,
    candles: deduped,
    contract,
    dataHash: createHash("sha256").update(canonical).digest("hex"),
    warnings: [
      "Contract metadata reflects the current Delta product snapshot and may differ from historical terms.",
      "Minimum quantity is one integer contract, following Delta's integer order-size API; product-specific order minimums are not exposed by the public product response.",
      "Funding history is not included; backtests must use an explicit funding assumption and must not treat it as observed settlement data.",
    ],
  };
}
