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

function fmtHM(t) {
  const h = String(t.h).padStart(2, "0");
  const m = String(t.m).padStart(2, "0");
  return `${h}:${m}`;
}

function fmtCountdown(totalMins) {
  if (totalMins < 0) totalMins = 0;
  const h = Math.floor(totalMins / 60);
  const m = Math.ceil(totalMins % 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// Minutes until the next regular-session open (skips weekends).
function minsUntilNextOpen(date, market) {
  const openMin = market.open.h * 60 + market.open.m;
  const nowMin = date.getHours() * 60 + date.getMinutes();
  // Later today (before open) and it's a weekday
  const day = date.getDay();
  const isWeekday = day !== 0 && day !== 6;
  if (isWeekday && nowMin < openMin) return openMin - nowMin;
  // Otherwise count forward to the next weekday open
  let mins = 24 * 60 - nowMin + openMin;
  let d = (day + 1) % 7;
  while (d === 0 || d === 6) {
    mins += 24 * 60;
    d = (d + 1) % 7;
  }
  return mins;
}

function nextOpenLabel(date) {
  const day = date.getDay();
  if (day === 5) return "Opens Mon"; // Friday after close
  if (day === 6) return "Opens Mon"; // Saturday
  if (day === 0) return "Opens Mon"; // Sunday
  return "Opens tomorrow";
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

// Full session info: status, 0-1 progress through the current phase,
// and a human-readable timeframe line.
function getSessionInfo(date, market) {
  const status = getSessionStatus(date, market);
  const nowMin = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const openMin = market.open.h * 60 + market.open.m;
  const closeMin = market.close.h * 60 + market.close.m;
  const preMin = market.preOpen.h * 60 + market.preOpen.m;
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;

  if (status === "open") {
    const progress = Math.min(1, Math.max(0, (nowMin - openMin) / (closeMin - openMin)));
    return {
      status,
      progress,
      detail: `Closes ${fmtHM(market.close)} · ${fmtCountdown(closeMin - nowMin)} left`,
    };
  }
  if (status === "pre") {
    const progress = Math.min(1, Math.max(0, (nowMin - preMin) / (openMin - preMin)));
    return {
      status,
      progress,
      detail: `Opens ${fmtHM(market.open)} · in ${fmtCountdown(openMin - nowMin)}`,
    };
  }
  // Closed — distinguish before-pre, after-close, and weekend
  if (isWeekend) {
    return { status, progress: 0, detail: `${nextOpenLabel(date)} ${fmtHM(market.open)}` };
  }
  if (nowMin < preMin) {
    return {
      status,
      progress: 0,
      detail: `Opens ${fmtHM(market.open)} · in ${fmtCountdown(openMin - nowMin)}`,
    };
  }
  const mins = minsUntilNextOpen(date, market);
  const label = nowMin >= closeMin ? nextOpenLabel(date) : "Opens";
  return {
    status,
    progress: 1,
    detail: `${label} ${fmtHM(market.open)} · in ${fmtCountdown(mins)}`,
  };
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
  const { status, progress, detail } = getSessionInfo(time, market);
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
        {/* ── Clear timeframe: session hours + countdown ── */}
        <p className="mt-1 text-[11px] font-mono text-zinc-500 tabular-nums">
          Session {fmtHM(market.open)} – {fmtHM(market.close)} local
        </p>
        <p className="mt-0.5 text-[11px] font-mono tabular-nums text-zinc-400">
          {detail}
        </p>
        {/* ── Session progress ── */}
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          title={detail}
        >
          <div
            className={clsx(
              "h-full rounded-full transition-all",
              status === "open"
                ? "bg-emerald-400"
                : status === "pre"
                  ? "bg-amber-400"
                  : "bg-zinc-600",
            )}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
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
