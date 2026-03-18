/**
 * components/TimeZones/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows live clocks for the three major trading sessions:
 *   • New York  (America/New_York)   – NYSE / NASDAQ
 *   • London    (Europe/London)      – LSE / Forex session
 *   • Tokyo     (Asia/Tokyo)         – Asian / Nikkei session
 *
 * Updates every second via setInterval. Session status (open / closed / pre)
 * is calculated client-side based on the market's local time.
 */

import { useEffect, useState } from "react";
import { Clock, TrendingUp } from "lucide-react";
import clsx from "clsx";

// ── Market session definitions ────────────────────────────────────────────────
const MARKETS = [
  {
    id:       "new-york",
    city:     "New York",
    timezone: "America/New_York",
    exchange: "NYSE · NASDAQ",
    flag:     "🇺🇸",
    // Session hours in local market time (24h)
    open:     { h: 9,  m: 30 },
    close:    { h: 16, m: 0  },
    preOpen:  { h: 4,  m: 0  },  // Pre-market starts 04:00 ET
    accent:   "arc",             // Color theme key
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a Date object representing the current time in a given IANA timezone. */
function nowIn(timezone) {
  return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
}

/** Returns formatted time string HH:MM:SS in 12-hour format. */
function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/** Returns formatted date string "Mon, DD MMM" */
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day:     "2-digit",
    month:   "short",
  });
}

/**
 * Calculates the session status of a market.
 * @returns {"open"|"pre"|"closed"} 
 */
function getSessionStatus(date, market) {
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  if (day === 0 || day === 6) return "closed"; // Weekend

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

/** Milliseconds until next state change (approx). */
function msUntilNextHour() {
  const now = new Date();
  return (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    open:   { label: "OPEN",   className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
    pre:    { label: "PRE",    className: "text-amber-400  bg-amber-400/10  border-amber-400/25"  },
    closed: { label: "CLOSED", className: "text-slate-500  bg-white/5       border-white/10"       },
  }[status];

  return (
    <span className={clsx("text-[10px] font-mono px-1.5 py-0.5 rounded border", cfg.className)}>
      {cfg.label}
    </span>
  );
}

// ── Accent color maps ─────────────────────────────────────────────────────────
const ACCENT_CARD = {
  arc:   "glass-card-arc",
  ember: "glass-card-ember",
  bull:  "glass-card-bull",
};

const ACCENT_TIME = {
  arc:   "text-[#00d4ff]",
  ember: "text-[#f59e0b]",
  bull:  "text-emerald-400",
};

// ── Clock card ────────────────────────────────────────────────────────────────
function ClockCard({ market, times }) {
  const localDate = times[market.id];
  if (!localDate) return null;

  const status  = getSessionStatus(localDate, market);
  const timeStr = formatTime(localDate);
  const dateStr = formatDate(localDate);

  return (
    <div className={clsx("p-4 flex flex-col gap-3", ACCENT_CARD[market.accent])}>
      {/* ── Top: flag + city + exchange ──────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{market.flag}</span>
          <div>
            <p className="text-white font-semibold text-sm leading-none">{market.city}</p>
            <p className="text-slate-500 text-[11px] mt-0.5">{market.exchange}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* ── Time display ─────────────────────────────────────────────── */}
      <div>
        <p className={clsx("font-mono font-bold text-2xl leading-none tracking-tight", ACCENT_TIME[market.accent])}>
          {timeStr.split(":").slice(0, 2).join(":")}
          <span className="text-slate-500 text-lg">
            :{timeStr.split(":")[2]}
          </span>
        </p>
        <p className="text-slate-600 font-mono text-xs mt-1">{dateStr}</p>
      </div>

      {/* ── Session progress bar (only when open or pre) ─────────────── */}
      {status !== "closed" && (
        <SessionBar date={localDate} market={market} status={status} accent={market.accent} />
      )}
    </div>
  );
}

// ── Session progress bar ──────────────────────────────────────────────────────
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
    arc:   "bg-[#00d4ff]",
    ember: "bg-[#f59e0b]",
    bull:  "bg-emerald-400",
  }[accent];

  return (
    <div className="space-y-1">
      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all duration-1000", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-slate-600 text-[10px] font-mono">
        {status === "pre" ? "Pre-market" : "Session"} · {pct.toFixed(1)}% elapsed
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TimeZones() {
  const [times, setTimes] = useState({});

  useEffect(() => {
    const tick = () => {
      const updated = {};
      MARKETS.forEach((m) => { updated[m.id] = nowIn(m.timezone); });
      setTimes(updated);
    };

    tick(); // Immediate first render
    const interval = setInterval(tick, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <Clock size={16} className="text-[#00d4ff]" />
        <h2 className="font-display text-2xl tracking-wider text-white">MARKET SESSIONS</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MARKETS.map((market, i) => (
          <div
            key={market.id}
            className="animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <ClockCard market={market} times={times} />
          </div>
        ))}
      </div>
    </section>
  );
}
