/**
 * Minimal Chrome DevTools Protocol client for the dashboard E2E.
 *
 * The checkout has no Playwright/Puppeteer dependency, so this drives the
 * already-installed Playwright Chromium build over CDP using Bun's built-in
 * WebSocket. It only covers what the harness needs: launch, one page, command
 * round-trips and event subscription.
 */
import { mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type CdpEvent = Record<string, unknown>;

export class CdpClient {
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private readonly listeners = new Map<string, Set<(params: CdpEvent) => void>>();

  private constructor(private readonly ws: WebSocket) {
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number;
        method?: string;
        params?: CdpEvent;
        result?: unknown;
        error?: { message?: string };
      };
      if (message.id !== undefined) {
        const waiter = this.pending.get(message.id);
        if (!waiter) return;
        this.pending.delete(message.id);
        if (message.error) waiter.reject(new Error(message.error.message ?? "CDP error"));
        else waiter.resolve(message.result);
        return;
      }
      if (!message.method) return;
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params ?? {});
    });
  }

  static async connect(webSocketDebuggerUrl: string): Promise<CdpClient> {
    const ws = new WebSocket(webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener("open", () => resolve(), { once: true });
      ws.addEventListener("error", () => reject(new Error(`cannot connect to ${webSocketDebuggerUrl}`)), { once: true });
    });
    return new CdpClient(ws);
  }

  send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method: string, listener: (params: CdpEvent) => void): () => void {
    const set = this.listeners.get(method) ?? new Set();
    set.add(listener);
    this.listeners.set(method, set);
    return () => set.delete(listener);
  }

  close() {
    this.ws.close();
  }
}

export type ChromeHandle = {
  port: number;
  process: ReturnType<typeof Bun.spawn>;
  close: () => Promise<void>;
};

function chromeBinary(): string {
  if (process.env.E2E_CHROME) return process.env.E2E_CHROME;
  const root = join(homedir(), ".cache/ms-playwright");
  const builds = readdirSync(root)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const build of builds) {
    const candidate = join(root, build, "chrome-linux64/chrome");
    if (Bun.file(candidate).size) return candidate;
  }
  throw new Error(`no Chromium build found under ${root}; set E2E_CHROME`);
}

async function waitForJson<T>(url: string, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return (await response.json()) as T;
    } catch (error) {
      lastError = error;
    }
    await Bun.sleep(100);
  }
  throw new Error(`timed out waiting for ${url}: ${String(lastError)}`);
}

/** Launch headless Chromium and wait until its DevTools endpoint answers. */
export async function launchChrome(options: { profileDir: string; port?: number }): Promise<ChromeHandle> {
  const port = options.port ?? 9222;
  mkdirSync(options.profileDir, { recursive: true });
  const child = Bun.spawn(
    [
      chromeBinary(),
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      `--user-data-dir=${options.profileDir}`,
      `--remote-debugging-port=${port}`,
      "about:blank",
    ],
    { stdout: "ignore", stderr: "ignore" },
  );
  await waitForJson(`http://127.0.0.1:${port}/json/version`, 20_000);
  return {
    port,
    process: child,
    close: async () => {
      child.kill();
      await child.exited;
    },
  };
}

export type PageHandle = {
  targetId: string;
  client: CdpClient;
  close: () => Promise<void>;
};

/** Open a new page target and connect to it. */
export async function openPage(port: number): Promise<PageHandle> {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) throw new Error(`cannot create page: ${response.status} ${await response.text()}`);
  const target = (await response.json()) as { id: string; webSocketDebuggerUrl: string };
  const client = await CdpClient.connect(target.webSocketDebuggerUrl);
  return {
    targetId: target.id,
    client,
    close: async () => {
      client.close();
      await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => undefined);
    },
  };
}

export function base64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}
