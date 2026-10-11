import { describe, expect, it } from "bun:test";
import {
  loadDeltaBacktestData,
  type DeltaTimeframe,
  type LoadDeltaBacktestDataOptions,
} from "../src/features/backtests/server/delta-data";

const interval = 15 * 60;
const start = 1_700_000_100 - (1_700_000_100 % interval);
const end = start + interval * 3;
const product = {
  symbol: "BTCUSD",
  contract_type: "perpetual_futures",
  notional_type: "vanilla",
  is_quanto: false,
  contract_value: "0.001",
  maintenance_margin: "0.25",
  settling_asset: { symbol: "USD" },
};

function candle(time: number, close = 10): object {
  return { time, open: close - 1, high: close + 1, low: close - 2, close, volume: 5 };
}

function fakeFetch(candles: (start: number, end: number, resolution: string) => object[] = (from, to) => {
  const result = [];
  for (let time = from; time < to; time += interval) result.push(candle(time));
  return result;
}) {
  const calls: { url: URL; init?: RequestInit }[] = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    calls.push({ url, init });
    if (url.pathname.endsWith("/products/BTCUSD")) {
      return Response.json({ success: true, result: product });
    }
    const resolution = url.searchParams.get("resolution")!;
    const step = resolution === "15m" ? interval : resolution === "1h" ? 3600 : resolution === "4h" ? 14400 : 86400;
    const from = Number(url.searchParams.get("start"));
    const to = Number(url.searchParams.get("end")) + 1;
    return Response.json({ success: true, result: candles(from, to, resolution).filter((item) => {
      const time = Number((item as { time: number }).time);
      return time % step === 0;
    }) });
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

function request(overrides: Partial<LoadDeltaBacktestDataOptions> = {}): LoadDeltaBacktestDataOptions {
  return { symbol: "BTCUSD", timeframe: "15m", start, end, ...overrides };
}

describe("Delta historical backtest data", () => {
  it("returns ordered closed candles, verified contract values, warnings, and a stable hash", async () => {
    const { fetcher, calls } = fakeFetch();
    const data = await loadDeltaBacktestData({ ...request(), fetch: fetcher });
    expect(data.candles.map(({ timestamp }) => timestamp)).toEqual([start, start + interval, start + 2 * interval]);
    expect(data.candles.every(({ closed }) => closed)).toBe(true);
    expect(data.contract).toEqual({
      symbol: "BTCUSD",
      contractSize: 0.001,
      minContracts: 1,
      maintenanceMarginRate: 0.0025,
      settlement: "USD",
    });
    expect(data.dataHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.warnings.some((warning) => warning.includes("Funding history is not included"))).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls.every(({ init }) => init?.method === "GET" && init?.redirect === "error")).toBe(true);
    expect(calls.every(({ url }) => url.origin === "https://api.india.delta.exchange")).toBe(true);
  });

  it("sorts and deduplicates identical overlaps while rejecting conflicting duplicates", async () => {
    const { fetcher } = fakeFetch((from) => [candle(from + interval), candle(from), candle(from)]);
    const data = await loadDeltaBacktestData({ ...request({ end: start + interval * 2 }), fetch: fetcher });
    expect(data.candles.map(({ timestamp }) => timestamp)).toEqual([start, start + interval]);

    const conflict = fakeFetch((from) => [candle(from), candle(from, 20), candle(from + interval)]);
    await expect(loadDeltaBacktestData({ ...request({ end: start + interval * 2 }), fetch: conflict.fetcher })).rejects.toThrow("conflicting candles");
  });

  it("rejects gaps, malformed OHLC, unfinished bars, unsupported metadata, and unsafe input", async () => {
    const gap = fakeFetch((from) => [candle(from), candle(from + interval * 2)]);
    await expect(loadDeltaBacktestData({ ...request(), fetch: gap.fetcher })).rejects.toThrow("missing or duplicate intervals");

    const badOhlc = fakeFetch((from) => [{ time: from, open: 10, high: 8, low: 9, close: 10, volume: 1 }]);
    await expect(loadDeltaBacktestData({ ...request({ end: start + interval }), fetch: badOhlc.fetcher })).rejects.toThrow("invalid OHLCV");

    const badProduct = fakeFetch();
    const unsupportedFetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      if (url.pathname.endsWith("/products/BTCUSD")) {
        return Response.json({ success: true, result: { ...product, settling_asset: { symbol: "INR" } } });
      }
      return badProduct.fetcher(input, init);
    }) as unknown as typeof fetch;
    await expect(loadDeltaBacktestData({ ...request(), fetch: unsupportedFetcher })).rejects.toThrow("Only verified linear USD-settled");

    await expect(loadDeltaBacktestData(request({ symbol: "BTCUSD/../secret" }))).rejects.toThrow("Invalid Delta product symbol");
    await expect(loadDeltaBacktestData(request({ timeframe: "constructor" as DeltaTimeframe }))).rejects.toThrow("Unsupported Delta timeframe");
    await expect(loadDeltaBacktestData(request({ start: start + 1 }))).rejects.toThrow("must align");
  });

  it("requests at most 1000 candles per chunk and caps the total to 10000", async () => {
    const longEnd = start + interval * 1001;
    const { fetcher, calls } = fakeFetch((from, to) => {
      const output = [];
      for (let time = from; time < to; time += interval) output.push(candle(time));
      return output;
    });
    const data = await loadDeltaBacktestData({ ...request({ end: longEnd }), fetch: fetcher });
    const candleCalls = calls.filter(({ url }) => url.pathname.endsWith("/history/candles"));
    expect(data.candles).toHaveLength(1001);
    expect(candleCalls).toHaveLength(2);
    expect(candleCalls.map(({ url }) => Number(url.searchParams.get("end")) - Number(url.searchParams.get("start")) + 1))
      .toEqual([interval * 1000, interval]);
    await expect(loadDeltaBacktestData(request({ end: start + interval * 10001 }))).rejects.toThrow("exceeds 10000 candles");
  });
});

