

// ── Simple per-query in-memory cache (survives across warm requests) ──────────
if (!global.__coinSearchCache) global.__coinSearchCache = new Map();
const SEARCH_CACHE    = global.__coinSearchCache;
const SEARCH_CACHE_MS = 30_000; // 30 seconds per query string

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const q = (req.query.q || "").trim().toLowerCase();

  if (!q || q.length < 1) {
    return res.status(200).json({ coins: [] });
  }

  // ── Cache hit ─────────────────────────────────────────────────────────────
  const cached = SEARCH_CACHE.get(q);
  if (cached && Date.now() - cached.at < SEARCH_CACHE_MS) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json({ coins: cached.coins });
  }

  // ── Fetch from CoinGecko ──────────────────────────────────────────────────
  try {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`;
    const gecko = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!gecko.ok) {
      throw new Error(`CoinGecko search ${gecko.status}`);
    }

    const data = await gecko.json();

    // Shape and limit results
    const coins = (data.coins || [])
      .slice(0, 12)
      .map((c) => ({
        id:            c.id,
        symbol:        c.symbol?.toUpperCase() || "",
        name:          c.name || "",
        thumb:         c.thumb || "",      // 30×30 px thumbnail URL
        marketCapRank: c.market_cap_rank,  // null if unranked
      }));

    // Cache it
    SEARCH_CACHE.set(q, { coins, at: Date.now() });

    // Evict old entries to prevent unbounded growth
    if (SEARCH_CACHE.size > 500) {
      const oldestKey = SEARCH_CACHE.keys().next().value;
      SEARCH_CACHE.delete(oldestKey);
    }

    res.setHeader("Cache-Control", "s-maxage=30");
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json({ coins });
  } catch (err) {
    console.error("[coins/search]", err.message);
    return res.status(502).json({
      coins: [],
      error: `Search failed: ${err.message}`,
    });
  }
}
