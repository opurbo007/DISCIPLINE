/**
 * components/TimeZones/index.js
 * Live clocks for the three major trading sessions.
 * Header is rendered by the parent page; this component renders only the cards.
 */

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import clsx from "clsx";

const MARKETS = [
  {
    id:       "new-york",
    city:     "New York",
    timezone: "America/New_York",
    exchange: "NYSE · NASDAQ",
    flag:     "🇺🇸",
    open:     { h: 9,  m: 30 },
    close:    { h: 16, m: 0  },
    preOpen:  { h: 4,  m: 0  },
    accent:   "arc",
  },
  {
    id:       "london",
    city:     "London",
    timezone: "Europe/London",
    exchange: "LSE · Forex",
    flag:     "🇬🇧",
    open:     { h: 8,  m: 0  },
    close:    { h: 16, m: 30 },
    preOpen:  { h: 7,  m: 0  },
    accent:   "ember",
  },
  {
    id:       "tokyo",
    city:     "Tokyo",
    timezone: "Asia/Tokyo",
    exchange: "TSE · Nikkei",
    flag:     "🇯🇵",
    open:     { h: 9,  m: 0  },
    close:    { h: 15, m: 30 },
    preOpen:  { h: 8,  m: 0  },
    accent:   "bull",
  },
];

function nowIn(timezone) {
  return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day:     "2-digit",
    month:   "short",
  });
}

function getSessionStatus(date, market) {
  const day = date.getDay();
  if (day === 0 || day === 6) return "closed";
  const h = date.getHours();
  const m = date.getMinutes();
  const nowMinutes = h * 60 + m;
  const openMinutes  = market.open.h  * 60 + market.open.m;
  const closeMinutes = market.close.h * 60 + market.close.m;
  const preMinutes   = market.preOpen.h * 60 + market.preOpen.m;
  if (nowMinutes >= openMinutes && nowMinutes < closeMinutes) return "open";
  if (nowMinutes >= preMinutes  && nowMinutes < openMinutes)  return "pre";
  return "closed";
}

function StatusBadge({ status }) {
  const cfg = {
    open:   { label: "OPEN",   className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
    pre:    { label: "PRE",    className: "text-amber-400  bg-amber-400/10  border-amber-400/25"  },
    closed: { label: "CLOSED", className: "text-slate-500  bg-white/5       border-white/10"       },
  }[status];

  return (
    <span className={clsx("text-[9px] font-mono px-1.5 py-0.5 rounded border", cfg.className)}>
      {cfg.label}
    </span>
  );
}

const ACCENT_CARD = {
  arc:   "glass-card-arc",
  ember: "glass-card-ember",
  bull:  "glass-card-bull",
};

const ACCENT_TIME = {
  arc:   "text-[#009E60]",
  ember: "text-[#f59e0b]",
  bull:  "text-emerald-400",
};

function ClockCard({ market, times }) {
  const localDate = times[market.id];
  if (!localDate) return null;

  const status  = getSessionStatus(localDate, market);
  const timeStr = formatTime(localDate);
  const dateStr = formatDate(localDate);

  return (
    <div className={clsx("p-3 flex flex-col gap-2", ACCENT_CARD[market.accent])}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">{market.flag}</span>
          <div className="min-w-0">
            <p className="text-white font-semibold text-xs leading-none truncate">{market.city}</p>
            <p className="text-slate-500 text-[10px] mt-0.5 truncate">{market.exchange}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div>
        <p className={clsx("font-mono font-bold leading-none tracking-tight", ACCENT_TIME[market.accent], "text-lg")}>
          {timeStr.split(":").slice(0, 2).join(":")}
          <span className="text-slate-500 text-sm">
            :{timeStr.split(":")[2]}
          </span>
        </p>
        <p className="text-slate-600 font-mono text-[10px] mt-1">{dateStr}</p>
      </div>

      {status !== "closed" && (
        <SessionBar date={localDate} market={market} status={status} accent={market.accent} />
      )}
    </div>
  );
}

function SessionBar({ date, market, status, accent }) {
  const h = date.getHours();
  const m = date.getMinutes();
  const nowMin = h * 60 + m;

  const startMin = status === "pre"
    ? market.preOpen.h  * 60 + market.preOpen.m
    : market.open.h     * 60 + market.open.m;
  const endMin   = market.close.h * 60 + market.close.m;

  const pct = Math.min(100, Math.max(0, ((nowMin - startMin) / (endMin - startMin)) * 100));

  const barColor = {
    arc:   "bg-[#009E60]",
    ember: "bg-[#f59e0b]",
    bull:  "bg-emerald-400",
  }[accent];

  return (
    <div className="space-y-1">
      <div className="h-0.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all duration-1000", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-slate-600 text-[9px] font-mono">
        {status === "pre" ? "Pre-market" : "Session"} · {pct.toFixed(0)}%
      </p>
    </div>
  );
}

export default function TimeZones({ compact = false }) {
  const [times, setTimes] = useState({});

  useEffect(() => {
    const tick = () => {
      const updated = {};
      MARKETS.forEach((m) => { updated[m.id] = nowIn(m.timezone); });
      setTimes(updated);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={clsx(
        "grid gap-2",
        compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3",
      )}
    >
      {MARKETS.map((market, i) => (
        <div
          key={market.id}
          className="animate-fade-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <ClockCard market={market} times={times} />
        </div>
      ))}
    </div>
  );
}
