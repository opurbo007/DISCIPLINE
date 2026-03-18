/**
 * pages/api/prices.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Aggregates live market prices from CoinGecko + Finnhub with a full
 * server-side caching + request-coalescing strategy to stay well within
 * free-tier rate limits regardless of how many users are online.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  RATE LIMIT BUDGET (free tiers)                                         │
 * │                                                                         │
 * │  CoinGecko  : 50 calls/min  → 1 call per refresh  → 0.67 calls/min    │
 * │  Finnhub    : 60 calls/min  → 7 calls per refresh  → 4.7 calls/min    │
 * │                                                                         │
 * │  With server cache (90 s TTL): ~7 Finnhub calls per 90 s = 4.7/min    │
 * │  WITHOUT cache: 7 × users × (60s poll) = hits limit fast               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * CACHING LAYERS
 * ──────────────
 *  1. Server module cache  — all users share ONE upstream fetch per TTL window
 *  2. Request coalescing   — concurrent requests await one in-flight promise
 *  3. Market-hours TTL     — 90 s when open, 10 min when markets are closed
 *  4. Stale-while-revalidate — serve last known data during background refresh
 *  5. CDN Cache-Control    — Vercel edge caches responses for 90 s as well
 */

import {
  getCached,
  getCachedAt,
  setCached,
  isStale,
  isUsableStale,
  cacheAgeSeconds,
  getInflight,
  setInflight,
  clearInflight,
  isUSMarketOpen,
  effectiveTTL,
  FULL_TTL_MS,
} from "@/lib/priceCache";

// ── API config ────────────────────────────────────────────────────────────────

const FINNHUB_KEY = process.env.FINNHUB_KEY || "";

// ── CoinGecko — 1 call for all crypto ────────────────────────────────────────

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price" +
  "?ids=bitcoin,ethereum,solana,chainlink,dogecoin,ripple,sui" +
  "&vs_currencies=usd" +
  "&include_24hr_change=true" +
  "&precision=2";

const CRYPTO_META = {
  bitcoin: {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    icon: "₿",
    category: "crypto",
  },
  ethereum: {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    icon: "Ξ",
    category: "crypto",
  },
  solana: {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    icon: "◎",
    category: "crypto",
  },
  ripple: {
    id: "ripple",
    symbol: "XRP",
    name: "XRP",
    icon: "✕",
    category: "crypto",
  },
  chainlink: {
    id: "chainlink",
    symbol: "LINK",
    name: "Chainlink",
    icon: "⬡",
    category: "crypto",
  },
  sui: {
    id: "sui",
    symbol: "SUI",
    name: "Sui",
    icon: "💧",
    category: "crypto",
  },
  dogecoin: {
    id: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    icon: "Ð",
    category: "crypto",
  },
};

// ── Finnhub — parallel calls for stocks, ETFs, and forex ─────────────────────

/**
 * All 6 stock/ETF tickers. Each is ONE Finnhub /quote call.
 * Fired in parallel via Promise.allSettled — total: 6 calls.
 *
 * ETF proxies used because Finnhub free tier gives real-time ETF data:
 *   SPY → S&P 500   QQQ → NASDAQ 100   DIA → Dow Jones
 *   TLT → US Bonds  USO → WTI Crude    GLD → Gold
 */
const FINNHUB_STOCKS = [
  {
    ticker: "SPY",
    id: "spy",
    symbol: "S&P 500",
    name: "S&P 500 (SPY)",
    icon: "📈",
    category: "index",
  },
  {
    ticker: "QQQ",
    id: "qqq",
    symbol: "NASDAQ",
    name: "NASDAQ 100 (QQQ)",
    icon: "💻",
    category: "index",
  },
  {
    ticker: "DIA",
    id: "dia",
    symbol: "DOW",
    name: "Dow Jones (DIA)",
    icon: "🏛",
    category: "index",
  },
  {
    ticker: "TLT",
    id: "tlt",
    symbol: "BONDS",
    name: "US Bonds (TLT)",
    icon: "🏦",
    category: "bond",
  },
  {
    ticker: "USO",
    id: "uso",
    symbol: "WTI",
    name: "WTI Crude (USO)",
    icon: "🛢",
    category: "commodity",
  },
  {
    ticker: "GLD",
    id: "gld",
    symbol: "GOLD",
    name: "Gold (GLD)",
    icon: "🥇",
    category: "commodity",
  },
  {
    ticker: "SLV",
    id: "silver",
    symbol: "SILVER",
    name: "Silver (SLV)",
    icon: "🥈",
    category: "commodity",
  },
];

