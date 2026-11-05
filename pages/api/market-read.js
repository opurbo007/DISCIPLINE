import {
  getCached,
  setCached,
  getInflight,
  setInflight,
  clearInflight,
} from "@/lib/marketReadCache";

const FETCH_TIMEOUT_MS = 8000;
const TTL_MS = 5 * 60 * 1000;
const MAX_STALE_MS = 30 * 60 * 1000;

function num(v) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;

function sma(arr, n) {
  if (arr.length < n) return null;
  return avg(arr.slice(-n));
}

function downsample(values, max = 60) {
  if (!Array.isArray(values)) return null;
  const clean = values.map(num).filter((v) => v !== null);
  if (clean.length === 0) return null;
  if (clean.length <= max) return clean;
  const step = (clean.length - 1) / (max - 1);
  const out = [];
  for (let i = 0; i < max; i++) out.push(clean[Math.round(i * step)]);
  return out;
}

async function fetchJson(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "discipline-market-read" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

async function fetchBtcMarkets() {
  const data = await fetchJson(
    "https://api.coingecko.com/api/v3/coins/markets" +
      "?vs_currency=usd&ids=bitcoin&order=market_cap_desc&sparkline=true&price_change_percentage=24h%2C7d%2C30d"
  );
  const c = Array.isArray(data) ? data[0] : null;
  if (!c) throw new Error("CoinGecko markets: unexpected response");
  return {
    price: num(c.current_price),
    change24h: num(c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h),
    change7d: num(c.price_change_percentage_7d_in_currency),
    change30d: num(c.price_change_percentage_30d_in_currency),
    high24h: num(c.high_24h),
    low24h: num(c.low_24h),
    ath: num(c.ath),
    athChangePct: num(c.ath_change_percentage),
    marketCap: num(c.market_cap),
    spark7d: downsample(c.sparkline_in_7d?.price, 80),
  };
}

async function fetchDailyCloses() {
  const data = await fetchJson(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily"
  );
  const points = Array.isArray(data?.prices) ? data.prices : [];
  const closes = points.map((p) => num(p?.[1])).filter((v) => v !== null);
  if (closes.length < 10) throw new Error("CoinGecko 30d: not enough data");
  return closes;
}

async function fetchSpark24h() {
  const data = await fetchJson(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1"
  );
  const points = Array.isArray(data?.prices) ? data.prices : [];
  const closes = points.map((p) => num(p?.[1])).filter((v) => v !== null);
  const spark = downsample(closes, 60);
  if (!spark) throw new Error("CoinGecko 24h: not enough data");
  return spark;
}

async function fetchFearGreed() {
  const data = await fetchJson("https://api.alternative.me/fng/?limit=1&format=json");
  const d = Array.isArray(data?.data) ? data.data[0] : null;
  const value = num(d?.value);
  if (value === null) throw new Error("Fear & Greed: unexpected response");
  return { value, classification: d?.value_classification || null };
}

async function fetchGlobal() {
  const data = await fetchJson("https://api.coingecko.com/api/v3/global");
  const g = data?.data;
  if (!g) throw new Error("CoinGecko global: unexpected response");
  return {
    dominance: num(g?.market_cap_percentage?.btc),
    mcapChange24h: num(g?.market_cap_change_percentage_24h_usd),
    totalMcapUsd: num(g?.total_market_cap?.usd),
  };
}

function buildModel(btc, closes, fng, globalData) {
  const sma20 = sma(closes, 20);
  const sma20Prev = closes.length >= 25 ? sma(closes.slice(0, -5), 20) : null;
  const smaSlopePct =
    sma20 !== null && sma20Prev ? ((sma20 - sma20Prev) / sma20Prev) * 100 : null;

  const d30High = Math.max(...closes);
  const d30Low = Math.min(...closes);
  const rangePos =
    d30High > d30Low ? clamp((btc.price - d30Low) / (d30High - d30Low), 0, 1) : null;

  const spark7d = btc.spark7d ?? [];
  const support = spark7d.length ? Math.min(...spark7d) : null;
  const resistance = spark7d.length ? Math.max(...spark7d) : null;

  const aboveSma = sma20 !== null ? btc.price >= sma20 : null;
  const momentum = btc.change7d === null ? null : clamp(5 + btc.change7d / 2, 0, 10);
  const rangeScore = rangePos === null ? null : rangePos * 10;
  let trend = 5;
  if (aboveSma === true) trend += 2;
  if (aboveSma === false) trend -= 2;
  if (smaSlopePct !== null) {
    if (smaSlopePct > 0.25) trend += 1;
    else if (smaSlopePct < -0.25) trend -= 1;
  }
  trend = clamp(trend, 0, 10);
  const sentiment = fng ? clamp(fng.value / 10, 0, 10) : null;

  const parts = [
    { label: "Momentum (7d)", score: momentum, weight: 0.3 },
    { label: "30d range position", score: rangeScore, weight: 0.25 },
    { label: "Trend vs 20D avg", score: trend, weight: 0.25 },
    { label: "Sentiment (F&G)", score: sentiment, weight: 0.2 },
  ];
  let wSum = 0;
  let acc = 0;
  for (const p of parts) {
    if (p.score === null || p.score === undefined) continue;
    wSum += p.weight;
    acc += p.weight * p.score;
  }
  const score = wSum > 0 ? Math.round((acc / wSum) * 10) / 10 : null;

  let stage = "WATCHING";
  if (score === null) stage = "NO DATA";
  else if (score < 3.5) stage = "DEFENSIVE";
  else if (score < 5) stage = "CAUTION";
  else if (score < 6.5) stage = "WATCHING";
  else if (score < 8) stage = "CONSTRUCTIVE";
  else stage = "EUPHORIA RISK";

  let nextMove = "WAIT FOR CONFIRMATION";
  if (rangePos !== null) {
    if (rangePos <= 0.15 && btc.change24h !== null && btc.change24h < 0) nextMove = "BREAKDOWN RISK";
    else if (rangePos <= 0.15) nextMove = "SUPPORT TEST";
    else if (rangePos >= 0.85 && btc.change24h !== null && btc.change24h > 0) nextMove = "BREAKOUT WATCH";
    else if (rangePos >= 0.85) nextMove = "RANGE HIGH TEST";
    else if (btc.change7d !== null && btc.change7d > 2) nextMove = "BASE BUILDING";
  }

  let headline;
  if (rangePos !== null && rangePos <= 0.15) headline = ["TESTING", "RANGE LOW"];
  else if (rangePos !== null && rangePos >= 0.85) headline = ["TESTING", "RANGE HIGH"];
  else if (trend >= 6.5) headline = ["UPTREND", "STRUCTURE"];
  else if (trend <= 3.5) headline = ["DOWNTREND", "IN CONTROL"];
  else headline = ["CONSOLIDATING", "IN RANGE"];

  const upDown = btc.change24h === null ? null : btc.change24h >= 0 ? "rose" : "fell";
  const fmtUsd = (v) =>
    v === null ? "—" : `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const fmtPct = (v, signed = true) =>
    v === null ? "—" : `${signed && v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

  const rangePct =
    rangePos === null ? null : Math.round(rangePos * 100);
  const summaryBits = [];
  summaryBits.push(
    `Bitcoin ${upDown ?? "changed"} ${fmtPct(btc.change24h, false)} over 24h to ${fmtUsd(btc.price)} (${fmtPct(btc.change7d)} 7d, ${fmtPct(btc.change30d)} 30d).`
  );
  if (sma20 !== null) {
    summaryBits.push(
      `Price is ${aboveSma ? "above" : "below"} its 20-day average (${fmtUsd(sma20)}${smaSlopePct !== null ? `, slope ${fmtPct(smaSlopePct)} / 5d` : ""}).`
    );
  }
  if (rangePct !== null) {
    summaryBits.push(
      `It sits ${rangePct}% into its 30-day range (${fmtUsd(d30Low)} – ${fmtUsd(d30High)}).`
    );
  }
  if (fng) {
    summaryBits.push(`Fear & Greed reads ${fng.value} (${fng.classification}).`);
  }
  if (globalData?.dominance !== null && globalData?.dominance !== undefined) {
    summaryBits.push(
      `BTC dominance ${globalData.dominance.toFixed(1)}%, total market cap ${fmtPct(globalData.mcapChange24h)} (24h).`
    );
  }

  const simpleRead =
    `Bitcoin ${upDown ?? "moved"} ${fmtPct(btc.change24h, false)} to ${fmtUsd(btc.price)}` +
    (rangePos !== null && rangePos <= 0.15
      ? `, holding the lower boundary of its 30-day consolidation range near ${fmtUsd(support ?? d30Low)}.`
      : rangePos !== null && rangePos >= 0.85
        ? `, pressing the top of its 30-day range near ${fmtUsd(resistance ?? d30High)}.`
        : `, mid-range inside its 30-day consolidation (${fmtUsd(d30Low)} – ${fmtUsd(d30High)}).`);

  const watch =
    rangePos !== null && rangePos <= 0.15
      ? `Watch ${fmtUsd(support ?? d30Low)} — a clean break opens risk to ${fmtUsd(d30Low)}.`
      : rangePos !== null && rangePos >= 0.85
        ? `Watch ${fmtUsd(resistance ?? d30High)} — a clean break opens upside; rejection re-tests ${fmtUsd(sma20 ?? d30Low)}.`
        : `Watch ${fmtUsd(d30Low)} (30d low) and ${fmtUsd(d30High)} (30d high) for the next directional move.`;

  return {
    btc: {
      price: btc.price,
      change24h: btc.change24h,
      change7d: btc.change7d,
      change30d: btc.change30d,
      high24h: btc.high24h,
      low24h: btc.low24h,
      ath: btc.ath,
      athChangePct: btc.athChangePct,
      marketCap: btc.marketCap,
      support,
      resistance,
      d30High,
      d30Low,
      rangePos: rangePos === null ? null : Math.round(rangePos * 100) / 100,
      sma20,
      smaSlopePct,
    },
    sentiment: fng
      ? { fng: fng.value, classification: fng.classification }
      : null,
    global: globalData ?? null,
    score: {
      value: score,
      stage,
      nextMove,
      components: parts.map((p) => ({
        label: p.label,
        value: p.score === null ? null : Math.round(p.score * 10) / 10,
      })),
    },
    read: { headline, summary: summaryBits.join(" "), simpleRead, watch },
  };
}

async function fetchFresh() {
  const errors = [];

  const btc = await fetchBtcMarkets();

  const [dailyR, sparkR, fngR, globalR] = await Promise.allSettled([
    fetchDailyCloses(),
    fetchSpark24h(),
    fetchFearGreed(),
    fetchGlobal(),
  ]);

  const closes = dailyR.status === "fulfilled" ? dailyR.value : null;
  if (dailyR.status !== "fulfilled") errors.push(`Daily closes: ${dailyR.reason?.message}`);
  const spark24h = sparkR.status === "fulfilled" ? sparkR.value : null;
  if (sparkR.status !== "fulfilled") errors.push(`24h chart: ${sparkR.reason?.message}`);
  const fng = fngR.status === "fulfilled" ? fngR.value : null;
  if (fngR.status !== "fulfilled") errors.push(`Fear & Greed: ${fngR.reason?.message}`);
  const globalData = globalR.status === "fulfilled" ? globalR.value : null;
  if (globalR.status !== "fulfilled") errors.push(`Global: ${globalR.reason?.message}`);

  const model = buildModel(btc, closes ?? [btc.price], fng, globalData);
  if (!closes) {
    model.score.value = null;
    model.score.stage = "NO DATA";
  }

  return {
    ...model,
    btc: { ...model.btc, spark24h, spark7d: btc.spark7d },
    asOf: new Date().toISOString(),
    errors,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const now = Date.now();
  const cached = getCached();
  const ageMs = cached?.fetchedAt ? now - cached.fetchedAt : Infinity;

  if (cached?.data && ageMs < TTL_MS) {
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json({ ...cached.data, cached: true, cacheAge: Math.round(ageMs / 1000) });
  }

  const inflight = getInflight();
  if (inflight) {
    if (cached?.data && ageMs < MAX_STALE_MS) {
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=1800");
      res.setHeader("X-Cache", "STALE");
      return res.status(200).json({ ...cached.data, cached: true, stale: true, cacheAge: Math.round(ageMs / 1000) });
    }
    try {
      const fresh = await inflight;
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
      res.setHeader("X-Cache", "COALESCED");
      return res.status(200).json({ ...fresh, cached: false });
    } catch {
      return res.status(503).json({ error: "Market read unavailable", errors: ["Upstream fetch failed"] });
    }
  }

  const fetchPromise = fetchFresh()
    .then((data) => {
      setCached(data);
      clearInflight();
      return data;
    })
    .catch((err) => {
      clearInflight();
      throw err;
    });
  setInflight(fetchPromise);

  try {
    const fresh = await fetchPromise;
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json({ ...fresh, cached: false });
  } catch (err) {
    console.error("[market-read]", err.message);
    if (cached?.data) {
      res.setHeader("Cache-Control", "s-maxage=60");
      res.setHeader("X-Cache", "STALE-ERROR");
      return res.status(200).json({ ...cached.data, cached: true, stale: true, fetchError: err.message });
    }
    return res.status(503).json({ error: "Market read unavailable", errors: [err.message] });
  }
}
