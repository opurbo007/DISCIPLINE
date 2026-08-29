import Head from "next/head";
import { useEffect, useState } from "react";
import {
  Bookmark,
  Clock3,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import Layout from "@/components/Layout";
import MarketPrices from "@/components/MarketPrices";
import TimeZones from "@/components/TimeZones";
import Bookmarks from "@/components/Bookmarks";
import AuthGuard from "@/components/Auth/AuthGuard";

function DashboardHeader() {
  return (
    <div className="flex flex-col gap-4 border-b border-white/5 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#22c55e] flex items-center gap-1.5">
          <Sparkles size={11} /> Command Center
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-wider text-white sm:text-5xl">
          Dashboard
        </h1>
        <p className="mt-2 text-slate-500 text-sm">
          Your markets, sessions and quick links at a glance.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href="#prices"
          className="inline-flex items-center gap-2 rounded-lg border border-[#22c55e]/25 bg-[rgba(34,197,94,0.08)] px-3 py-2 text-xs font-medium text-[#22c55e] transition-all hover:bg-[rgba(34,197,94,0.15)] hover:border-[#22c55e]/40"
        >
          <TrendingUp size={13} />
          Prices
          <ChevronRight size={11} className="opacity-60" />
        </a>
        <a
          href="#sessions"
          className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-[#22c55e]/40 hover:text-[#22c55e]"
        >
          <Clock3 size={13} />
          Sessions
          <ChevronRight size={11} className="opacity-60" />
        </a>
        <a
          href="#bookmarks"
          className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-[#22c55e]/40 hover:text-[#22c55e]"
        >
          <Bookmark size={13} />
          Links
          <ChevronRight size={11} className="opacity-60" />
        </a>
      </div>
    </div>
  );
}

function QuickStatsStrip() {
  const stats = [
    { label: "Markets", value: "Live", icon: Activity, color: "text-[#22c55e]" },
    { label: "Sessions", value: "3 Zones", icon: Clock3, color: "text-amber-400" },
    { label: "Quick Links", value: "Saved", icon: Bookmark, color: "text-slate-300" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="glass-card flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] border border-white/8 flex items-center justify-center shrink-0">
            <Icon size={13} className={color} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-slate-600">
              {label}
            </p>
            <p className={`font-mono font-bold text-xs sm:text-sm ${color} truncate`}>
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ id, icon: Icon, title, badge, action }) {
  return (
    <div
      id={id}
      className="flex items-center justify-between gap-2 mb-4 scroll-mt-24"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] flex items-center justify-center">
          <Icon size={14} className="text-[#22c55e]" />
        </div>
        <h2 className="font-display text-xl sm:text-2xl tracking-wider text-white">
          {title}
        </h2>
        {badge && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
            {badge}
          </span>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#22c55e] transition-colors font-mono"
        >
          {action.label}
          <ArrowUpRight size={11} />
        </Link>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <AuthGuard>
      <Head>
        <title>Dashboard | Trading Discipline</title>
      </Head>
      <Layout activePage="dashboard">
        <DashboardHeader />

        <div className="space-y-8">
          <QuickStatsStrip />

          <section className="scroll-mt-24">
            <SectionHeader
              id="prices"
              icon={TrendingUp}
              title="Market Prices"
              badge="Live"
            />
            <MarketPrices />
          </section>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
            <section className="scroll-mt-24 xl:sticky xl:top-20">
              <SectionHeader
                id="sessions"
                icon={Clock3}
                title="Market Sessions"
              />
              {mounted && <TimeZones compact />}
            </section>

            <section className="scroll-mt-24">
              <SectionHeader
                id="bookmarks"
                icon={Bookmark}
                title="Quick Access"
              />
              <Bookmarks />
            </section>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
