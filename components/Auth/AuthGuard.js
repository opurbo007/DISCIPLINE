/**
 * components/Auth/AuthGuard.js
 * Client-side route guard.
 */

import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(router.asPath)}`);
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#07090d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center animate-pulse">
            <Loader2 size={22} className="text-[#04120c] animate-spin" />
          </div>
          <p className="text-zinc-500 text-[13px] font-medium">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;
  return children;
}
