/**
 * lib/priceCache.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side in-memory price cache for the /api/prices route.
 *
 * WHY THIS EXISTS
 * ───────────────
 * Without caching, every browser polling /api/prices every 60 s fires:
 *   1 CoinGecko call + 6 Finnhub quote calls + 1 Finnhub forex call = 8 calls
 *
 * With 5 simultaneous users that's 40 external API calls/minute — right at
 * Finnhub's free-tier ceiling of 60/min, with no headroom for spikes.
 *
 * This cache means ALL users share ONE set of upstream calls per TTL period,
 * no matter how many people are on the dashboard at once.
 *
 * HOW IT WORKS
 * ────────────
 * 1. MODULE-LEVEL GLOBAL  — `global.__priceCache` survives across requests on
 *    the same warm serverless instance. Node modules are cached after first
 *    import, so the cache object lives for the lifetime of the process.
 *
 * 2. TTL TIERS  — Different assets have different freshness needs:
 *      • Crypto  (24/7 markets): CRYPTO_TTL_MS  = 90 s
 *      • Stocks  (market hours): STOCK_TTL_MS   = 120 s when open, 10 min when closed
 *      • Forex / DXY            FOREX_TTL_MS    = 5 min (slow-moving)
 *    A single FULL_TTL_MS governs the whole combined payload (90 s).
 *
 * 3. REQUEST COALESCING  — If two requests arrive simultaneously and the cache
 *    is stale/empty, only ONE upstream fetch is launched. The second request
 *    awaits the same in-flight promise instead of firing duplicate API calls.
 *    Without this, a cache miss under load would cause a "thundering herd."
 *
 * 4. STALE-WHILE-REVALIDATE  — If the cache is stale but a fetch is already
 *    in progress, callers immediately receive the last known data (even if
 *    slightly old) so the UI never blocks.
 *
 * USAGE
 * ─────
 *   import { getCached, setCached, isStale, lockRefresh, unlockRefresh }
 *     from '@/lib/priceCache';
 */

// ── TTL constants (milliseconds) ──────────────────────────────────────────────

/** How long the full price payload is considered fresh. */
export const FULL_TTL_MS = 90_000; // 90 seconds

/** How stale data can get before we MUST block and wait for a refresh. */
export const MAX_STALE_MS = 5 * 60_000; // 5 minutes — serve stale rather than error

// ── Global cache object ───────────────────────────────────────────────────────

/**
 * We attach the cache to `global` so it persists across hot-reloads in dev
 * and across requests within the same serverless function instance in prod.
 *
 * Shape:
 * {
 *   data:        PricePayload | null,   — last successful fetch result
 *   fetchedAt:   number | null,         — Date.now() when data was last fetched
 *   inflightPromise: Promise | null,    — coalescing: in-progress fetch promise
 * }
 */
if (!global.__priceCache) {
  global.__priceCache = {
    data:            null,
    fetchedAt:       null,
    inflightPromise: null,
  };
}

const cache = global.__priceCache;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the cached price payload, or null if nothing has been fetched yet.
 */
export function getCached() {
  return cache.data;
}

/**
 * Returns the epoch ms when data was last fetched, or null.
 */
export function getCachedAt() {
  return cache.fetchedAt;
}

/**
 * Stores a fresh payload in the cache with the current timestamp.
 * @param {object} payload  — { markets, timestamp, errors }
 */
export function setCached(payload) {
  cache.data      = payload;
  cache.fetchedAt = Date.now();
}

/**
 * Returns true if the cache is empty OR older than FULL_TTL_MS.
 */
export function isStale() {
  if (!cache.data || !cache.fetchedAt) return true;
  return Date.now() - cache.fetchedAt > FULL_TTL_MS;
}

/**
 * Returns true if cached data exists but is within the MAX_STALE_MS window.
 * When true, callers can serve the stale data while a background refresh runs.
 */
export function isUsableStale() {
  if (!cache.data || !cache.fetchedAt) return false;
  const age = Date.now() - cache.fetchedAt;
  return age > FULL_TTL_MS && age <= MAX_STALE_MS;
}

/**
 * Returns how old the cached data is in seconds (for display in responses).
 */
export function cacheAgeSeconds() {
  if (!cache.fetchedAt) return null;
  return Math.round((Date.now() - cache.fetchedAt) / 1000);
}

// ── Request coalescing ────────────────────────────────────────────────────────

/**
 * Returns the currently in-flight fetch promise, or null if no fetch is running.
 * Multiple concurrent requests can await the same promise.
 */
export function getInflight() {
  return cache.inflightPromise;
}

/**
 * Registers an in-flight fetch promise.
 * All subsequent requests that arrive while this is set will await it.
 * @param {Promise} promise
 */
export function setInflight(promise) {
  cache.inflightPromise = promise;
}

/**
 * Clears the in-flight promise after a fetch completes or fails.
 */
export function clearInflight() {
  cache.inflightPromise = null;
}

// ── Market-hours helpers ──────────────────────────────────────────────────────

/**
 * Returns true if US stock markets (NYSE/NASDAQ) are currently open.
 *
 * Rules:
 *  • Mon–Fri only
 *  • Regular session: 09:30 – 16:00 ET
 *  • Does NOT account for holidays (acceptable simplification for a free-tier app)
 *
 * When markets are closed we can use a much longer TTL for stock data
 * since prices won't change until the next open.
 */
export function isUSMarketOpen() {
  const now = new Date();

  // Convert to US/Eastern time
  const etStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const et    = new Date(etStr);

  const day     = et.getDay();   // 0=Sun, 6=Sat
  const hours   = et.getHours();
  const minutes = et.getMinutes();

  if (day === 0 || day === 6) return false; // Weekend
  if (hours < 9)  return false;
  if (hours === 9  && minutes < 30) return false; // Before 09:30
  if (hours >= 16) return false;                  // After 16:00

  return true;
}

/**
 * Effective TTL for the full payload based on market hours.
 *
 * When markets are closed, stock prices won't change — we can cache
 * much longer and save Finnhub quota entirely.
 *
 * Returns TTL in milliseconds.
 */
export function effectiveTTL() {
  return isUSMarketOpen()
    ? FULL_TTL_MS         // 90 s during market hours
    : 10 * 60_000;        // 10 min when markets are closed
}
