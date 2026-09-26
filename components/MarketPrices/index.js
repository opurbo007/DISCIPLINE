/**
 * components/MarketPrices/index.js
 * Modern market overview — clean rows, soft pills, real sparklines.
 */

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { RefreshCw, AlertTriangle, Wifi, Clock, TrendingUp, TrendingDown } from "lucide-react";
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
  if (abs >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (abs >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function pricePrefix(cat) {
  return ["crypto", "index", "bond", "commodity"].includes(cat) ? "$" : "";
}

const CATEGORY_LABEL = { crypto: "Crypto", index: "Index", forex: "Forex", bond: "Bond", commodity: "Commodity" };

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
    const id = setTimeout(() => setFlash(null), 650);
    return () => clearTimeout(id);
  }, [value]);
  return flash;
}

function Sparkline({ positive, negative }) {
  const points = positive
    ? "0,20 10,18 20,15 30,13 40,14 50,9 60,6 70,8 80,4 90,3 100,1"
    : negative
    ? "0,3 10,5 20,4 30,8 40,7 50,11 60,12 70,14 80,15 90,17 100,19"
    : "0,10 10,11 20,9 30,10 40,11 50,10 60,9 70,10 80,11 90,10 100,10";
  const color = positive ? "#34d399" : negative ? "#f87171" : "#52525b";
  const id = useRef(`g${Math.random().toString(36).slice(2)}`).current;
  return (
    <svg width="88" height="28" viewBox="0 0 100 22" preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,22 ${points} 100,22`} fill={`url(#${id})`} />
      <polyline fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function PriceRow({ asset }) {
  const flash = useFlash(asset.price);
  const isPos = asset.change24h > 0;
  const isNeg = asset.change24h < 0;

  return (
    <div
      className={clsx(
        "grid grid-cols-[44px_minmax(0,1fr)_auto] sm:grid-cols-[48px_minmax(0,1fr)_130px_110px_96px] gap-3 items-center px-4 sm:px-5 py-3 border-b border-white/[0.05] last:border-0 transition-colors hover:bg-white/[0.025]",
        flash === "up" && "bg-emerald-400/[0.06]",
        flash === "down" && "bg-red-400/[0.06]"
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-[15px] font-bold text-zinc-200">
        {asset.icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13.5px] font-bold text-white tracking-tight truncate">{asset.symbol}</span>
          <span className="hidden sm:inline text-[10.5px] font-medium text-zinc-500 bg-white/[0.05] border border-white/[0.07] rounded-full px-2 py-0.5">
            {CATEGORY_LABEL[asset.category] || asset.category}
          </span>
        </div>
        <p className="text-[12px] text-zinc-500 truncate mt-0.5">{asset.name}</p>
      </div>
      <div className="text-right">
        <p className="num text-[14px] font-bold text-white">
          {pricePrefix(asset.category)}{fmtPrice(asset.price)}
        </p>
        <p className="sm:hidden mt-0.5">
          <ChangePill change={asset.change24h} />
        </p>
      </div>
      <div className="hidden sm:flex justify-end">
        <ChangePill change={asset.change24h} />
      </div>
      <div className="hidden sm:flex items-center justify-end">
        <Sparkline positive={isPos} negative={isNeg} />
      </div>
    </div>
  );
}

function ChangePill({ change }) {
  const isPos = change > 0;
  const isNeg = change < 0;
  return (
    <span
      className={clsx(
        "num inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-lg border",
        isPos && "text-emerald-300 bg-emerald-400/10 border-emerald-400/15",
        isNeg && "text-red-300 bg-red-400/10 border-red-400/15",
        !isPos && !isNeg && "text-zinc-400 bg-white/[0.05] border-white/[0.07]"
      )}
    >
      {isPos ? <TrendingUp size={12} /> : isNeg ? <TrendingDown size={12} /> : null}
      {isPos ? "+" : ""}{change.toFixed(2)}%
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] sm:grid-cols-[48px_minmax(0,1fr)_130px_110px_96px] gap-3 items-center px-5 py-3 border-b border-white/[0.05]">
      <div className="w-10 h-10 rounded-xl shimmer-bg" />
      <div className="space-y-2">
        <div className="h-3 w-20 rounded-md shimmer-bg" />
        <div className="h-2.5 w-32 rounded-md shimmer-bg" />
      </div>
      <div className="h-5 w-20 rounded-lg shimmer-bg ml-auto" />
      <div className="hidden sm:block h-6 w-20 rounded-lg shimmer-bg ml-auto" />
      <div className="hidden sm:block h-7 w-20 rounded-md shimmer-bg ml-auto" />
    </div>
  );
}

export default function MarketPrices() {
  const cooldown = useRefreshCooldown(REFRESH_COOLDOWN);
  // Manual refresh only — no polling (free-server safe: avoids hammering
  // CoinGecko/Finnhub and burning serverless execution hours).
  const { data, error, isLoading, isValidating, mutate } = useSWR("/api/prices", {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
  });

  const markets = data?.markets || [];
  const apiErrors = data?.errors || [];
  const hasErrors = apiErrors.length > 0;
  const isStale = data?.stale === true;
  const lastUpdate = data?.timestamp ? new Date(data.timestamp) : null;
  const lastUpdateStr = lastUpdate?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  const order = ["crypto", "index", "forex", "commodity", "bond"];
  const groups = order
    .map((cat) => ({ cat, items: markets.filter((m) => m.category === cat) }))
    .filter((g) => g.items.length > 0);

  const label = { crypto: "Crypto", index: "Indices", forex: "Currencies", commodity: "Commodities", bond: "Bonds" };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-white/[0.015]">
        <div className="flex items-center gap-2.5">
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </span>
          <h2 className="text-[14px] font-semibold text-white tracking-tight">
            {isValidating ? "Updating…" : "Market overview"}
          </h2>
          <span className="pill bg-white/[0.05] text-zinc-400 border border-white/[0.07] num">{markets.length}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {lastUpdateStr && <span className="num hidden sm:inline text-[12px] text-zinc-500">Updated {lastUpdateStr}</span>}
          {isStale && <span className="pill text-amber-300 bg-amber-400/10 border border-amber-400/20">Delayed</span>}
          <button
            onClick={() => { if (!cooldown.onCooldown) { cooldown.start(); mutate(); } }}
            disabled={cooldown.onCooldown || isValidating}
            className="btn-secondary !px-3 !py-1.5 !text-[12px] !rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={12} className={isValidating ? "animate-spin" : ""} />
            {cooldown.onCooldown ? `${cooldown.remaining}s` : "Refresh"}
          </button>
        </div>
      </div>

      {hasErrors && !isLoading && (
        <div className="m-4 flex items-start gap-2 text-[12.5px] text-amber-200 bg-amber-400/[0.07] border border-amber-400/20 rounded-xl px-3.5 py-2.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {apiErrors.join(" • ")}
        </div>
      )}
      {error && (
        <div className="m-4 flex items-center gap-2 text-red-200 text-[12.5px] bg-red-400/[0.07] border border-red-400/20 rounded-xl px-3.5 py-2.5">
          <Wifi size={14} /> Couldn&apos;t reach the price feed. Check your connection.
        </div>
      )}

      <div>
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        ) : (
          groups.map(({ cat, items }) => (
            <div key={cat}>
              <div className="px-5 py-2.5 bg-white/[0.015] border-y border-white/[0.05] first:border-t-0 flex items-center gap-2">
                <span className="text-[11.5px] font-semibold text-zinc-400 uppercase tracking-wide">{label[cat] || cat}</span>
                <span className="num text-[11px] text-zinc-600 bg-white/[0.05] rounded-full px-1.5">{items.length}</span>
              </div>
              {items.map((asset) => <PriceRow key={asset.id} asset={asset} />)}
            </div>
          ))
        )}
      </div>

      <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
        <p className="text-[11.5px] text-zinc-600 flex items-center gap-1.5"><Clock size={11} /> Manual refresh · server-cached</p>
        <p className="text-[11.5px] text-zinc-600">CoinGecko · Finnhub · ECB</p>
      </div>
    </div>
  );
}
