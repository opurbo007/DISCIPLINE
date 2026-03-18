import { useState, useEffect } from "react";
import useSWR from "swr";
import {
  RefreshCw,
  AlertTriangle,
  Wifi,
  Clock,
  TrendingUp,
} from "lucide-react";
import PriceCard, { PriceCardSkeleton } from "./PriceCard";
import clsx from "clsx";

const SKELETON_COUNT = 8;
const REFRESH_COOLDOWN = 30; // manual refresh cooldown in seconds

// ── Countdown hook for refresh cooldown ──────────────────────────────────────
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

// ── Age badge ─────────────────────────────────────────────────────────────────
function AgeBadge({ timestamp, stale, marketOpen }) {
  const [ageText, setAgeText] = useState("");

  useEffect(() => {
    if (!timestamp) return;
    const update = () => {
      const secs = Math.round((Date.now() - new Date(timestamp)) / 1000);
      if (secs < 10) return setAgeText("just now");
      if (secs < 60) return setAgeText(`${secs}s ago`);
      return setAgeText(`${Math.floor(secs / 60)}m ${secs % 60}s ago`);
    };
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, [timestamp]);

  if (!ageText) return null;

  return (
    <div className="flex items-center gap-2">
      {stale && (
        <span className="text-[10px] font-mono text-amber-500/70 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
          STALE
        </span>
      )}
      {!marketOpen && (
        <span className="text-[10px] font-mono text-slate-600 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded flex items-center gap-1">
          <Clock size={8} />
          MKT CLOSED
        </span>
      )}
      <span className="text-[10px] text-slate-600 font-mono">{ageText}</span>
    </div>
  );
}

export default function MarketPrices() {
  const cooldown = useRefreshCooldown(REFRESH_COOLDOWN);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "/api/prices",
    {
      // dynamic refresh interval: 5 min if open, 10 min if closed
      refreshInterval: (latestData) => {
        if (!latestData) return 300000; // default 5 min until first fetch
        return latestData.marketOpen === false ? 600000 : 300000;
      },
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
    },
  );

  const markets = data?.markets || [];
  const apiErrors = data?.errors || [];
  const hasErrors = apiErrors.length > 0;
  const isStale = data?.stale === true;
  const marketOpen = data?.marketOpen !== false;
  const ttlMins = marketOpen ? "5 min" : "10 min";

  // ── Sort / filter markets by type ─────────────────────────────────────
  const sortedMarkets = [...markets].sort((a, b) => {
    const order = { crypto: 0, stock: 1, gold: 2 }; // priority
    return (order[a.type] ?? 99) - (order[b.type] ?? 99);
  });

  // ── Render market cards ───────────────────────────────────────────────
  const renderMarketCards = () =>
    isLoading
      ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <PriceCardSkeleton key={i} />
        ))
      : sortedMarkets.map((asset, i) => (
          <div
            key={asset.id}
            className="animate-fade-up"
            style={{ animationDelay: `${i * 35}ms` }}
          >
            <PriceCard asset={asset} />
          </div>
        ));

  const handleRefresh = () => {
    if (cooldown.onCooldown) return;
    cooldown.start();
    mutate();
  };

  return (
    <section>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl tracking-wider text-white">
            MARKET PRICES
          </h2>

          <span className="flex items-center gap-1.5">
            {isValidating ? (
              <RefreshCw size={10} className="text-[#00d4ff] animate-spin" />
            ) : (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
            <span className="text-xs font-mono text-slate-500">
              {isValidating ? "UPDATING" : "LIVE"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <AgeBadge
            timestamp={data?.timestamp}
            stale={isStale}
            marketOpen={marketOpen}
          />
          <button
            onClick={handleRefresh}
            disabled={cooldown.onCooldown || isValidating}
            className={clsx(
              "btn-ghost text-xs transition-all",
              (cooldown.onCooldown || isValidating) &&
                "opacity-40 cursor-not-allowed",
            )}
            title={
              cooldown.onCooldown
                ? `Please wait ${cooldown.remaining}s`
                : "Refresh prices"
            }
          >
            <RefreshCw
              size={12}
              className={isValidating ? "animate-spin" : ""}
            />
            {cooldown.onCooldown
              ? `${cooldown.remaining}s`
              : isValidating
                ? "Updating…"
                : "Refresh"}
          </button>
        </div>
      </div>

      {/* Market closed info */}
      {!marketOpen && !isLoading && markets.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-600 font-mono bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2">
          <Clock size={11} className="text-slate-700 shrink-0" />
          <span>
            US markets closed — stock prices won’t change until next session.
            Cache refreshes every{" "}
            <span className="text-slate-500">{ttlMins}</span>.
          </span>
        </div>
      )}

      {/* API error */}
      {hasErrors && !isLoading && (
        <div className="mb-4 glass-card border-amber-500/20 px-4 py-2.5 flex items-start gap-2 text-xs text-amber-400/80">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
          <div>
            <span className="font-semibold text-amber-400">
              Some data unavailable:
            </span>{" "}
            {apiErrors.join(" • ")}.{" "}
            <a
              href="https://finnhub.io/register"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-300"
            >
              Get your free Finnhub key
            </a>{" "}
            and add it as{" "}
            <code className="bg-white/10 rounded px-1">FINNHUB_KEY</code> in{" "}
            <code className="bg-white/10 rounded px-1">.env.local</code>.
          </div>
        </div>
      )}

      {/* Network error */}
      {error && (
        <div className="glass-card-bear px-4 py-3 flex items-center gap-2 text-red-400 text-sm mb-4">
          <Wifi size={14} />
          Failed to reach price API. Check your connection.
        </div>
      )}

      {/* ── Price grid  */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {renderMarketCards()}
      </div>

      {/* Footer */}
      {markets.length > 0 && !isLoading && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[10px] text-slate-700 font-mono flex items-center gap-1.5">
            <TrendingUp size={9} />
            Auto-refresh every {ttlMins} · Server-cached
          </p>
          {data?.timestamp && (
            <p className="text-[10px] text-slate-700 font-mono">
              Last fetch: {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
