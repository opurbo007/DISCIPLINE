/**
 * pages/index.js
 * Terminal dashboard. 3-zone: sidebar (sessions), main (prices), right rail (bookmarks + stats).
 */

import Head from "next/head";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import MarketPrices from "@/components/MarketPrices";
import TimeZones from "@/components/TimeZones";
import Bookmarks from "@/components/Bookmarks";
import AuthGuard from "@/components/Auth/AuthGuard";
import { TrendingUp, Activity, Zap, Target } from "lucide-react";
import clsx from "clsx";

// ── Right rail widgets ────────────────────────────────────────────────────────
function DisciplineScore() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Discipline Score
        </h3>
        <Target size={11} className="text-slate-600" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-3xl font-bold text-white tabular-nums">87</span>
        <span className="font-mono text-sm text-slate-500">/100</span>
      </div>
      <div className="mt-3 h-1 bg-white/5 overflow-hidden">
        <div className="h-full bg-[#009E60]" style={{ width: "87%" }} />
      </div>
      <p className="mt-2 font-mono text-[10px] text-slate-600 uppercase tracking-wider">
        +3 this week
      </p>
    </div>
  );
}

function QuickStatsRail() {
  const stats = [
    { label: "Win Rate",     value: "64%",   color: "text-[#009E60]", icon: TrendingUp },
    { label: "Active Trades", value: "3",     color: "text-white",     icon: Activity },
    { label: "Open P&L",     value: "+$1,247", color: "text-[#009E60]", icon: Zap },
  ];
  return (
    <div className="border-t border-white/10">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={`flex items-center justify-between p-4 ${i !== stats.length - 1 ? "border-b border-white/5" : ""}`}
        >
          <div className="flex items-center gap-2">
            <s.icon size={12} className="text-slate-600" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              {s.label}
            </span>
          </div>
          <span className={clsx("font-mono text-sm font-bold tabular-nums", s.color)}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────
function PageHeader() {
  return (
    <div className="px-6 py-5 border-b border-white/10 flex items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#009E60] animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#009E60]">
            Command Center
          </span>
        </div>
        <h1 className="font-mono text-2xl font-bold text-white tracking-tight">
          DASHBOARD
        </h1>
        <p className="font-mono text-[11px] text-slate-500 mt-1">
          Markets · Sessions · Quick Links
        </p>
      </div>
      <div className="flex items-center gap-2">
        <a
          href="#prices"
          className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-[#009E60] transition-colors px-2 py-1 border border-white/10 hover:border-[#009E60]/40"
        >
          Prices
        </a>
        <a
          href="#sessions"
          className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-[#009E60] transition-colors px-2 py-1 border border-white/10 hover:border-[#009E60]/40"
        >
          Sessions
        </a>
        <a
          href="#bookmarks"
          className="font-mono text-[10px] uppercase tracking-widest text-slate-500 hover:text-[#009E60] transition-colors px-2 py-1 border border-white/10 hover:border-[#009E60]/40"
        >
          Links
        </a>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sidebar = (
    <div>
      <div className="px-4 py-3 border-b border-white/10">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Sessions
        </h2>
      </div>
      {mounted && <TimeZones />}
    </div>
  );

  const rightRail = (
    <div>
      <div className="px-4 py-3 border-b border-white/10">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Performance
        </h2>
      </div>
      <DisciplineScore />
      <QuickStatsRail />
      <div className="px-4 py-3 border-y border-white/10">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Quick Access
        </h2>
      </div>
      <Bookmarks />
    </div>
  );

  return (
    <AuthGuard>
      <Head>
        <title>Dashboard | Trading Discipline</title>
      </Head>
      <Layout
        activePage="dashboard"
        sidebar={sidebar}
        rightRail={rightRail}
      >
        <PageHeader />
        <section id="prices" className="scroll-mt-12">
          <MarketPrices />
        </section>
      </Layout>
    </AuthGuard>
  );
}
