/**
 * pages/index.js
 * Modern overview dashboard.
 */

import Head from "next/head";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Layout from "@/components/Layout";
import MarketPrices from "@/components/MarketPrices";
import TimeZones from "@/components/TimeZones";
import Bookmarks from "@/components/Bookmarks";
import AuthGuard from "@/components/Auth/AuthGuard";
import { TrendingUp, Activity, Wallet, Target, ArrowUpRight, Sparkles } from "lucide-react";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DisciplineScore() {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-white">Discipline score</h3>
        <span className="w-7 h-7 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
          <Target size={13} className="text-emerald-300" />
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="num text-4xl font-bold text-white tracking-tight">87</span>
        <span className="num text-sm text-zinc-500 mb-1">/100</span>
        <span className="ml-auto pill text-emerald-300 bg-emerald-400/10 border border-emerald-400/20">
          <ArrowUpRight size={11} /> +3
        </span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300"
          style={{ width: "87%" }}
        />
      </div>
      <p className="mt-2.5 text-[12px] text-zinc-500">On track — keep following your plan.</p>
    </div>
  );
}

function QuickStatsRail() {
  const stats = [
    { label: "Win rate", value: "64%", sub: "last 30 trades", icon: TrendingUp, tint: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
    { label: "Active", value: "3", sub: "open positions", icon: Activity, tint: "text-sky-300 bg-sky-400/10 border-sky-400/20" },
    { label: "Open P&L", value: "+$1,247", sub: "unrealized", icon: Wallet, tint: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20" },
  ];
  return (
    <div className="border-t border-white/[0.06] divide-y divide-white/[0.05]">
      {stats.map((s) => (
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
        <section id="prices" className="scroll-mt-28 card overflow-hidden">
          <MarketPrices />
        </section>
      </Layout>
    </AuthGuard>
  );
}
