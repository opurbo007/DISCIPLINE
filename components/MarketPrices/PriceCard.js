/**
 * components/MarketPrices/PriceCard.js
 * Glassmorphic card displaying a single market asset's price data.
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import clsx from "clsx";

function formatPrice(price, category) {
  if (price === null || price === undefined) return "—";
  const absPrice = Math.abs(price);
  if (absPrice >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (absPrice >= 1)    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function pricePrefix(category) {
  return ["crypto", "index", "bond", "commodity"].includes(category) ? "$" : "";
}

const CATEGORY_STYLE = {
  crypto:    "text-[#009E60] bg-[rgba(0,158,96,0.1)] border-[rgba(0,158,96,0.2)]",
  index:     "text-[#f59e0b] bg-[rgba(245,158,11,0.08)] border-[rgba(245,158,11,0.15)]",
  forex:     "text-purple-400 bg-purple-400/10 border-purple-400/20",
  bond:      "text-slate-300 bg-white/5 border-white/10",
  commodity: "text-orange-400 bg-orange-400/10 border-orange-400/20",
};

export function PriceCardSkeleton({ compact = false }) {
  return (
    <div
      className={clsx(
        "glass-card flex flex-col justify-between",
        compact ? "p-3 h-[88px]" : "p-4 h-[130px]",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx("rounded-md shimmer-bg", compact ? "w-7 h-7" : "w-9 h-9")} />
          <div className="space-y-1.5">
            <div className="h-2.5 w-8 rounded shimmer-bg" />
            <div className="h-2 w-14 rounded shimmer-bg" />
          </div>
        </div>
        <div className="h-3 w-10 rounded shimmer-bg" />
      </div>
      <div className="space-y-1.5">
        <div className="h-4 w-24 rounded shimmer-bg" />
        <div className="h-2.5 w-16 rounded shimmer-bg" />
      </div>
    </div>
  );
}

export default function PriceCard({ asset, compact = false }) {
  const { symbol, name, icon, price, change24h, category } = asset;

  const isPositive = change24h > 0;
  const isNegative = change24h < 0;
  const isNeutral  = change24h === 0;

  const cardClass = clsx(
    "glass-card flex flex-col justify-between transition-all duration-300 hover:-translate-y-0.5",
    compact ? "p-3 h-[88px]" : "p-4 h-[130px]",
    isPositive && "hover:border-emerald-500/20",
    isNegative && "hover:border-red-500/20",
  );

  const changeClass = clsx(
    "flex items-center gap-0.5 font-mono font-bold",
    compact ? "text-[11px]" : "text-sm",
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
      {/* Top row: icon + symbol + category */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={clsx(
              "rounded-md flex items-center justify-center font-bold shrink-0",
              compact ? "w-7 h-7 text-sm" : "w-9 h-9 text-lg",
            )}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <p className={clsx("text-white font-mono font-bold leading-none truncate", compact ? "text-xs" : "text-sm")}>{symbol}</p>
            <p className={clsx("text-slate-500 leading-none mt-0.5 truncate", compact ? "text-[10px]" : "text-xs")}>{name}</p>
          </div>
        </div>

        <span
          className={clsx(
            "font-mono uppercase tracking-wider rounded border shrink-0",
            compact ? "text-[8px] px-1 py-0.5" : "text-[10px] px-1.5 py-0.5",
            CATEGORY_STYLE[category] || "text-slate-400 bg-white/5 border-white/10"
          )}
        >
          {category}
        </span>
      </div>

      {/* Bottom row: price + 24h change */}
      <div>
        <p className={clsx("text-white font-mono font-bold leading-tight tabular-nums", compact ? "text-base" : "text-xl")}>
          {pricePrefix(category)}
          {formatPrice(price, symbol)}
        </p>

        <div className={changeClass}>
          <ChangeIcon size={compact ? 9 : 12} />
          <span className="tabular-nums">
            {isPositive ? "+" : ""}{change24h.toFixed(2)}%
          </span>
          {!compact && <span className="text-slate-600 font-normal text-xs">24h</span>}
        </div>
      </div>
    </div>
  );
}
