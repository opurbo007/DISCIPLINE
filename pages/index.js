/**
 * pages/index.js
 * Modern overview dashboard.
 */

import Head from "next/head";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Layout from "@/components/Layout";
import MarketPrices from "@/components/MarketPrices";
import FearGreed from "@/components/FearGreed";
import TimeZones from "@/components/TimeZones";
import TelegramCard from "@/components/Telegram/TelegramCard";
import Bookmarks from "@/components/Bookmarks";
import AuthGuard from "@/components/Auth/AuthGuard";
import { TrendingUp, TrendingDown, Activity, Wallet, Target, Sparkles } from "lucide-react";

const fmtMoney = (n) =>
  n == null
    ? "—"
    : `${n < 0 ? "-" : "+"}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DisciplineScore() {
  // Live score derived from closed-trade win rate — no placeholders.
  const { data } = useSWR("/api/journal/stats");
  const stats = data?.data;
  const hasData = stats && stats.totalTrades > 0;
  const score = hasData ? Math.round(stats.winRate) : 0;

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-white">Discipline score</h3>
        <span className="w-7 h-7 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
          <Target size={13} className="text-emerald-300" />
        </span>
      </div>
      {hasData ? (
        <>
          <div className="flex items-end gap-2">
            <span className="num text-4xl font-bold text-white tracking-tight">{score}</span>
            <span className="num text-sm text-zinc-500 mb-1">/100</span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all"
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="mt-2.5 text-[12px] text-zinc-500">
            {stats.wins}W / {stats.losses}L across {stats.totalTrades} closed trades
          </p>
        </>
      ) : (
        <p className="text-[12.5px] text-zinc-500 leading-relaxed">
          Close a trade in your journal and your score will appear here.
        </p>
      )}
    </div>
  );
}

function QuickStatsRail() {
  // Live data — updates the moment you add, close or delete a trade.
  const { data: tradesData } = useSWR("/api/journal");
  const { data: statsData } = useSWR("/api/journal/stats");
  const trades = tradesData?.data || [];
  const stats = statsData?.data;

  const openTrades = trades.filter((t) => t.status === "OPEN");
  const openPnl = openTrades.reduce((s, t) => s + (t.netPnl ?? 0), 0);
  const hasClosed = stats && stats.totalTrades > 0;

  const items = [
    {
      label: "Win rate",
      value: hasClosed ? `${stats.winRate}%` : "—",
      sub: hasClosed ? `${stats.wins}W / ${stats.losses}L` : "no closed trades",
      icon: hasClosed && stats.winRate >= 50 ? TrendingUp : TrendingDown,
      tint: hasClosed && stats.winRate >= 50
        ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/20"
        : "text-zinc-400 bg-white/[0.05] border-white/[0.07]",
    },
    {
      label: "Active",
      value: String(openTrades.length),
      sub: openTrades.length === 1 ? "open position" : "open positions",
      icon: Activity,
      tint: "text-sky-300 bg-sky-400/10 border-sky-400/20",
    },
    {
      label: "Open P&L",
      value: fmtMoney(openPnl),
      sub: "unrealized",
      icon: Wallet,
      tint: openPnl > 0
        ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/20"
        : openPnl < 0
          ? "text-red-300 bg-red-400/10 border-red-400/20"
          : "text-zinc-400 bg-white/[0.05] border-white/[0.07]",
    },
  ];
  return (
    <div className="border-t border-white/[0.06] divide-y divide-white/[0.05]">
      {items.map((s) => (
        <div key={s.label} className="flex items-center gap-3 p-4">
          <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${s.tint}`}>
            <s.icon size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] text-zinc-500 font-medium">{s.label}</p>
            <p className="num text-[15px] font-bold text-white leading-tight">{s.value}</p>
          </div>
          <span className="ml-auto text-[11px] text-zinc-600">{s.sub}</span>
        </div>
      ))}
    </div>
  );
}

function PageHeader({ name }) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="card p-6 sm:p-7 overflow-hidden">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-1">
            <Sparkles size={12} /> {today}
          </p>
          <h1 className="mt-3 text-[26px] sm:text-[30px] font-bold text-white tracking-tight leading-tight">
            {greeting()}{name ? `, ${name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-[13.5px] text-zinc-400 mt-1.5 max-w-xl leading-relaxed">
            Here&apos;s what&apos;s moving today. Stay patient, follow your setups, and log everything.
          </p>
        </div>
        <div className="sm:ml-auto flex sm:flex-col gap-2 shrink-0">
          <a href="#prices" className="btn-primary !py-2">View markets</a>
          <a href="#bookmarks" className="btn-secondary !py-2">Quick links</a>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();
  useEffect(() => setMounted(true), []);

  const sidebar = (
    <div>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <h2 className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wide">Sessions</h2>
        <span className="pill bg-white/[0.05] text-zinc-500 border border-white/[0.07]">3 markets</span>
      </div>
      {mounted && <TimeZones />}
      <p className="px-4 py-3 text-[11.5px] text-zinc-600 leading-relaxed border-t border-white/[0.06]">
        London &amp; New York overlap is usually the most volatile window.
      </p>
      <div className="border-t border-white/[0.06] px-2 py-1.5">
        <details>
          <summary className="cursor-pointer list-none px-2.5 py-2 rounded-xl text-[12px] font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors">
            Telegram bot <span className="text-zinc-600 font-normal">· tap to expand</span>
          </summary>
          <TelegramCard />
        </details>
      </div>
    </div>
  );

  const rightRail = (
    <div id="bookmarks" className="scroll-mt-28">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-[13px] font-semibold text-white">Performance</h2>
        <p className="text-[12px] text-zinc-500 mt-0.5">Your edge at a glance</p>
      </div>
      <DisciplineScore />
      <QuickStatsRail />
      <div className="px-5 py-4 border-y border-white/[0.06] bg-white/[0.015]">
        <h2 className="text-[13px] font-semibold text-white">Quick access</h2>
        <p className="text-[12px] text-zinc-500 mt-0.5">Favorite tools &amp; charts</p>
      </div>
      <Bookmarks />
    </div>
  );

  return (
    <AuthGuard>
      <Head>
        <title>Overview | Discipline</title>
      </Head>
      <Layout activePage="dashboard" sidebar={sidebar} rightRail={rightRail}>
        <PageHeader name={session?.user?.name} />
        <FearGreed />
        <section id="prices" className="scroll-mt-28 card overflow-hidden">
          <MarketPrices />
        </section>
      </Layout>
    </AuthGuard>
  );
}
