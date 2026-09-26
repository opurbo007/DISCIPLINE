/**
 * pages/api/fear-greed.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET /api/fear-greed → Crypto Fear & Greed Index (alternative.me, no key)
 *
 *  FREE-TIER SAFETY (do not lower these without a paid plan):
 *  1. Server module cache — ALL users share ONE upstream call per TTL window
 *  2. Request coalescing — concurrent misses await one in-flight promise
 *  3. Long TTL — index updates ~once/day, so 1h TTL = ~24 upstream calls/day
 *  4. Stale-while-revalidate — serve last known data instead of erroring
 *  5. CDN Cache-Control — edge caches for 1h too
 *  6. Client must NOT poll (refreshInterval: 0, manual refresh only)
 */

if (!global.__fearGreedCache) {
  global.__fearGreedCache = { data: null, fetchedAt: null, inflight: null };
}
const CACHE = global.__fearGreedCache;

const TTL_MS = 60 * 60 * 1000; // 1 hour — index changes once/day
const MAX_STALE_MS = 24 * 60 * 60 * 1000; // serve stale up to 24h on upstream failure

async function fetchFresh() {
  const res = await fetch("https://api.alternative.me/fng/?limit=7&format=json", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`FearGreed ${res.status}`);
  const json = await res.json();
  const list = (json?.data || []).map((d) => ({
    value: Number(d.value),
    classification: d.value_classification || "",
    timestamp: Number(d.timestamp) * 1000,
  })).filter((d) => Number.isFinite(d.value));
  if (!list.length) throw new Error("Empty Fear & Greed response");
  return {
    current: list[0],
    previous: list[1] || null,
    week: list,
    timestamp: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const age = CACHE.fetchedAt ? Date.now() - CACHE.fetchedAt : Infinity;
  const fresh = age < TTL_MS;
  const usable = age < MAX_STALE_MS;

  // A: fresh cache
  if (fresh && CACHE.data) {
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json({ ...CACHE.data, cached: true });
  }

  // B: coalesce onto in-flight
  if (CACHE.inflight) {
    if (usable && CACHE.data) {
      res.setHeader("X-Cache", "STALE");
      return res.status(200).json({ ...CACHE.data, cached: true, stale: true });
    }
    try {
      const data = await CACHE.inflight;
      return res.status(200).json({ ...data, cached: false });
    } catch {
      return res.status(503).json({ error: "Fear & Greed unavailable" });
    }
  }

  // C: launch fetch
  const p = fetchFresh()
    .then((data) => {
      CACHE.data = data;
      CACHE.fetchedAt = Date.now();
      CACHE.inflight = null;
      return data;
    })
    .catch((err) => {
      CACHE.inflight = null;
      throw err;
    });
  CACHE.inflight = p;

  try {
    const data = await p;
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json({ ...data, cached: false });
  } catch (err) {
    console.error("[fear-greed]", err.message);
    if (usable && CACHE.data) {
      return res.status(200).json({ ...CACHE.data, cached: true, stale: true });
    }
    return res.status(503).json({ error: "Fear & Greed unavailable" });
  }
}
