# Zerodha setup and daily login

Create a Kite Connect app at https://developers.kite.trade/apps/create and configure its redirect URL to the frontend exchange dashboard URL. Create a MEU exchange selecting ZERODHA, enter its API key/secret, and disable sandbox (Kite sandbox is unsupported).

Every trading day:

1. Open the exchange dashboard and its server-generated Kite login URL.
2. Complete broker login. Copy the returned `request_token` from the redirect URL into the dashboard token field.
3. The authenticated `exchange.kiteAuth` procedure verifies exchange ownership, exchanges the token, and stores the encrypted access token and issue date. Rejected tokens display a failure.

The unauthenticated scheduler callback on port 3040 has been removed. Existing Kite apps using that redirect must update their registered redirect URL. The frontend renders Zerodha positions, completed orders and funds through its Kite helper; workers use Kite Connect directly.

Agents use NSE symbols such as INFY/TCS, an INR capital allocation, a valid LLM credential/model, and LLM_TRADING. Trades are gated to Indian market hours (09:15–15:30 IST weekdays with configured holidays). A closed-market run schedules one next-session job. Missing/expired tokens skip the run and notify the user.

For risk accounting, new entries are restricted to NSE MIS LIMIT long orders on a dedicated MIS account. Current positions, holdings, pending orders and funds must all load successfully. The guard checks allowed symbols, full-notional per-trade risk, allocation, a conservative daily-loss budget including open exposure, position count and available cash. Unknown/carry exposure, unbounded pending orders and new short exposure are rejected. Bounded reductions of existing positions are allowed; these limits do not implement ALGO/HYBRID or broker-specific protective-order strategies.

`NSE_HOLIDAYS` accepts extra comma-separated YYYY-MM-DD dates. Maintain holiday data as exchange calendars change. The cutoff/holiday list was not certified against a live broker during this patch.
