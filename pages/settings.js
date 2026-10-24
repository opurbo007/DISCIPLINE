/**
 * pages/settings.js
 * Settings page — Telegram section moved from portfolio sidebar.
 */

import Head from "next/head";
import Layout from "@/components/Layout";
import TelegramCard from "@/components/Telegram/TelegramCard";
import AuthGuard from "@/components/Auth/AuthGuard";
import { Settings, Send, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <Head>
        <title>Settings · Discipline</title>
      </Head>
      <Layout activePage="settings">
        <div className="space-y-5">
          <div className="card p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-600/20 border border-amber-400/20 flex items-center justify-center">
                <Settings size={16} className="text-amber-300" />
              </span>
              <div>
                <h1 className="text-[22px] font-bold text-white tracking-tight">Settings</h1>
                <p className="text-[13px] text-zinc-500">Account preferences and integrations</p>
              </div>
            </div>
          </div>

          {/* Telegram Section */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.015] flex items-center gap-2.5">
              <Send size={15} className="text-sky-300" />
              <h2 className="text-[13px] font-semibold text-white tracking-tight">Telegram Bot</h2>
            </div>
            <TelegramCard />
          </div>

          {/* Account info */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-600/20 border border-emerald-400/20 flex items-center justify-center">
                <ShieldCheck size={15} className="text-emerald-300" />
              </span>
              <div>
                <h3 className="text-[13px] font-semibold text-white">Account Security</h3>
                <p className="text-[11.5px] text-zinc-500">Your account is protected by session-based authentication.</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
