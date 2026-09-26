/**
 * components/FearGreed/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Crypto Fear & Greed gauge. Free-tier safe: NO polling, manual refresh only
 * with a 60s cooldown. Server caches for 1h (index updates ~daily).
 */

import { useState, useEffect } from "react";
import useSWR from "swr";
import { RefreshCw, Gauge } from "lucide-react";
import clsx from "clsx";

function mood(value) {
  if (value == null) return { label: "—", tint: "text-zinc-400 bg-white/[0.05] border-white/[0.07]", bar: "#52525b" };
  if (value <= 24) return { label: "Extreme Fear", tint: "text-red-300 bg-red-400/10 border-red-400/20", bar: "#ef4444" };
  if (value <= 44) return { label: "Fear", tint: "text-orange-300 bg-orange-400/10 border-orange-400/20", bar: "#fb923c" };
  if (value <= 55) return { label: "Neutral", tint: "text-amber-300 bg-amber-400/10 border-amber-400/20", bar: "#f59e0b" };
  if (value <= 74) return { label: "Greed", tint: "text-lime-300 bg-lime-400/10 border-lime-400/20", bar: "#a3e635" };
  return { label: "Extreme Greed", tint: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20", bar: "#34d399" };
}

export default function FearGreed() {
  const [cooldown, setCooldown] = useState(0);
  const { data, error, isLoading, isValidating, mutate } = useSWR("/api/fear-greed", {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const current = data?.current || null;
  const previous = data?.previous || null;
  const m = mood(current?.value);
  const delta = current && previous ? current.value - previous.value : null;

  const refresh = () => {
    if (cooldown > 0 || isValidating) return;
    setCooldown(60);
    mutate();
  };

  return (
    <div className="card px-5 py-4">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center shrink-0">
          <Gauge size={14} className="text-zinc-300" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-white tracking-tight leading-none">Fear &amp; Greed</h2>
          <p className="text-[11.5px] text-zinc-500 mt-1">Crypto sentiment · updates daily · cached 1h</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {current && (
            <span className={clsx("pill border num", m.tint)}>
              {current.value} · {current.classification || m.label}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={cooldown > 0 || isValidating}
            className="btn-secondary !px-3 !py-1.5 !text-[12px] !rounded-lg disabled:opacity-50"
            title="Refresh sentiment"
          >
            <RefreshCw size={12} className={isValidating ? "animate-spin" : ""} />
            {cooldown > 0 ? `${cooldown}s` : "Refresh"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-3 h-2 rounded-full shimmer-bg" />
      ) : error || !current ? (
        <p className="mt-3 text-[12.5px] text-zinc-500">Sentiment unavailable right now.</p>
      ) : (
        <>
          <div className="mt-3 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, current.value))}%`, background: m.bar }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11.5px]">
            <span className="text-zinc-600">0 Extreme Fear</span>
            <span className="num text-zinc-400">
              {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta} vs yesterday`}
              {data?.stale ? " · Delayed" : ""}
            </span>
            <span className="text-zinc-600">100 Extreme Greed</span>
          </div>
        </>
      )}
    </div>
  );
}
