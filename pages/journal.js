/**
 * pages/journal.js
 * Protected trade journal page.
 */
import Head from "next/head";
import Layout from "@/components/Layout";
import Journal from "@/components/Journal";
import AuthGuard from "@/components/Auth/AuthGuard";

export default function JournalPage() {
  return (
    <AuthGuard>
      <Head>
        <title>Trade Journal · Trading Discipline Dashboard</title>
      </Head>
      <Layout activePage="journal">
        <Journal />
      </Layout>
    </AuthGuard>
  );
}
