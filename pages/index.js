import Head from "next/head";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import MarketPrices from "@/components/MarketPrices";
import TimeZones from "@/components/TimeZones";
import Bookmarks from "@/components/Bookmarks";
import Notes from "@/components/Notes";
import AuthGuard from "@/components/Auth/AuthGuard";

function Divider({ label }) {
  return (
    <div className="relative flex items-center gap-4">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {label && (
        <span className="text-[10px] font-mono text-slate-700 uppercase tracking-widest whitespace-nowrap">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <AuthGuard>
      <Head>
        <title>Dashboard · Trading Discipline</title>
      </Head>
      <Layout activePage="dashboard">
        <section id="prices">
          <MarketPrices />
        </section>
        <Divider />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" id="sessions">
          <div className="lg:col-span-2">{mounted && <TimeZones />}</div>
          <div className="lg:col-span-3">
            <Bookmarks />
          </div>
        </div>
        <Divider />
        <section id="notes">
          <Notes />
        </section>
      </Layout>
    </AuthGuard>
  );
}