// ── Raw fetch functions (no caching — cache logic lives in the handler) ───────

async function fetchAllCrypto() {
  const res = await fetch(COINGECKO_URL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  if (data.status?.error_code)
    throw new Error(`CoinGecko: ${data.status.error_message}`);

  return Object.entries(data)
    .filter(([id]) => CRYPTO_META[id])
    .map(([id, vals]) => ({
      id,
      ...CRYPTO_META[id],
      price: vals.usd ?? 0,
      change24h: vals.usd_24h_change ?? 0,
    }));
}

async function fetchFinnhubQuote(ticker, meta) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub ${ticker}: ${res.status}`);
  const q = await res.json();

  if (!q.c && !q.pc) throw new Error(`No data for ${ticker}`);
  const price = q.c && q.c !== 0 ? q.c : q.pc;
  return {
    id: meta.id,
    symbol: meta.symbol,
    name: meta.name,
    icon: meta.icon,
    category: meta.category,
    price,
    change24h: q.dp ?? 0,
  };
}


async function fetchDXY() {
  const url =
    "https://api.frankfurter.app/latest?from=USD&to=EUR,JPY,GBP,CAD,SEK,CHF";
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok)
    throw new Error(`Frankfurter DXY: ${res.status} ${res.statusText}`);
  const data = await res.json();

  const r = data.rates;
  if (!r?.EUR) throw new Error("Frankfurter: rates missing from response");


  const EUR_W = 0.576; // Euro
  const JPY_W = 0.136; // Japanese Yen
  const GBP_W = 0.119; // British Pound
  const CAD_W = 0.091; // Canadian Dollar
  const SEK_W = 0.042; // Swedish Krona
  const CHF_W = 0.036; // Swiss Franc

  // Convert USD→X rates to X→USD (multiply = geometric mean inputs)
  const eur = 1 / r.EUR;
  const jpy = 1 / r.JPY;
  const gbp = 1 / r.GBP;
  const cad = 1 / r.CAD;
  const sek = 1 / r.SEK;
  const chf = 1 / r.CHF;

  // Geometric weighted mean × scaling factor (50.14348112 normalises to ~100)
  const dxy =
    50.14348112 *
    Math.pow(eur, EUR_W) *
    Math.pow(jpy, JPY_W) *
    Math.pow(gbp, GBP_W) *
    Math.pow(cad, CAD_W) *
    Math.pow(sek, SEK_W) *
    Math.pow(chf, CHF_W);

  return {
    id: "dxy",
    symbol: "DXY",
    name: "USD Index",
    icon: "$",
    category: "forex",
    price: parseFloat(dxy.toFixed(3)),
    change24h: 0, // ECB daily rates don't include intraday % change
  };
}

// ── Core upstream fetch — called AT MOST once per TTL window ─────────────────

/**
 * Fetches fresh data from all upstream APIs.
 * This is the function that actually burns API quota.
 * It is only called when the cache is stale, and only once even if
 * multiple requests arrive simultaneously (coalescing via setInflight).
 */
async function fetchFreshData() {
  const errors = [];
  const results = [];

  // 1. CoinGecko — 1 call
  try {
    results.push(...(await fetchAllCrypto()));
  } catch (err) {
    errors.push(`Crypto: ${err.message}`);
    console.error("[prices] CoinGecko:", err.message);
  }

  // 2. Finnhub stocks — 6 parallel calls
  if (FINNHUB_KEY) {
    const settled = await Promise.allSettled(
      FINNHUB_STOCKS.map((a) => fetchFinnhubQuote(a.ticker, a)),
    );
    settled.forEach((r, i) => {
      if (r.status === "fulfilled") {
        results.push(r.value);
      } else {
        const msg = `${FINNHUB_STOCKS[i].symbol}: ${r.reason?.message}`;
        errors.push(msg);
        console.error("[prices] Finnhub quote:", msg);
      }
    });
  } else {
    errors.push("Finnhub: FINNHUB_KEY not set in .env.local");
  }

  // 3. DXY — Frankfurter.app (free, no key, ECB basket)
  // Independent of Finnhub — always fetched regardless of key status.
  try {
    results.push(await fetchDXY());
  } catch (err) {
    errors.push(`DXY: ${err.message}`);
    console.error("[prices] DXY:", err.message);
  }

  return {
    markets: results,
    timestamp: new Date().toISOString(),
    errors,
    marketOpen: isUSMarketOpen(),
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ttl = effectiveTTL(); // 90 s or 10 min depending on market hours
  const ttlSeconds = Math.round(ttl / 1000);
  const staleMax = ttlSeconds * 4; // serve stale for up to 4× TTL before hard-block

  // ── A: Cache is fresh — return immediately, zero upstream calls ───────────
  if (!isStale()) {
    const cached = getCached();
    res.setHeader(
      "Cache-Control",
      `s-maxage=${ttlSeconds}, stale-while-revalidate=${staleMax}`,
    );
    res.setHeader("X-Cache", "HIT");
    res.setHeader("X-Cache-Age", `${cacheAgeSeconds()}s`);
    return res
      .status(200)
      .json({ ...cached, cached: true, cacheAge: cacheAgeSeconds() });
  }

  // ── B: Another request is already fetching — coalesce ────────────────────
  //    If we have usable stale data, return it immediately while the
  //    in-flight request refreshes the cache in the background.
  //    If we have NO data at all, we must wait for the in-flight promise.
  const inflight = getInflight();
  if (inflight) {
    if (isUsableStale()) {
      // Return stale immediately — don't wait
      const cached = getCached();
      res.setHeader(
        "Cache-Control",
        `s-maxage=10, stale-while-revalidate=${staleMax}`,
      );
      res.setHeader("X-Cache", "STALE");
      res.setHeader("X-Cache-Age", `${cacheAgeSeconds()}s`);
      return res.status(200).json({
        ...cached,
        cached: true,
        stale: true,
        cacheAge: cacheAgeSeconds(),
      });
    }
    // No stale data — must wait for the in-flight fetch to complete
    try {
      const fresh = await inflight;
      res.setHeader(
        "Cache-Control",
        `s-maxage=${ttlSeconds}, stale-while-revalidate=${staleMax}`,
      );
      res.setHeader("X-Cache", "COALESCED");
      return res.status(200).json({ ...fresh, cached: false });
    } catch {
      return res.status(503).json({
        error: "Price fetch failed",
        markets: [],
        errors: ["Upstream fetch failed"],
      });
    }
  }

  // ── C: We are the first request — kick off the upstream fetch ─────────────
  //    Register the promise immediately so concurrent requests coalesce onto it.
  const fetchPromise = fetchFreshData()
    .then((data) => {
      setCached(data); // save to cache on success
      clearInflight();
      return data;
    })
    .catch((err) => {
      clearInflight(); // clear even on error so next request can retry
      throw err;
    });

  setInflight(fetchPromise);

  try {
    const fresh = await fetchPromise;
    res.setHeader(
      "Cache-Control",
      `s-maxage=${ttlSeconds}, stale-while-revalidate=${staleMax}`,
    );
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json({ ...fresh, cached: false });
  } catch (err) {
    console.error("[prices] Fatal fetch error:", err.message);
    // If we have ANY stale data, return it with an error flag rather than 503
    const stale = getCached();
    if (stale) {
      res.setHeader("Cache-Control", "s-maxage=10");
      res.setHeader("X-Cache", "STALE-ERROR");
      return res
        .status(200)
        .json({ ...stale, cached: true, stale: true, fetchError: err.message });
    }
    return res.status(503).json({
      error: "Price service unavailable",
      markets: [],
      errors: [err.message],
    });
  }
}
