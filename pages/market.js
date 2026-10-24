/**
 * pages/market.js
 * Market Read — accurate market analysis dashboard.
 */

import Head from "next/head";
import Layout from "@/components/Layout";
import MarketRead from "@/components/MarketRead";
import AuthGuard from "@/components/Auth/AuthGuard";

export default function MarketPage() {
  return (
    <AuthGuard>
      <Head>
        <title>Market Read · Discipline</title>
      </Head>
      <Layout activePage="market">
        <MarketRead />
      </Layout>
    </AuthGuard>
  );
}
