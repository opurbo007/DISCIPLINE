import useSWR from "swr";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  RefreshCw,
  Wifi,
  Minus,
} from "lucide-react";
import clsx from "clsx";

function fmtUsd(v, maxFrac = 0) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `$${v.toLocaleString("en-US", {
    minimumFractionDigits: maxFrac,
    maximumFractionDigits: maxFrac,
  })}`;
}

function fmtK(v) {
  if (!Number.isFinite(v)) return "—";
  return `$${(v / 1000).toFixed(1)}k`;
}

function fmtPct(v, signed = true, frac = 2) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${signed && v >= 0 ? "+" : ""}${v.toFixed(frac)}%`;
}

function ChangePill({ value, label }) {
  const v = Number.isFinite(value) ? value : null;
  const isPos = v !== null && v > 0;
  const isNeg = v !== null && v < 0;
  const Icon = isPos ? TrendingUp : isNeg ? TrendingDown : Minus;
  return (
    <span
      className={clsx(
        "num inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-lg border",
        isPos && "text-emerald-300 bg-emerald-400/10 border-emerald-400/15",
        isNeg && "text-red-300 bg-red-400/10 border-red-400/15",
        !isPos && !isNeg && "text-zinc-400 bg-white/[0.05] border-white/[0.07]"
      )}
    >
      <Icon size={12} />
      {v === null ? "—" : `${isPos ? "+" : ""}${v.toFixed(2)}%`}
      {label && <span className="text-[10px] font-normal opacity-70">{label}</span>}
    </span>
  );
}

function buildChart(spark) {
  if (!Array.isArray(spark) || spark.length < 2) return null;
  const min = Math.min(...spark);
  const max = Math.max(...spark);
  const range = max - min || 1;
  const W = 300;
  const H = 80;
  const PAD = 6;
  const step = W / (spark.length - 1);
  const points = spark
    .map(
      (v, i) =>
        `${(i * step).toFixed(1)},${(H - PAD - ((v - min) / range) * (H - 2 * PAD)).toFixed(1)}`
    )
    .join(" ");
  return { points, min, max };
}

function Gauge({ score }) {
  const value = Number.isFinite(score) ? score : null;
  const angle = value === null ? Math.PI / 2 : Math.PI * (1 - value / 10);
  const needleLen = 52;
  const nx = 100 + needleLen * Math.cos(angle);
  const ny = 80 - needleLen * Math.sin(angle);
  const gaugeColor =
    value === null ? "#52525b" : value < 3.5 ? "#f87171" : value < 6.5 ? "#fbbf24" : "#34d399";
  return (
    <div className="relative">
      <div className="w-48 h-24 mx-auto relative">
        <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible">
          <path d="M 10 85 A 90 90 0 0 1 190 85" fill="none" stroke="#27272a" strokeWidth="16" strokeLinecap="round" />
          <path d="M 10 85 A 90 90 0 0 1 55 20" fill="none" stroke="#ef4444" strokeWidth="16" strokeLinecap="round" />
          <path d="M 55 20 A 90 90 0 0 1 100 15" fill="none" stroke="#f97316" strokeWidth="16" strokeLinecap="round" />
          <path d="M 100 15 A 90 90 0 0 1 145 20" fill="none" stroke="#eab308" strokeWidth="16" strokeLinecap="round" />
          <path d="M 145 20 A 90 90 0 0 1 190 85" fill="none" stroke="#22c55e" strokeWidth="16" strokeLinecap="round" />
          <line x1="100" y1="80" x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke={gaugeColor} strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="80" r="5" fill={gaugeColor} />
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            const t = (n - 1) / 9;
            const a = Math.PI * (1 - t);
            const cx = 100;
            const cy = 85;
            const x1 = cx + 66 * Math.cos(a);
            const y1 = cy - 66 * Math.sin(a);
            const x2 = cx + 73 * Math.cos(a);
            const y2 = cy - 73 * Math.sin(a);
            const xt = cx + 79 * Math.cos(a);
            const yt = cy - 79 * Math.sin(a);
            return (
              <g key={n}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#52525b" strokeWidth="1.5" />
                <text x={xt} y={yt} textAnchor="middle" dominantBaseline="middle" fill="#52525b" fontSize="7" fontFamily="monospace">
                  {n}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="text-center mt-2">
        <span className="text-[36px] font-black text-amber-300 tracking-tighter num">
          {value === null ? "—" : value.toFixed(1)}
        </span>
        <span className="text-[16px] text-zinc-500">/10</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }) {
  const v = Number.isFinite(value) ? value : null;
  const pct = v === null ? 0 : (v / 10) * 100;
  const color = v === null ? "#3f3f46" : v < 3.5 ? "#f87171" : v < 6.5 ? "#fbbf24" : "#34d399";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10.5px] text-zinc-500 w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="num text-[10.5px] text-zinc-400 w-6 text-right">{v === null ? "—" : v.toFixed(1)}</span>
    </div>
  );
}

function SkeletonPanel({ className }) {
  return (
    <div className={clsx("card p-5", className)}>
      <div className="h-3 w-32 rounded shimmer-bg mb-4" />
      <div className="h-8 w-40 rounded-lg shimmer-bg" />
      <div className="h-3 w-48 rounded shimmer-bg mt-3" />
      <div className="h-24 w-full rounded-xl shimmer-bg mt-4" />
      <div className="space-y-2 mt-4">
        <div className="h-3 w-full rounded shimmer-bg" />
        <div className="h-3 w-5/6 rounded shimmer-bg" />
      </div>
    </div>
  );
}

export default function MarketRead() {
  const { data, error, isLoading, isValidating, mutate } = useSWR("/api/market-read", {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
    keepPreviousData: true,
  });

  if (isLoading && !data) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-8 h-8 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
            <Activity size={15} className="text-emerald-300" />
          </span>
          <div>
            <h2 className="text-[14px] font-semibold text-white tracking-tight">Current Market Read</h2>
            <p className="text-[11.5px] text-zinc-500">Loading live BTC data…</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SkeletonPanel />
          <SkeletonPanel />
          <SkeletonPanel />
        </div>
      </div>
    );
  }

  if ((error && !data) || !data) {
    return (
      <div className="card p-8 flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center">
          <Wifi size={20} className="text-red-300" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Couldn&apos;t load the market read</h3>
          <p className="text-[12.5px] text-zinc-500 mt-1">CoinGecko or the price feed is unreachable right now.</p>
        </div>
        <button onClick={() => mutate()} className="btn-secondary !text-[12px] !py-2">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  const { btc, score, read, sentiment, global: globalData, asOf, stale, errors: apiErrors = [] } = data;
  const chart = buildChart(btc?.spark24h);
  const updated = asOf ? new Date(asOf) : null;
  const updatedLabel = updated
    ? updated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    : null;

  const isPosDay = Number.isFinite(btc.change24h) && btc.change24h >= 0;
  const lineColor = isPosDay ? "#34d399" : "#f87171";
  const gradId = "btcReadGrad";

  const structure = (() => {
    const above = btc.sma20 !== null && btc.sma20 !== undefined && btc.price >= btc.sma20;
    const c7 = btc.change7d ?? 0;
    if (btc.smaSlopePct !== null && btc.smaSlopePct !== undefined && btc.smaSlopePct > 0.25 && above && c7 > 0)
      return { text: "Uptrend — higher highs", tone: "up" };
    if (btc.smaSlopePct !== null && btc.smaSlopePct !== undefined && btc.smaSlopePct < -0.25 && !above && c7 < 0)
      return { text: "Downtrend — lower lows", tone: "down" };
    if (btc.rangePos !== null && btc.rangePos !== undefined && btc.rangePos <= 0.25)
      return { text: "Consolidating near range low", tone: "warn" };
    if (btc.rangePos !== null && btc.rangePos !== undefined && btc.rangePos >= 0.75)
      return { text: "Consolidating near range high", tone: "warn" };
    return { text: "Consolidating — no clear trend", tone: "neutral" };
  })();
  const structureClass = {
    up: "text-emerald-300",
    down: "text-red-300",
    warn: "text-amber-300",
    neutral: "text-zinc-300",
  }[structure.tone];

  const trendUp = (btc.smaSlopePct ?? 0) >= 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-600/20 border border-emerald-400/20 flex items-center justify-center">
          <Activity size={15} className="text-emerald-300" />
        </span>
        <div>
          <h2 className="text-[14px] font-semibold text-white tracking-tight">Current Market Read</h2>
          <p className="text-[11.5px] text-zinc-500">Live BTC analysis · sentiment · cycle score</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {updatedLabel && (
            <span className="num text-[11px] text-zinc-500">
              {isValidating ? "Updating…" : `Updated ${updatedLabel}`}
            </span>
          )}
          {stale && (
            <span className="pill text-amber-300 bg-amber-400/10 border border-amber-400/20">Delayed</span>
          )}
          <button
            onClick={() => mutate()}
            disabled={isValidating}
            className="btn-secondary !px-2.5 !py-1.5 !text-[11px] !rounded-lg disabled:opacity-50"
            aria-label="Refresh market read"
          >
            <RefreshCw size={12} className={isValidating ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {apiErrors.length > 0 && (
        <div className="flex items-start gap-2 text-[12px] text-amber-200 bg-amber-400/[0.07] border border-amber-400/20 rounded-xl px-3.5 py-2.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>Some inputs unavailable: {apiErrors.join(" · ")}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT PANEL: PRICE ACTION */}
        <div className="card p-5 border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.04] to-transparent">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Price Action</h3>
            <span className="ml-auto text-[10px] font-mono text-zinc-500">BTC/USD</span>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-zinc-500 font-medium">BTC Price</p>
              <ChangePill value={btc.change24h} label="24h" />
            </div>
            <p className="text-[28px] font-extrabold text-emerald-300 tracking-tight leading-none num mt-1.5">
              {fmtUsd(btc.price, 2)}
            </p>
            <p className="text-[12px] text-zinc-500 mt-1 font-mono num">
              24h Range: {fmtUsd(btc.low24h, 0)} – {fmtUsd(btc.high24h, 0)}
            </p>
          </div>

          {/* 24h chart from live 5-min data */}
          <div className="relative h-28 mb-4 rounded-xl overflow-hidden bg-black/40 border border-white/[0.05]">
            {chart ? (
              <>
                <svg viewBox="0 0 300 80" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lineColor} stopOpacity="0.5" />
                      <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points={`0,80 ${chart.points} 300,80`} fill={`url(#${gradId})`} />
                  <polyline
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={chart.points}
                  />
                </svg>
                <div className="absolute top-1 left-2 text-[9px] text-zinc-600 num">{fmtK(chart.max)}</div>
                <div className="absolute bottom-4 left-2 text-[9px] text-zinc-600 num">{fmtK(chart.min)}</div>
                <div className="absolute bottom-1 left-2 text-[9px] text-zinc-600">24h ago</div>
                <div className="absolute bottom-1 right-2 text-[9px] text-zinc-600">Now</div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-zinc-600">
                Chart unavailable
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[12px] gap-2">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <TrendingUp size={12} className="text-amber-300" /> Structure:
              </span>
              <span className={clsx("font-semibold text-right", structureClass)}>{structure.text}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <ArrowUpRight size={12} className="text-emerald-300" /> 7D Support:
              </span>
              <span className="font-mono font-bold text-emerald-300 num">{fmtUsd(btc.support)}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <ArrowDownRight size={12} className="text-red-300" /> 7D Resistance:
              </span>
              <span className="font-mono font-bold text-red-300 num">{fmtUsd(btc.resistance)}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-zinc-400">
                {trendUp ? (
                  <ArrowUpRight size={12} className="text-emerald-300" />
                ) : (
                  <ArrowDownRight size={12} className="text-red-300" />
                )}
                20D Average:
              </span>
              <span className="font-mono font-bold text-zinc-200 num">
                {fmtUsd(btc.sma20)}
                {btc.smaSlopePct !== null && (
                  <span className={clsx("ml-1.5 text-[10px]", trendUp ? "text-emerald-400" : "text-red-400")}>
                    {fmtPct(btc.smaSlopePct)}/5d
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.05]">
            <p className="text-[11.5px] text-zinc-500 leading-relaxed">
              <span className="text-amber-300 font-semibold">Simple Read:</span>{" "}
              <span className="text-zinc-200">{read.simpleRead}</span>
            </p>
          </div>
        </div>

        {/* CENTER PANEL: CURRENT MARKET READ */}
        <div className="card p-5 border-amber-400/15 bg-gradient-to-br from-amber-400/[0.04] to-transparent flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Current Market Read</h3>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-[30px] font-black text-amber-300 tracking-tight leading-[1.05]">
              {read.headline[0]}
            </h2>
            <h2 className="text-[30px] font-black text-amber-300 tracking-tight leading-[1.05] mb-4">
              {read.headline[1]}
            </h2>

            <p className="text-[12px] font-semibold text-zinc-300 mb-3">
              {sentiment
                ? `Fear & Greed ${sentiment.fng} (${sentiment.classification})`
                : "Sentiment unavailable"}
              {globalData?.dominance !== null && globalData?.dominance !== undefined && (
                <>
                  {" "}· BTC dominance {globalData.dominance.toFixed(1)}%
                  {globalData?.mcapChange24h !== null && globalData?.mcapChange24h !== undefined && (
                    <> · Total cap {fmtPct(globalData.mcapChange24h)} (24h)</>
                  )}
                </>
              )}
            </p>

            <p className="text-[12px] text-zinc-400 leading-relaxed">{read.summary}</p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] py-2.5 px-1">
                <p className="num text-[15px] font-bold text-white">{fmtPct(btc.change24h)}</p>
                <p className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5">24h</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] py-2.5 px-1">
                <p className="num text-[15px] font-bold text-white">{fmtPct(btc.change7d)}</p>
                <p className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5">7d</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] py-2.5 px-1">
                <p className="num text-[15px] font-bold text-white">{fmtPct(btc.change30d)}</p>
                <p className="text-[9px] uppercase tracking-wider text-zinc-500 mt-0.5">30d</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.05]">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <AlertTriangle size={12} className="text-amber-300 shrink-0" />
              <span>{read.watch}</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: MARKET CYCLE SCORE */}
        <div className="card p-5 border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.04] to-transparent">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Market Cycle Score</h3>
          </div>

          <Gauge score={score?.value} />

          <div className="flex justify-between text-[9px] text-zinc-600 font-medium mt-1 px-2">
            <span>Capitulation</span>
            <span>Neutral</span>
            <span>Extension</span>
            <span>Euphoria</span>
          </div>

          <div className="mt-4 space-y-2">
            {(score?.components || []).map((c) => (
              <ScoreBar key={c.label} label={c.label} value={c.value} />
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-zinc-400">Cycle Stage:</span>
              <span className="text-[12px] font-bold text-amber-300">{score?.stage ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-zinc-400">Range position (30d):</span>
              <span className="text-[12px] font-mono font-bold text-white num">
                {btc.rangePos === null || btc.rangePos === undefined ? "—" : `${Math.round(btc.rangePos * 100)}%`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-zinc-400">From ATH:</span>
              <span className="text-[12px] font-mono font-bold text-red-300 num">{fmtPct(btc.athChangePct, false)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] text-zinc-400">Next move:</span>
              <span className="text-[12px] font-bold text-emerald-300 text-right">{score?.nextMove ?? "—"}</span>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-amber-400/10 border border-amber-400/20">
            <p className="text-[11.5px] text-amber-200 font-medium">{read.watch}</p>
            <p className="text-[10.5px] text-amber-200/70 mt-1">
              Score blends momentum, range position, trend vs the 20-day average, and Fear &amp; Greed — recalculated every 5 minutes from live data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
