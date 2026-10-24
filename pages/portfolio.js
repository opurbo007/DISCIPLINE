/**
 * pages/portfolio.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Protected portfolio page. Requires authentication — unauthenticated
 * users are redirected to /login by the AuthGuard component.
 */

import Head from "next/head";
import Layout from "@/components/Layout";
import Portfolio from "@/components/Portfolio";
import AuthGuard from "@/components/Auth/AuthGuard";

export default function PortfolioPage() {
  return (
    <AuthGuard>
      <Head>
        <title>Portfolio · Trading Discipline Dashboard</title>
      </Head>
      <Layout activePage="portfolio">
        <Portfolio />
      </Layout>
    </AuthGuard>
  );
}
