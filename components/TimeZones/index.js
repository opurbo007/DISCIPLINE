/**
 * components/TimeZones/index.js
 * Modern session cards.
 */

import { useEffect, useState } from "react";
import clsx from "clsx";

const MARKETS = [
  { id: "new-york", city: "New York", code: "NYC", timezone: "America/New_York", open: { h: 9, m: 30 }, close: { h: 16, m: 0 }, preOpen: { h: 4, m: 0 } },
  { id: "london", city: "London", code: "LDN", timezone: "Europe/London", open: { h: 8, m: 0 }, close: { h: 16, m: 30 }, preOpen: { h: 7, m: 0 } },
  { id: "tokyo", city: "Tokyo", code: "TKY", timezone: "Asia/Tokyo", open: { h: 9, m: 0 }, close: { h: 15, m: 30 }, preOpen: { h: 8, m: 0 } },
];

function nowIn(tz) {
  return new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
}

function getSessionStatus(date, market) {
  const day = date.getDay();
  if (day === 0 || day === 6) return "closed";
  const nowMin = date.getHours() * 60 + date.getMinutes();
  const openMin = market.open.h * 60 + market.open.m;
  const closeMin = market.close.h * 60 + market.close.m;
  const preMin = market.preOpen.h * 60 + market.preOpen.m;
  if (nowMin >= openMin && nowMin < closeMin) return "open";
  if (nowMin >= preMin && nowMin < openMin) return "pre";
  return "closed";
}

function SessionRow({ market, time }) {
  if (!time) {
    return (
      <div className="px-4 py-3.5 animate-pulse">
        <div className="h-3 w-24 bg-white/[0.06] rounded-md" />
        <div className="h-5 w-20 bg-white/[0.06] rounded-md mt-2" />
      </div>
    );
  }
  const status = getSessionStatus(time, market);
  const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  return (
    <div className="px-3 py-2">
      <div
        className={clsx(
          "rounded-xl border p-3 transition-colors",
          status === "open" ? "bg-emerald-400/[0.07] border-emerald-400/20" : "bg-white/[0.02] border-white/[0.06]"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex w-2 h-2">
              {status === "open" && <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />}
              <span
                className={clsx(
                  "relative inline-flex w-2 h-2 rounded-full",
                  status === "open" ? "bg-emerald-400" : status === "pre" ? "bg-amber-400" : "bg-zinc-600"
                )}
              />
            </span>
            <span className="text-[13px] font-bold text-white">{market.code}</span>
            <span className="text-[12px] text-zinc-500">{market.city}</span>
          </div>
          <span
            className={clsx(
              "pill border",
              status === "open" && "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
              status === "pre" && "text-amber-300 bg-amber-400/10 border-amber-400/20",
              status === "closed" && "text-zinc-500 bg-white/[0.04] border-white/[0.07]"
            )}
          >
            {status === "open" ? "Open" : status === "pre" ? "Pre-market" : "Closed"}
          </span>
        </div>
        <p className="num text-[19px] font-bold text-white mt-1.5 tracking-tight tabular-nums">{timeStr}</p>
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
    <div className="pb-1">
      {MARKETS.map((market) => (
        <SessionRow key={market.id} market={market} time={times[market.id]} />
      ))}
    </div>
  );
}
