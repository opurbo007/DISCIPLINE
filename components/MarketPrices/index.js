/**
 * components/MarketPrices/index.js
 * Terminal-style market data table. Dense rows, no cards, monospace everything.
 */

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import {
  RefreshCw,
  AlertTriangle,
  Wifi,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import clsx from "clsx";

const REFRESH_COOLDOWN = 30;

function useRefreshCooldown(seconds) {
  const [remaining, setRemaining] = useState(0);
  const start = () => setRemaining(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);
  return { remaining, onCooldown: remaining > 0, start };
}

function fmtPrice(price) {
  if (price === null || price === undefined) return "—";
  const abs = Math.abs(price);
  if (abs >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (abs >= 1000)  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (abs >= 1)     return price.toFixed(2);
  return price.toFixed(4);
}

function pricePrefix(cat) {
  return ["crypto", "index", "bond", "commodity"].includes(cat) ? "$" : "";
}

const CATEGORY_LABEL = {
  crypto:    "CRY",
  index:     "IDX",
  forex:     "FX",
  bond:      "BND",
  commodity: "CMD",
};

// ── Flash effect: highlight price changes ─────────────────────────────────────
function useFlash(value) {
  const [flash, setFlash] = useState(null);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === null || prev.current === value) {
      prev.current = value;
      return;
    }
    const dir = value > prev.current ? "up" : "down";
    prev.current = value;
    setFlash(dir);
    const id = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(id);
  }, [value]);
  return flash;
}

