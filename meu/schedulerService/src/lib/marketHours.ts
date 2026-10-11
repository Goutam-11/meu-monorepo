/**
 * Indian market (NSE/BSE) hours utilities.
 *
 * Equity market session: 09:15 – 15:30 IST, Monday–Friday,
 * excluding NSE trading holidays.
 *
 * Everything is computed in Asia/Kolkata regardless of the host TZ.
 */

const IST = "Asia/Kolkata";

export const MARKET_OPEN_MIN = 9 * 60 + 15; // 09:15 IST
export const MARKET_CLOSE_MIN = 15 * 60 + 30; // 15:30 IST

/**
 * Verified NSE trading holidays through 2026; later years fail closed.
 * 2026 source: https://nsearchives.nseindia.com/content/circulars/CMTR71775.pdf
 * Override/extend via NSE_HOLIDAYS env var as comma-separated ISO dates
 * (e.g. "2026-01-26,2026-03-04").
 */
const DEFAULT_HOLIDAYS = new Set([
  // 2025
  "2025-02-26", // Mahashivratri
  "2025-03-14", // Holi
  "2025-03-31", // Id-Ul-Fitr
  "2025-04-10", // Shri Mahavir Jayanti
  "2025-04-14", // Dr. B. R. Ambedkar Jayanti
  "2025-04-18", // Good Friday
  "2025-05-01", // Maharashtra Day
  "2025-08-15", // Independence Day
  "2025-08-27", // Ganesh Chaturthi
  "2025-10-02", // Gandhi Jayanti / Dussehra
  "2025-10-21", // Diwali Laxmi Pujan (morning session, treated closed)
  "2025-10-22", // Diwali Balipratipada
  "2025-11-05", // Gurunanak Jayanti
  "2025-12-25", // Christmas
  // 2026
  "2026-01-26", // Republic Day
  "2026-03-03", // Holi
  "2026-03-21", // Id-Ul-Fitr
  "2026-03-26", // Shri Ram Navami
  "2026-03-31", // Shri Mahavir Jayanti
  "2026-04-03", // Good Friday
  "2026-04-14", // Dr. B. R. Ambedkar Jayanti
  "2026-05-01", // Maharashtra Day
  "2026-05-28", // Bakri Id
  "2026-06-26", // Muharram
  "2026-08-15", // Independence Day
  "2026-09-14", // Ganesh Chaturthi
  "2026-10-02", // Gandhi Jayanti
  "2026-10-20", // Dussehra
  "2026-11-08", // Muhurat session is intentionally unsupported
  "2026-11-10", // Diwali Balipratipada
  "2026-11-24", // Gurunanak Jayanti
  "2026-12-25", // Christmas
]);

function envHolidays(): Set<string> {
  const extra = (process.env.NSE_HOLIDAYS ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_HOLIDAYS, ...extra]);
}

const holidays = envHolidays();

/** "YYYY-MM-DD" for the date in IST. */
function istDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Minutes since midnight + weekday (0=Sun..6=Sat) in IST. */
function istClock(d: Date): { minutes: number; weekday: number; dateKey: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    minutes: hour * 60 + minute,
    weekday: weekdayMap[get("weekday")] ?? 0,
    dateKey: istDateKey(d),
  };
}

/** True when the NSE equity session is open at the given instant. */
export function isIndianMarketOpen(now: Date = new Date()): boolean {
  const { minutes, weekday, dateKey } = istClock(now);
  if (!verifiedCalendar(dateKey)) return false;
  if (weekday === 0 || weekday === 6) return false;
  if (holidays.has(dateKey)) return false;
  return minutes >= MARKET_OPEN_MIN && minutes < MARKET_CLOSE_MIN;
}

function verifiedCalendar(dateKey: string): boolean {
  const year = Number(dateKey.slice(0, 4));
  return year === 2025 || year === 2026;
}

/**
 * Next instant at/after `after` when the market is open (aligned to
 * session open 09:15 IST). Returns null if already open.
 */
export function nextMarketOpen(after: Date = new Date()): Date | null {
  if (isIndianMarketOpen(after)) return null;

  // Start from the next IST midnight-ish and scan forward day by day.
  const cursor = new Date(after.getTime() + 60_000);
  for (let i = 0; i < 15; i++) {
    const { minutes, weekday, dateKey } = istClock(cursor);
    if (!verifiedCalendar(dateKey)) return null;
    if (weekday !== 0 && weekday !== 6 && !holidays.has(dateKey)) {
      if (minutes < MARKET_OPEN_MIN) {
        // Session opens later today (IST) — build the exact instant.
        const dateStr = dateKey; // YYYY-MM-DD
        return new Date(`${dateStr}T09:15:00+05:30`);
      }
      if (minutes >= MARKET_OPEN_MIN && minutes < MARKET_CLOSE_MIN) {
        return cursor; // shouldn't happen (guarded above) but be safe
      }
    }
    // Jump to next day 00:05 IST
    const nextIstMidnight = new Date(`${istDateKey(cursor)}T00:05:00+05:30`);
    cursor.setTime(nextIstMidnight.getTime() + 24 * 3600 * 1000);
  }
  return null;
}
