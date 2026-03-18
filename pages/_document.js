/**
 * pages/_document.js
 * Custom Next.js document – sets up the HTML shell, meta tags, and preconnects.
 */

import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Character set & viewport are automatically injected by Next.js */}
        <meta charSet="utf-8" />

        {/* Preconnect to font and API domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Favicon */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>" />

        {/* SEO meta tags */}
        <meta name="description" content="A glassmorphic trading discipline dashboard with live market prices, notes, and bookmarks." />
        <meta property="og:title" content="Trading Discipline Dashboard" />
        <meta property="og:description" content="Live prices • Time zones • Bookmarks • Notes" />
        <meta name="theme-color" content="#080c14" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
