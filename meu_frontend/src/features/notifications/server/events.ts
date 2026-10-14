import { EventEmitter } from "events";
const state = globalThis as typeof globalThis & { notificationEmitter?: EventEmitter; notificationVersion?: number };
function emitter() {
  if (!state.notificationEmitter) state.notificationEmitter = new EventEmitter().setMaxListeners(0);
  return state.notificationEmitter;
}
export function emitNotificationChange(userId?: string) {
  state.notificationVersion = (state.notificationVersion ?? 0) + 1;
  emitter().emit("notification", userId);
}
export function getNotificationVersion() { return state.notificationVersion ?? 0; }
export async function* notificationIterator(signal?: AbortSignal, userId?: string): AsyncGenerator<void> {
  if (signal?.aborted) return;
  let dirty = true;
  let wake: (() => void) | undefined;
  const onChange = (changedUser?: string) => {
    if (changedUser && userId && changedUser !== userId) return;
    dirty = true;
    wake?.();
  };
  const onAbort = () => { wake?.(); };
  emitter().on("notification", onChange);
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    while (!signal?.aborted) {
      if (dirty) { dirty = false; yield; }
      else await new Promise<void>(resolve => { wake = resolve; });
    }
  } finally {
    emitter().off("notification", onChange);
    signal?.removeEventListener("abort", onAbort);
  }
}
