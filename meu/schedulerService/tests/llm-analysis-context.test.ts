import { afterAll, beforeEach, expect, mock, test } from 'bun:test';
import type { Exchange } from 'ccxt';
import { TPROMPT } from '../src/agents/llm/prompts/tradingPrompt';
let prompt = '';
let invocations = 0;
mock.module('ai', () => ({ ToolLoopAgent: class {
  async generate(input: { prompt: string }) { invocations++; prompt = input.prompt; return { text: 'HOLD', steps: [], finishReason: 'stop', totalUsage: {} }; }
} }));
mock.module('@/execution/crypto/cryptoTools', () => ({ getCryptoTools: () => ({}) }));
mock.module('@/agents/llm/providers', () => ({ LLM_REQUEST_TIMEOUT_MS: 1000, resolveLLMProvider: () => ({ id: 'fixture', createModel: () => ({}) }) }));
mock.module('@/brokers/crypto/cryptoRisk', () => ({ normalizeCryptoPositions: (_exchange: unknown, positions: unknown) => positions }));
mock.module('@/lib/logger', () => ({ logger: { child: () => ({ info() {}, error() {} }) }, errMeta: () => ({}) }));
const { tradingAgent } = await import('../src/agents/llm/vercelAgent');
const timeframes = { '15m': 900_000, '4h': 14_400_000, '1d': 86_400_000 };
function exchange(optionalFailure = false, stalePrimary = false) {
  let brokerReads = 0;
  const api = {
    timeframes,
    market: () => ({ symbol: 'BTC/USD:USD', contractSize: 0.001, quote: 'USD', settle: 'USD' }),
    fetchOHLCV: async (_symbol: string, timeframe: keyof typeof timeframes, since: number, limit: number) => {
      if (optionalFailure && timeframe !== '15m') throw new Error('temporary public data failure');
      const step = timeframes[timeframe]; const boundary = Math.floor(Date.now() / step) * step;
      return Array.from({ length: 251 }, (_, i) => [boundary - (250 - i) * step, 100, 102, 99, 101, 10])
        .filter(row => row[0]! >= since && (!stalePrimary || timeframe !== '15m' || row[0]! < boundary - step)).slice(0, limit);
    },
    fetchMyTrades: async () => { brokerReads++; return []; },
    fetchPositions: async () => { brokerReads++; return []; },
    fetchBalance: async () => { brokerReads++; return { total: { USD: 25 }, free: { USD: 20 } }; },
  };
  return { api: api as unknown as Exchange, reads: () => brokerReads };
}
const reviewContext = { currentRunStartedAt: '2026-10-10T12:00:00Z', scheduledReviewAt: '2026-10-10T12:00:00Z', reviewCadenceSeconds: 300, lastSuccessfulReviewAt: '2026-10-10T11:55:00Z', completedReviewCount: 7, nextScheduledReviewAt: null, nextReviewPolicy: '300 seconds after completion' };
beforeEach(() => { prompt = ''; invocations = 0; });
afterAll(() => mock.restore());

test('LLM receives selected horizon, timestamped rows and honest scheduling context', async () => {
  const fixture = exchange();
  await tradingAgent({ Coin: ['BTCUSD'], exchange: fixture.api, llmKey: 'fixture', model: 'fixture', name: 'DELTA', analysisTimeframe: '15m', reviewContext });
  expect(invocations).toBe(1); expect(prompt).not.toContain('{REVIEW_CONTEXT}'); expect(prompt).not.toContain('[object Object]');
  const context = JSON.parse(prompt.split('Review timing (null means unknown or not yet scheduled):\n')[1]!.split('\n\nMarket Analysis')[0]!);
  expect(context).toMatchObject({ selectedAnalysisTimeframe: '15m', reviewCadenceSeconds: 300, completedReviewCount: 7, nextScheduledReviewAt: null });
  expect(Number.isFinite(Date.parse(context.currentTime))).toBe(true);
  const analysis = JSON.parse(prompt.split('Market Analysis (timestamped completed candles; null indicator means unavailable):\n')[1]!.split('\nUse the selected')[0]!);
  expect(analysis[0].marketData.map((item: { timeframe: string }) => item.timeframe)).toEqual(['15m', '4h', '1d']);
  expect(analysis[0].marketData[0].candles.at(-1).indicators.rsi14).toBe(50);
  expect(analysis[0].marketData[0].candles[0].openedAt).toContain('T');
});

test('optional higher timeframe outages are labelled without blocking fresh primary analysis', async () => {
  const fixture = exchange(true);
  await tradingAgent({ Coin: ['BTCUSD'], exchange: fixture.api, llmKey: 'fixture', model: 'fixture', name: 'DELTA', analysisTimeframe: '15m' });
  expect(invocations).toBe(1); expect(prompt).toContain('"timeframe":"4h","unavailable"'); expect(prompt).toContain('"timeframe":"1d","unavailable"');
  expect(prompt).not.toContain('temporary public data failure');
});

test('stale primary data stops before model invocation and private broker reads', async () => {
  const fixture = exchange(false, true);
  await expect(tradingAgent({ Coin: ['BTCUSD'], exchange: fixture.api, llmKey: 'fixture', model: 'fixture', name: 'DELTA', analysisTimeframe: '15m' })).rejects.toMatchObject({ code: 'LLM_MARKET_DATA_STALE' });
  expect(invocations).toBe(0); expect(fixture.reads()).toBe(0);
});

test('prompt names actual passive and IOC policies and avoids continuous monitoring claims', () => {
  expect(TPROMPT).toContain('Binance native-stop entries use IOC LIMIT orders');
  expect(TPROMPT).toContain('may take liquidity'); expect(TPROMPT).toContain('can expire without filling');
  expect(TPROMPT).not.toContain('Monitor open positions continuously');
  expect(TPROMPT).toContain('run count and memory do not establish predictive skill');
});
