/**
 * pages/portfolio.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Protected portfolio page. Requires authentication — unauthenticated
 * users are redirected to /login by the AuthGuard component.
 */

import Head from "next/head";
import Layout from "@/components/Layout";
import Portfolio from "@/components/Portfolio";
import TelegramCard from "@/components/Telegram/TelegramCard";
import AuthGuard from "@/components/Auth/AuthGuard";

export default function PortfolioPage() {
  return (
    <AuthGuard>
      <Head>
        <title>Portfolio · Trading Discipline Dashboard</title>
      </Head>
      <Layout
        activePage="portfolio"
        sidebar={
          <div>
            <div className="px-4 pt-3 pb-2">
              <h2 className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wide">Telegram</h2>
            </div>
            <TelegramCard />
          </div>
        }
      >
        <Portfolio />
      </Layout>
    </AuthGuard>
  );
}
