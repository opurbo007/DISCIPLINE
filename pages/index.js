import Head from "next/head";
import { useEffect, useState } from "react";
import { Bookmark, Clock3, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";
import MarketPrices from "@/components/MarketPrices";
import TimeZones from "@/components/TimeZones";
import Bookmarks from "@/components/Bookmarks";
import AuthGuard from "@/components/Auth/AuthGuard";

function DashboardHeader() {
  const shortcuts = [
    { href: "#prices", label: "Prices", icon: TrendingUp },
    { href: "#sessions", label: "Sessions", icon: Clock3 },
    { href: "#bookmarks", label: "Links", icon: Bookmark },
  ];

  return (
    <div className="flex flex-col gap-4 border-b border-white/5 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#00d4ff]">
          Command center
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-wider text-white sm:text-5xl">
          Dashboard
        </h1>
      </div>

      <nav className="flex flex-wrap gap-2">
        {shortcuts.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-[#00d4ff]/30 hover:text-[#00d4ff]"
          >
            <Icon size={13} />
            {label}
          </a>
        ))}
      </nav>
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
          <section id="prices" className="scroll-mt-24">
            <MarketPrices />
          </section>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
            <section id="sessions" className="scroll-mt-24 xl:sticky xl:top-20">
              {mounted && <TimeZones compact />}
            </section>

            <section id="bookmarks" className="scroll-mt-24">
              <Bookmarks />
            </section>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
