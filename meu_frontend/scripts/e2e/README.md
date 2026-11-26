# Dashboard first-paint browser E2E

Issue #4 added a synchronous `localStorage` snapshot so the exchange dashboard can
paint before the broker answers. The unit tests cover the snapshot store and the
poll interval, but they cannot show the real page painting from a snapshot while a
broker request is still in flight. This harness does that in Chromium.

There is no Playwright/Puppeteer dependency in the checkout. `cdp.ts` drives the
already-installed Playwright Chromium build over the DevTools Protocol with Bun's
built-in WebSocket.

## What it proves

| Scenario | Assertions |
|---|---|
| `snapshot-first-paint` | the snapshot value (`$4,242.42`) paints while `exData.getById` is held for 3 s; paint is compared against the request's own `responseEnd`; the loading skeleton never appears; FCP is recorded |
| `failed-refresh-and-backoff` | a failed refresh shows `Showing last known values from <timestamp>.` and no skeleton; the client retries twice; after the failure settles there is **no** 5 s polling for the next 10 s |
| `hidden-tab` | with the tab hidden, polling stops entirely (0 requests in 12 s, where a visible tab would make 2); unhiding resumes it |

The harness fails the process (exit 1) on any failed assertion and always writes
the measurements to an artifact, so the numbers are recorded instead of being
hard-coded as a threshold.

No live broker call is made: every `exData.getById` request is paused with the
CDP `Fetch` domain and fulfilled from the harness, so the app's server never
reaches a venue.

## Prerequisites

1. **MongoDB replica set on `27018`** (transactions are required by the app).
   The Fedora/RHEL tarball works:

   ```sh
   mkdir -p .tmp/mongodb && cd .tmp/mongodb
   curl -sSL -o mongodb.tgz https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-rhel90-7.0.14.tgz
   tar xzf mongodb.tgz --strip-components=1
   .tmp/mongodb/bin/mongod --dbpath .tmp/mongo-data --port 27018 --replSet rs0 --bind_ip 127.0.0.1
   ```

   then `bun meu_frontend/scripts/e2e/init-replset.ts` (run from `meu_frontend`).

2. **The app on `http://localhost:3000`**, pointed at that database with
   environment overrides — never edit `.env`. Use `localhost`, not `127.0.0.1`:
   the tRPC client hard-codes `http://localhost:3000` for server-side rendering
   and Next dev blocks cross-origin `/_next` resources.

   ```sh
   cd meu_frontend
   set -a; . ./.env; set +a
   export DATABASE_URL='mongodb://127.0.0.1:27018/meu?replicaSet=rs0'
   export BETTER_AUTH_URL='http://localhost:3000'
   export NEXT_PUBLIC_APP_URL='http://localhost:3000'
   export BUN_TMPDIR="$(cd .. && pwd)/.tmp"
   bun run dev --port 3000        # or: bun run build && bun run start --port 3000
   ```

3. **Chromium.** `E2E_CHROME` may point at a binary; otherwise the highest
   `~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome` is used. The
   harness passes `--no-sandbox`.

## Run

```sh
cd meu_frontend
export BUN_TMPDIR="$(cd .. && pwd)/.tmp"
export DATABASE_URL='mongodb://127.0.0.1:27018/meu?replicaSet=rs0'
export E2E_BASE_URL='http://localhost:3000'
bun run e2e:dashboard
```

`seed.ts` signs a local user up through better-auth (falling back to sign-in on a
second run) and creates one `DELTA` exchange row with dummy credentials. Nothing
is read from or written to a real venue.

The artifact is written to `.tmp/e2e/dashboard-first-paint.json` (override with
`E2E_ARTIFACT_DIR`). `.tmp/` is git-ignored.

## Measured results

Recorded 26 Nov 2026 on the development machine, Chromium 1248 headless, one
exchange row and a 2-position snapshot.

| Scenario | Metric | Dev server | Production build |
|---|---|---:|---:|
| first paint | FCP | 508 ms | **132 ms** |
| first paint | snapshot text visible | 1,343 ms | **336 ms** |
| first paint | broker reply (`responseEnd`) | 4,425 ms | 3,342 ms |
| first paint | snapshot visible before the reply | 3,082 ms | **3,006 ms** |
| failed refresh | retry gaps | 1,347 / 2,312 ms | 1,255 / 2,255 ms |
| failed refresh | requests in the 10 s after settle | 0 | 0 |
| hidden tab | requests in 12 s hidden | 0 | 0 |
| hidden tab | polling resumed after unhide | 6,201 ms | 5,068 ms |

The production build is the number to quote: FCP 132 ms and the snapshot text on
screen at ~336 ms, more than 3 s before the broker reply. The 336 ms is dominated
by client hydration, not by the snapshot read; the storage read itself was
measured separately at 2.2 ms for 5,000 positions.

## Notes and limits

- **Hidden tab** is simulated by overriding `document.visibilityState`/`hidden`
  and firing `visibilitychange`, which is the same contract the browser exposes
  and the same event the hook listens for. Headless Chromium keeps background
  tabs `visible`, so switching targets would not exercise the branch.
- **Failed refresh** aborts with a tRPC error, which is the hard-failure path.
  The soft path (HTTP 200 with `positionsError`/`tradesError`/`balanceError`)
  renders the `Last successful snapshot:` variant of the same notice. On a hard
  error the panels deliberately mask values with `—`; the notice and timestamp
  are what the scenario asserts.
- Numbers come from one run on an idle machine; the harness asserts ordering
  (paint before reply), not absolute latency, so it does not flake on slow CI.
