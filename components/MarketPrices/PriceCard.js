/**
 * components/MarketPrices/PriceCard.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Glassmorphic card displaying a single market asset's price data.
 *
 * Props:
 *  asset  : { id, symbol, name, icon, price, change24h, category }
 *  loading: boolean – show skeleton state
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import clsx from "clsx";

// ── Formatting helpers ────────────────────────────────────────────────────────

/**
 * Formats a price number with appropriate decimal places.
 * BTC: 2 dp, small cryptos: 4–6 dp, stocks/indices: 2 dp.
 */
function formatPrice(price, symbol) {
  if (price === null || price === undefined) return "—";
  const absPrice = Math.abs(price);
  if (absPrice >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (absPrice >= 1)    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

/** Returns currency prefix if asset is priced in USD. */
function pricePrefix(category) {
  return ["crypto", "index", "bond", "commodity"].includes(category) ? "$" : "";
}

// ── Category badge colors ─────────────────────────────────────────────────────
const CATEGORY_STYLE = {
  crypto:    "text-[#00d4ff] bg-[rgba(0,212,255,0.08)] border-[rgba(0,212,255,0.15)]",
  index:     "text-[#f59e0b] bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.15)]",
  forex:     "text-purple-400 bg-purple-400/10 border-purple-400/20",
  bond:      "text-slate-300 bg-white/5 border-white/10",
  commodity: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

// ── Skeleton loader ───────────────────────────────────────────────────────────
export function PriceCardSkeleton() {
  return (
    <div className="glass-card p-4 h-[130px] flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg shimmer-bg" />
          <div className="space-y-1.5">
            <div className="h-3 w-10 rounded shimmer-bg" />
            <div className="h-2.5 w-16 rounded shimmer-bg" />
          </div>
        </div>
        <div className="h-4 w-12 rounded shimmer-bg" />
      </div>
      <div className="space-y-1.5">
        <div className="h-6 w-28 rounded shimmer-bg" />
        <div className="h-3 w-20 rounded shimmer-bg" />
      </div>
    </div>
  );
}

// ── Main PriceCard component ──────────────────────────────────────────────────
export default function PriceCard({ asset }) {
  const { symbol, name, icon, price, change24h, category } = asset;

  const isPositive = change24h > 0;
  const isNegative = change24h < 0;
  const isNeutral  = change24h === 0;

  // Dynamic border glow based on price direction
  const cardClass = clsx(
    "glass-card p-4 h-[130px] flex flex-col justify-between",
    "transition-all duration-300 hover:-translate-y-0.5",
    isPositive && "hover:border-emerald-500/20",
    isNegative && "hover:border-red-500/20",
  );

  const changeClass = clsx(
    "flex items-center gap-1 text-sm font-mono font-bold",
    isPositive && "text-emerald-400",
    isNegative && "text-red-400",
    isNeutral  && "text-slate-400",
  );

  const ChangeIcon = isPositive
    ? TrendingUp
    : isNegative
      ? TrendingDown
      : Minus;

  return (
    <div className={cardClass}>
      {/* ── Top row: icon + symbol + category ──────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Asset icon bubble */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {icon}
          </div>

          <div>
            <p className="text-white font-mono font-bold text-sm leading-none">{symbol}</p>
            <p className="text-slate-500 text-xs mt-0.5 leading-none">{name}</p>
          </div>
        </div>

        {/* Category badge */}
        <span
          className={clsx(
            "text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border",
            CATEGORY_STYLE[category] || "text-slate-400 bg-white/5 border-white/10"
          )}
        >
          {category}
        </span>
      </div>

      {/* ── Bottom row: price + 24h change ─────────────────────────────── */}
      <div>
        <p className="text-white font-mono text-xl font-bold leading-tight">
          {pricePrefix(category)}
          {formatPrice(price, symbol)}
        </p>

        <div className={changeClass}>
          <ChangeIcon size={12} />
          <span>
            {isPositive ? "+" : ""}{change24h.toFixed(2)}%
          </span>
          <span className="text-slate-600 font-normal text-xs">24h</span>
        </div>
      </div>
    </div>
  );
}
