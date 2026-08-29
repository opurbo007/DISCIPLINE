/**
 * components/TimeZones/index.js
 * Sidebar list of trading sessions. Compact rows with live status dot + time.
 */

import { useEffect, useState } from "react";
import clsx from "clsx";

const MARKETS = [
  {
    id:       "new-york",
    city:     "New York",
    code:     "NYC",
    timezone: "America/New_York",
    flag:     "US",
    open:     { h: 9,  m: 30 },
    close:    { h: 16, m: 0  },
    preOpen:  { h: 4,  m: 0  },
  },
  {
    id:       "london",
    city:     "London",
    code:     "LDN",
    timezone: "Europe/London",
    flag:     "UK",
    open:     { h: 8,  m: 0  },
    close:    { h: 16, m: 30 },
    preOpen:  { h: 7,  m: 0  },
  },
  {
    id:       "tokyo",
    city:     "Tokyo",
    code:     "TKY",
    timezone: "Asia/Tokyo",
    flag:     "JP",
    open:     { h: 9,  m: 0  },
    close:    { h: 15, m: 30 },
    preOpen:  { h: 8,  m: 0  },
  },
];

function nowIn(tz) {
  return new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
}

function getSessionStatus(date, market) {
  const day = date.getDay();
  if (day === 0 || day === 6) return "closed";
  const nowMin = date.getHours() * 60 + date.getMinutes();
  const openMin  = market.open.h  * 60 + market.open.m;
  const closeMin = market.close.h * 60 + market.close.m;
  const preMin   = market.preOpen.h * 60 + market.preOpen.m;
  if (nowMin >= openMin && nowMin < closeMin) return "open";
  if (nowMin >= preMin  && nowMin < openMin)  return "pre";
  return "closed";
}

function getNextChange(date, market) {
  const nowMin = date.getHours() * 60 + date.getMinutes();
  const openMin  = market.open.h  * 60 + market.open.m;
  const closeMin = market.close.h * 60 + market.close.m;
  const preMin   = market.preOpen.h * 60 + market.preOpen.m;
  if (nowMin < preMin)   return { to: "pre",   at: preMin };
  if (nowMin < openMin)  return { to: "open",  at: openMin };
  if (nowMin < closeMin) return { to: "close", at: closeMin };
  return null;
}

function fmtTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZone: undefined,
  });
}

function SessionRow({ market, time }) {
  if (!time) {
    return (
      <div className="px-4 py-3 border-b border-white/5 animate-pulse">
        <div className="h-3 w-20 bg-white/5 rounded" />
        <div className="h-2 w-12 bg-white/5 rounded mt-2" />
      </div>
    );
  }

  const status = getSessionStatus(time, market);
  const next = getNextChange(time, market);
  const timeStr = fmtTime(time);

  const statusColor = {
    open:   "bg-[#009E60]",
    pre:    "bg-amber-400",
    closed: "bg-slate-600",
  }[status];

  const statusLabel = {
    open:   "Open",
    pre:    "Pre",
    closed: "Closed",
  }[status];

  return (
    <div className="px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={clsx("w-1.5 h-1.5 rounded-full", statusColor, status === "open" && "animate-pulse")} />
          <span className="font-mono text-[11px] font-bold text-white tracking-wider">
            {market.code}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600">
            {market.city}
          </span>
        </div>
        <span className={clsx(
          "font-mono text-[9px] uppercase tracking-widest font-semibold",
          status === "open"   && "text-[#009E60]",
          status === "pre"    && "text-amber-400",
          status === "closed" && "text-slate-600",
        )}>
          {statusLabel}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <span className="font-mono text-base font-bold text-white tabular-nums leading-none">
          {timeStr.slice(0, 5)}
          <span className="text-slate-500 text-sm">:{timeStr.slice(5)}</span>
        </span>
        {next && status !== "closed" && (
          <span className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">
            → {next.to === "open" ? "Open" : next.to === "close" ? "Close" : "Pre"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TimeZones() {
  const [times, setTimes] = useState({});

  useEffect(() => {
    const tick = () => {
      const updated = {};
      MARKETS.forEach((m) => { updated[m.id] = nowIn(m.timezone); });
      setTimes(updated);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      {MARKETS.map((market) => (
        <SessionRow key={market.id} market={market} time={times[market.id]} />
      ))}
    </div>
  );
}