describe('Delta transport retry classification',()=>{
 it('retries a transient server failure and succeeds without replaying successful requests',async()=>{
  const fixture=fakeFetch();let calls=0;
  const fetcher=(async(input:RequestInfo|URL,init?:RequestInit)=>{if(++calls===1)return new Response('',{status:503});return fixture.fetcher(input,init);}) as unknown as typeof fetch;
  const result=await loadDeltaBacktestData({...request(),fetch:fetcher});expect(result.candles).toHaveLength(3);expect(calls).toBe(3);
 });
 it('records timeout exhaustion, endpoint and bounded attempts without storing the raw cause',async()=>{
  let calls=0;const fetcher=(async()=>{calls++;throw new DOMException('signed request secret','TimeoutError');}) as unknown as typeof fetch;
  try {await loadDeltaBacktestData({...request(),fetch:fetcher});throw new Error('Expected failure');}
  catch(error){expect(error).toMatchObject({code:'DELTA_DATA_TIMEOUT',endpoint:'product details',attempts:3,retryable:true});expect(String(error)).not.toContain('signed request secret');}
  expect(calls).toBe(3);
 });
 it('does not retry authentication errors, malformed JSON or oversized bodies',async()=>{
  for(const response of [()=>new Response('',{status:403}),()=>new Response('not json'),()=>new Response('x',{headers:{'content-length':'3000000'}})]){
   let calls=0;const fetcher=(async()=>{calls++;return response();}) as unknown as typeof fetch;
   await expect(loadDeltaBacktestData({...request(),fetch:fetcher})).rejects.toMatchObject({retryable:false,attempts:1});expect(calls).toBe(1);
  }
 });
 it('honors long Retry-After without sleeping inside the loader',async()=>{
  let calls=0;const fetcher=(async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':'120'}});}) as unknown as typeof fetch;
  await expect(loadDeltaBacktestData({...request(),fetch:fetcher})).rejects.toMatchObject({code:'DELTA_DATA_RATE_LIMIT',httpStatus:429,retryAfterMs:120000,attempts:1});expect(calls).toBe(1);
 });
 it('classifies body download failures as network errors and retries them',async()=>{
  let calls=0;const fetcher=(async()=>{calls++;return new Response(new ReadableStream({start(controller){controller.error(new Error('private transport error'));}}));}) as unknown as typeof fetch;
  await expect(loadDeltaBacktestData({...request(),fetch:fetcher})).rejects.toMatchObject({code:'DELTA_DATA_NETWORK',attempts:3});expect(calls).toBe(3);
 });
});
