/**
 * pages/_app.js
 * Root wrapper for every Next.js page.
 * Injects global CSS and sets up the SWR global config.
 */

import "@/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";

/**
 * Default SWR fetcher – wraps fetch and parses JSON.
 * Throws on non-OK responses so SWR treats them as errors.
 */
const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error("API request failed");
    err.status = res.status;
    throw err;
  }
  return res.json();
};

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    // SessionProvider makes useSession() available in every component
    <SessionProvider session={session}>
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: false,
          dedupingInterval: 60_000,
          errorRetryCount: 3,
        }}
      >
        <Component {...pageProps} />
      </SWRConfig>
    </SessionProvider>
  );
}
