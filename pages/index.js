import Head from "next/head";
import { useEffect, useState } from "react";
import {
  Bookmark,
  Clock3,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Activity,
} from "lucide-react";
import Link from "next/link";
import Layout from "@/components/Layout";
import MarketPrices from "@/components/MarketPrices";
import TimeZones from "@/components/TimeZones";
import Bookmarks from "@/components/Bookmarks";
import AuthGuard from "@/components/Auth/AuthGuard";
import clsx from "clsx";

function DashboardHeader() {
  return (
    <div className="flex flex-col gap-3 border-b border-white/5 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#009E60] flex items-center gap-1.5">
          <Sparkles size={11} /> Command Center
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wider text-white sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-1.5 text-slate-500 text-sm">
          Your markets, sessions and quick links at a glance.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <a
          href="#prices"
          className="inline-flex items-center gap-1.5 rounded-md border border-[#009E60]/25 bg-[rgba(0,158,96,0.08)] px-2.5 py-1.5 text-[11px] font-medium text-[#009E60] transition-all hover:bg-[rgba(0,158,96,0.15)] hover:border-[#009E60]/40"
        >
          <TrendingUp size={11} /> Prices
          <ChevronRight size={10} className="opacity-60" />
        </a>
        <a
          href="#sessions"
          className="inline-flex items-center gap-1.5 rounded-md border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:border-[#009E60]/40 hover:text-[#009E60]"
        >
          <Clock3 size={11} /> Sessions
          <ChevronRight size={10} className="opacity-60" />
        </a>
        <a
          href="#bookmarks"
          className="inline-flex items-center gap-1.5 rounded-md border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:border-[#009E60]/40 hover:text-[#009E60]"
        >
          <Bookmark size={11} /> Links
          <ChevronRight size={10} className="opacity-60" />
        </a>
      </div>
    </div>
  );
}

function QuickStatsStrip() {
  const stats = [
    { label: "Markets", value: "Live", icon: Activity, color: "text-[#009E60]" },
    { label: "Sessions", value: "3 Zones", icon: Clock3, color: "text-amber-400" },
    { label: "Quick Links", value: "Saved", icon: Bookmark, color: "text-slate-300" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="glass-card flex items-center gap-2.5 px-3 py-2"
        >
          <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/8 flex items-center justify-center shrink-0">
            <Icon size={12} className={color} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-mono uppercase tracking-wider text-slate-600">
              {label}
            </p>
            <p className={clsx("font-mono font-bold text-xs truncate", color)}>
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ id, icon: Icon, title, action }) {
  return (
    <div
      id={id}
      className="flex items-center justify-between gap-2 mb-3 scroll-mt-20"
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-[rgba(0,158,96,0.1)] border border-[rgba(0,158,96,0.2)] flex items-center justify-center">
          <Icon size={12} className="text-[#009E60]" />
        </div>
        <h2 className="font-display text-base tracking-wider text-white">
          {title}
        </h2>
      </div>
      {action}
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
        <div className="space-y-6">
          <DashboardHeader />
          <QuickStatsStrip />

          {/* ── Market Prices — full width hero ─────────────────── */}
          <section>
            <SectionHeader id="prices" icon={TrendingUp} title="Market Prices" />
            <MarketPrices compact />
          </section>

          {/* ── 2-column grid: Sessions | Bookmarks ────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="lg:col-span-4">
              <SectionHeader id="sessions" icon={Clock3} title="Market Sessions" />
              {mounted && <TimeZones compact />}
            </section>

            <section className="lg:col-span-8">
              <SectionHeader
                id="bookmarks"
                icon={Bookmark}
                title="Quick Access"
              />
              <Bookmarks compact />
            </section>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
