import { describe, expect, test } from 'bun:test';
import {
  classifyExchangeFailure,
  nextPollInterval,
  readExchangeSnapshot,
  writeExchangeSnapshot,
  type SnapshotStorage,
} from '../src/features/exchange/lib/exchange-snapshot';

function memoryStorage(): SnapshotStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('exchange dashboard snapshot', () => {
  test('round-trips a last-known-good snapshot per exchange', () => {
    const storage = memoryStorage();
    const snapshot = { data: { balance: { USD: 10 }, positions: [], trades: [] }, fetchedAt: 1234, source: 'broker' as const };
    writeExchangeSnapshot(storage, 'exchange-1', snapshot);
    expect(readExchangeSnapshot(storage, 'exchange-1')).toEqual(snapshot);
    expect(readExchangeSnapshot(storage, 'exchange-2')).toBeNull();
  });

  test('ignores malformed or stale-format snapshots', () => {
    const storage = memoryStorage();
    storage.setItem('meu:exchange-snapshot:exchange-1', '{not json');
    expect(readExchangeSnapshot(storage, 'exchange-1')).toBeNull();
    storage.setItem('meu:exchange-snapshot:exchange-1', JSON.stringify({ version: 99, data: {} }));
    expect(readExchangeSnapshot(storage, 'exchange-1')).toBeNull();
  });

  test('polls every five seconds normally, backs off on failure and stops when hidden', () => {
    expect(nextPollInterval({ hidden: false, failed: false })).toBe(5_000);
    expect(nextPollInterval({ hidden: false, failed: true })).toBe(60_000);
    expect(nextPollInterval({ hidden: true, failed: false })).toBe(false);
    expect(nextPollInterval({ hidden: true, failed: true })).toBe(false);
  });

  test('names authentication, unreachable and partial failures separately', () => {
    const auth = { positionsError: 'Invalid API-key', tradesError: 'AuthenticationError 401', balanceError: 'Unauthorized' };
    expect(classifyExchangeFailure(auth)).toBe('auth');
    const network = { positionsError: 'fetch failed', tradesError: 'ETIMEDOUT', balanceError: 'ENOTFOUND' };
    expect(classifyExchangeFailure(network)).toBe('unreachable');
    expect(classifyExchangeFailure({ positionsError: 'boom', tradesError: null, balanceError: null })).toBe('partial');
    expect(classifyExchangeFailure({})).toBe('none');
    expect(classifyExchangeFailure({ errorMessage: 'Invalid API-key' })).toBe('auth');
    expect(classifyExchangeFailure({ errorMessage: 'Exchange API credentials are missing or invalid' })).toBe('auth');
    expect(classifyExchangeFailure({ errorMessage: 'fetch failed' })).toBe('unreachable');
  });
});
