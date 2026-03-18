/**
 * pages/api/portfolio/prices.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches live CoinGecko prices for exactly the coins in the authenticated
 * user's portfolio — no fixed list, fully dynamic.
 *
 * GET /api/portfolio/prices
 *
 * Flow:
 *  1. Auth check — returns 401 if not signed in
 *  2. Load user's holdings from MongoDB → extract unique coinIds
 *  3. Batch-fetch all prices from CoinGecko in ONE request
 *  4. Return a price map: { [coinId]: { price, change24h, name, symbol, thumb } }
 *
 * Caching:
 *  • Server-side module cache with 90 s TTL (per-user keyed by userId)
 *  • CDN Cache-Control header for edge caching
 *  • Returns stale data + background refresh if within 5-min stale window
 *
 * Rate limits:
 *  CoinGecko free: 50 calls/min
 *  This endpoint fires 1 call per TTL window per user — trivially within limits.
 */

import { getServerSession } from "next-auth/next";
import { authOptions }      from "@/pages/api/auth/[...nextauth]";
import dbConnect            from "@/lib/mongodb";
import Holding              from "@/lib/models/Holding";

// ── Per-user server-side cache ────────────────────────────────────────────────
// Keyed by userId so each user gets fresh prices for their own coins.
if (!global.__portfolioPriceCache) global.__portfolioPriceCache = new Map();
const CACHE = global.__portfolioPriceCache;

const TTL_MS       = 90_000;        // 90 s fresh window
const MAX_STALE_MS = 5 * 60_000;    // 5 min stale-while-revalidate window

function getCacheEntry(userId) {
  return CACHE.get(userId) || { data: null, fetchedAt: null, inflight: null };
}

function setCacheEntry(userId, entry) {
  CACHE.set(userId, entry);
  // Evict stale entries for users who haven't visited in 10 min
  if (CACHE.size > 1000) {
    const now = Date.now();
    for (const [key, val] of CACHE.entries()) {
      if (now - (val.fetchedAt || 0) > 10 * 60_000) CACHE.delete(key);
    }
  }
}

// ── CoinGecko batch fetch ─────────────────────────────────────────────────────

/**
 * Fetches prices for an arbitrary list of CoinGecko coin IDs.
 * All IDs are batched into a SINGLE CoinGecko request.
 *
 * Returns:
 *   { [coinId]: { price, change24h, thumb, name } }
 *
 * CoinGecko /coins/markets gives us thumbnail image URLs alongside prices —
 * much richer than /simple/price. We use it here specifically so the portfolio
 * table can show real coin logos for any dynamically-added coin.
 */
async function fetchCoinPrices(coinIds) {
  if (!coinIds.length) return {};

  // /coins/markets returns richer data (logos, names) vs /simple/price
  // Up to ~200 IDs per request — well above any realistic portfolio size
  const ids = coinIds.join(",");
  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=usd` +
    `&ids=${encodeURIComponent(ids)}` +
    `&order=market_cap_desc` +
    `&per_page=250` +
    `&price_change_percentage=24h` +
    `&precision=2`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko markets ${res.status}`);

  const data = await res.json();

  // Build a map keyed by CoinGecko ID
  const map = {};
  (data || []).forEach((coin) => {
    map[coin.id] = {
      price:     coin.current_price     ?? 0,
      change24h: coin.price_change_percentage_24h ?? 0,
      name:      coin.name              || "",
      symbol:    coin.symbol?.toUpperCase() || "",
      thumb:     coin.image             || "",   // full-res logo URL
      marketCap: coin.market_cap        ?? 0,
      rank:      coin.market_cap_rank   ?? null,
    };
  });

  return map;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth guard
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const userId = session.user.id;
  const entry  = getCacheEntry(userId);
  const age    = entry.fetchedAt ? Date.now() - entry.fetchedAt : Infinity;
  const fresh  = age < TTL_MS;
  const usable = age < MAX_STALE_MS;

  // ── A: Cache fresh → return immediately ──────────────────────────────────
  if (fresh && entry.data) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "s-maxage=90, stale-while-revalidate=300");
    return res.status(200).json({ ...entry.data, cached: true });
  }

  // ── B: Another fetch already in flight → coalesce ─────────────────────────
  if (entry.inflight) {
    if (usable && entry.data) {
      // Return stale immediately while the other request refreshes
      res.setHeader("X-Cache", "STALE");
      return res.status(200).json({ ...entry.data, stale: true });
    }
    // No data yet — wait for the in-flight promise
    try {
      const fresh = await entry.inflight;
      return res.status(200).json({ ...fresh, cached: false });
    } catch {
      return res.status(503).json({ prices: {}, coinIds: [], error: "Fetch failed" });
    }
  }

  // ── C: First / stale request — launch fresh fetch ─────────────────────────
  await dbConnect();

  const fetchPromise = (async () => {
    // 1. Get all unique coin IDs from this user's holdings
    const lots = await Holding.find({ userId }).select("coinId").lean();
    const coinIds = [...new Set(lots.map((l) => l.coinId))];

    if (!coinIds.length) {
      return { prices: {}, coinIds: [], timestamp: new Date().toISOString() };
    }

    // 2. Fetch prices for those exact coins
    const prices = await fetchCoinPrices(coinIds);

    return {
      prices,
      coinIds,
      timestamp: new Date().toISOString(),
    };
  })()
    .then((data) => {
      setCacheEntry(userId, { data, fetchedAt: Date.now(), inflight: null });
      return data;
    })
    .catch((err) => {
      // Clear inflight on error so next request retries
      const existing = getCacheEntry(userId);
      setCacheEntry(userId, { ...existing, inflight: null });
      throw err;
    });

  // Register inflight before await so concurrent requests coalesce onto it
  setCacheEntry(userId, { ...entry, inflight: fetchPromise });

  try {
    const data = await fetchPromise;
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "s-maxage=90, stale-while-revalidate=300");
    return res.status(200).json({ ...data, cached: false });
  } catch (err) {
    console.error("[portfolio/prices]", err.message);
    // Serve stale if available
    if (usable && entry.data) {
      return res.status(200).json({ ...entry.data, stale: true, fetchError: err.message });
    }
    return res.status(503).json({ prices: {}, coinIds: [], error: err.message });
  }
}