function PriceRow({ asset }) {
  const flash = useFlash(asset.price);

  const isPos = asset.change24h > 0;
  const isNeg = asset.change24h < 0;

  return (
    <div
      className={clsx(
        "grid grid-cols-[40px_1fr_120px_100px] sm:grid-cols-[50px_1fr_140px_120px_80px] gap-3 items-center px-4 py-2.5 border-b border-white/5 hover:bg-white/[0.02] transition-colors",
        flash === "up"   && "bg-emerald-400/5",
        flash === "down" && "bg-red-400/5",
      )}
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center font-mono text-sm font-bold text-slate-300">
        {asset.icon}
      </div>

      {/* Symbol + name */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-bold text-white tracking-wider">
            {asset.symbol}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600 px-1 border border-white/10">
            {CATEGORY_LABEL[asset.category] || asset.category}
          </span>
        </div>
        <p className="font-mono text-[10px] text-slate-600 mt-0.5 truncate">{asset.name}</p>
      </div>

      {/* Price */}
      <div className="text-right">
        <p className="font-mono text-sm font-bold text-white tabular-nums">
          {pricePrefix(asset.category)}{fmtPrice(asset.price)}
        </p>
      </div>

      {/* Change */}
      <div className="text-right">
        <p className={clsx(
          "font-mono text-[12px] font-semibold tabular-nums flex items-center justify-end gap-1",
          isPos && "text-emerald-400",
          isNeg && "text-red-400",
          !isPos && !isNeg && "text-slate-500",
        )}>
          {isPos ? <TrendingUp size={10} /> : isNeg ? <TrendingDown size={10} /> : null}
          {isPos ? "+" : ""}{asset.change24h.toFixed(2)}%
        </p>
      </div>

      {/* Sparkline placeholder slot (right column on sm+) */}
      <div className="hidden sm:flex items-center justify-end">
        <Sparkline positive={isPos} negative={isNeg} />
      </div>
    </div>
  );
}

function Sparkline({ positive, negative }) {
  // Deterministic fake sparkline from a small seeded pattern
  const points = positive
    ? "0,20 10,18 20,15 30,12 40,14 50,8 60,5 70,7 80,3 90,2 100,0"
    : negative
    ? "0,2 10,5 20,4 30,8 40,6 50,10 60,12 70,14 80,16 90,18 100,20"
    : "0,10 10,11 20,9 30,10 40,11 50,10 60,9 70,10 80,11 90,10 100,10";
  const color = positive ? "#009E60" : negative ? "#ef4444" : "#475569";
  return (
    <svg width="60" height="20" viewBox="0 0 100 20" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[40px_1fr_120px_100px] sm:grid-cols-[50px_1fr_140px_120px_80px] gap-3 items-center px-4 py-2.5 border-b border-white/5">
      <div className="w-8 h-8 rounded shimmer-bg" />
      <div className="space-y-1.5">
        <div className="h-3 w-16 rounded shimmer-bg" />
        <div className="h-2 w-24 rounded shimmer-bg" />
      </div>
      <div className="h-4 w-20 rounded shimmer-bg ml-auto" />
      <div className="h-3 w-14 rounded shimmer-bg ml-auto" />
      <div className="hidden sm:block h-4 w-14 rounded shimmer-bg ml-auto" />
    </div>
  );
}

export default function MarketPrices() {
  const cooldown = useRefreshCooldown(REFRESH_COOLDOWN);

  const { data, error, isLoading, isValidating, mutate } = useSWR("/api/prices", {
    refreshInterval: (latestData) => {
      if (!latestData) return 300000;
      return latestData.marketOpen === false ? 600000 : 300000;
    },
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
  });

  const markets = data?.markets || [];
  const apiErrors = data?.errors || [];
  const hasErrors = apiErrors.length > 0;
  const isStale = data?.stale === true;
  const marketOpen = data?.marketOpen !== false;
  const ttlMins = marketOpen ? "5 min" : "10 min";

  // Group by category for visual separation
  const groups = {
    crypto:    markets.filter(m => m.category === "crypto"),
    index:     markets.filter(m => m.category === "index"),
    commodity: markets.filter(m => m.category === "commodity"),
    bond:      markets.filter(m => m.category === "bond"),
    forex:     markets.filter(m => m.category === "forex"),
  };

  const handleRefresh = () => {
    if (cooldown.onCooldown) return;
    cooldown.start();
    mutate();
  };

  const lastUpdate = data?.timestamp ? new Date(data.timestamp) : null;
  const lastUpdateStr = lastUpdate?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  return (
    <div>
      {/* ── Status bar (Bloomberg header) ──────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {isValidating ? (
              <RefreshCw size={10} className="text-[#009E60] animate-spin" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-[#009E60] animate-pulse" />
            )}
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#009E60] font-semibold">
              {isValidating ? "Syncing" : "Live"}
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest">
            {markets.length} instruments
          </span>
          {!marketOpen && (
            <span className="font-mono text-[10px] text-amber-400/80 uppercase tracking-widest flex items-center gap-1">
              <Clock size={9} /> Mkt Closed
            </span>
          )}
          {isStale && (
            <span className="font-mono text-[10px] text-amber-500 uppercase tracking-widest">
              Stale
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {lastUpdateStr && (
            <span className="font-mono text-[10px] text-slate-600 tabular-nums uppercase tracking-widest">
              {lastUpdateStr}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={cooldown.onCooldown || isValidating}
            className={clsx(
              "font-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors flex items-center gap-1.5",
              (cooldown.onCooldown || isValidating) && "opacity-40 cursor-not-allowed",
            )}
          >
            <RefreshCw size={9} className={isValidating ? "animate-spin" : ""} />
            {cooldown.onCooldown ? `${cooldown.remaining}s` : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Column headers ─────────────────────────────────────────── */}
      <div className="hidden sm:grid grid-cols-[50px_1fr_140px_120px_80px] gap-3 px-4 py-2 border-b border-white/10 bg-black">
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600">Sym</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600">Instrument</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600 text-right">Last</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600 text-right">24h Δ</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600 text-right">Trend</span>
      </div>

      {/* ── Error / status banners ─────────────────────────────────── */}
      {hasErrors && !isLoading && (
        <div className="mx-4 mt-3 flex items-start gap-2 text-[11px] text-amber-400/80 bg-amber-400/5 border border-amber-400/20 px-3 py-2">
          <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-400" />
          <span className="font-mono">{apiErrors.join(" • ")}</span>
        </div>
      )}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 text-red-400 text-xs bg-red-400/5 border border-red-400/20 px-3 py-2">
          <Wifi size={12} />
          <span className="font-mono">Failed to reach price API. Check your connection.</span>
        </div>
      )}

      {/* ── Grouped data rows ──────────────────────────────────────── */}
      <div>
        {isLoading ? (
          Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} />)
        ) : (
          Object.entries(groups).map(([cat, items]) =>
            items.length === 0 ? null : (
              <div key={cat}>
                <div className="px-4 py-1.5 bg-white/[0.015] border-b border-white/5 flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500 font-semibold">
                    {cat === "index" ? "Indices" :
                     cat === "crypto" ? "Crypto" :
                     cat === "commodity" ? "Commodities" :
                     cat === "bond" ? "Bonds" :
                     cat === "forex" ? "Forex" : cat}
                  </span>
                  <span className="font-mono text-[9px] text-slate-700">·</span>
                  <span className="font-mono text-[9px] text-slate-700">{items.length}</span>
                </div>
                {items.map((asset) => <PriceRow key={asset.id} asset={asset} />)}
              </div>
            ),
          )
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between bg-white/[0.01]">
        <p className="font-mono text-[9px] text-slate-700 uppercase tracking-widest">
          Auto-refresh · {ttlMins} · Server-cached
        </p>
        <p className="font-mono text-[9px] text-slate-700 uppercase tracking-widest">
          Source: CoinGecko + Finnhub + ECB
        </p>
      </div>
    </div>
  );
}
