/**
 * components/Auth/AuthGuard.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side route guard. Wraps any page that requires authentication.
 * Redirects to /login if the session is absent.
 *
 * Usage:
 *   export default function ProtectedPage() {
 *     return <AuthGuard><YourComponent /></AuthGuard>;
 *   }
 */

import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(router.asPath)}`);
    }
  }, [status, router]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#04080f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="text-[#00d4ff] animate-spin" />
          <p className="text-slate-500 font-mono text-sm">Verifying session…</p>
        </div>
      </div>
    );
  }

  // ── Unauthenticated: render nothing while redirect fires ──────────────────
  if (status === "unauthenticated") return null;

  // ── Authenticated ─────────────────────────────────────────────────────────
  return children;
}
