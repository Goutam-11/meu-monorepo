export type SnapshotStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type ExchangeSnapshot<T> = { data: T; fetchedAt: number; source: 'broker' };

export function browserSnapshotStorage(): SnapshotStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const VERSION = 1;
const SNAPSHOT_EVENT = 'meu:exchange-snapshot';
export const snapshotKey = (exchangeId: string) => `meu:exchange-snapshot:${exchangeId}`;

export function parseExchangeSnapshot<T>(raw: string | null): ExchangeSnapshot<T> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { version?: unknown; data?: unknown; fetchedAt?: unknown; source?: unknown };
    if (parsed.version !== VERSION || !parsed.data || typeof parsed.data !== 'object' || !Number.isFinite(parsed.fetchedAt) || parsed.source !== 'broker') return null;
    return { data: parsed.data as T, fetchedAt: parsed.fetchedAt as number, source: 'broker' };
  } catch {
    return null;
  }
}

export function readExchangeSnapshot<T>(storage: SnapshotStorage, exchangeId: string): ExchangeSnapshot<T> | null {
  try {
    return parseExchangeSnapshot<T>(storage.getItem(snapshotKey(exchangeId)));
  } catch {
    return null;
  }
}

export function writeExchangeSnapshot<T>(storage: SnapshotStorage, exchangeId: string, snapshot: ExchangeSnapshot<T>) {
  try {
    storage.setItem(snapshotKey(exchangeId), JSON.stringify({ version: VERSION, ...snapshot }));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(SNAPSHOT_EVENT));
  } catch {
    // A full or blocked storage must not break the live dashboard.
  }
}

export function subscribeExchangeSnapshots(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', onChange);
  window.addEventListener(SNAPSHOT_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(SNAPSHOT_EVENT, onChange);
  };
}

export function nextPollInterval(input: { hidden: boolean; failed: boolean }): number | false {
  if (input.hidden) return false;
  return input.failed ? 60_000 : 5_000;
}

export function classifyExchangeFailure(input: {
  errorMessage?: string | null;
  positionsError?: string | null;
  tradesError?: string | null;
  balanceError?: string | null;
}): 'none' | 'auth' | 'unreachable' | 'partial' {
  const errors = [input.errorMessage, input.positionsError, input.tradesError, input.balanceError].filter((message): message is string => typeof message === 'string' && message.length > 0);
  if (!errors.length) return 'none';
  const joined = errors.join(' ').toLowerCase();
  if (/invalid api[-_ ]?key|authentication|unauthori[sz]ed|invalid signature|permission denied|credential|\b401\b|\b403\b/.test(joined)) return 'auth';
  if (/fetch failed|network|timed? ?out|enotfound|econnrefused|econnreset|socket|\b50[234]\b/.test(joined) && (input.errorMessage || errors.length === 3)) return 'unreachable';
  return 'partial';
}
