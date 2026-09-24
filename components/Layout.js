/**
 * components/Layout.js
 * Modern app shell — soft dark fintech theme, pill nav, glass header.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import useSWR from "swr";
import {
  CandlestickChart,
  Wifi,
  WifiOff,
  LogIn,
  LogOut,
  Wallet,
  LayoutDashboard,
  ChevronDown as ChevronDownIcon,
  BookOpen,
  Search,
} from "lucide-react";
import clsx from "clsx";

function fmtPrice(price) {
  if (price == null) return "—";
  if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function TickerTape() {
  const { data } = useSWR("/api/prices", {
    refreshInterval: 120_000,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const markets = data?.markets || [];
  if (markets.length === 0) return null;

  const items = [...markets, ...markets, ...markets];

  return (
    <div className="relative overflow-hidden border-t border-white/[0.06] bg-black/40">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#0b0e14] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#0b0e14] to-transparent" />
      <div className="ticker-inner flex items-center h-9 w-max">
        {items.map((asset, i) => {
          const positive = asset.change24h > 0;
          const negative = asset.change24h < 0;
          return (
            <span key={`${asset.id}-${i}`} className="flex items-center shrink-0">
              <span className="flex items-center gap-2 px-4">
                <span className="text-[11px] font-bold text-zinc-400 tracking-wide">{asset.symbol}</span>
                <span className="num text-[12px] font-semibold text-white">{fmtPrice(asset.price)}</span>
                <span
                  className={clsx(
                    "num text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
                    positive && "text-emerald-300 bg-emerald-400/10",
                    negative && "text-red-300 bg-red-400/10",
                    !positive && !negative && "text-zinc-500 bg-white/5"
                  )}
                >
                  {positive ? "+" : ""}{asset.change24h.toFixed(2)}%
                </span>
              </span>
              <span className="w-px h-3.5 bg-white/10" />
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TopBar({ activePage }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const navLinks = [
    { href: "/", label: "Overview", key: "dashboard", icon: LayoutDashboard },
    { href: "/portfolio", label: "Portfolio", key: "portfolio", icon: Wallet },
    { href: "/journal", label: "Journal", key: "journal", icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#07090d]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="flex h-16 items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-600 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.6)] group-hover:scale-105 transition-transform">
              <CandlestickChart size={17} className="text-[#04120c]" strokeWidth={2.5} />
            </div>
            <div className="hidden sm:block leading-none">
              <p className="text-white text-[13.5px] font-bold tracking-tight">Discipline</p>
              <p className="text-[11px] text-zinc-500 font-medium mt-0.5">Trading terminal</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-4 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
            {navLinks.map(({ href, label, key, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium transition-all",
                  activePage === key
                    ? "bg-white text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                )}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </nav>

          {/* Mobile nav */}
          <nav className="flex md:hidden items-center gap-1 ml-1">
            {navLinks.map(({ href, key, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                className={clsx(
                  "p-2 rounded-xl transition-colors",
                  activePage === key ? "bg-white text-zinc-950" : "text-zinc-500 hover:text-white bg-white/[0.04]"
                )}
              >
                <Icon size={16} />
              </Link>
            ))}
          </nav>

          <div className="flex-1" />

          <div
            className={clsx(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border",
              online
                ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/15"
                : "text-red-300 bg-red-400/10 border-red-400/15"
            )}
          >
            <span className={clsx("w-1.5 h-1.5 rounded-full", online ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
            {online ? "Live" : "Offline"}
          </div>

          <div className="flex items-center">
            {status === "loading" ? (
              <div className="w-9 h-9 rounded-full shimmer-bg" />
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/15 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-300 to-teal-600 flex items-center justify-center text-[12px] font-bold text-[#04120c]">
                    {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="hidden lg:block text-[13px] font-medium text-zinc-200 max-w-[110px] truncate">
                    {session.user.name}
                  </span>
                  <ChevronDownIcon
                    size={13}
                    className={clsx("text-zinc-500 transition-transform", userMenuOpen && "rotate-180")}
                  />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-2xl bg-[#10141d] border border-white/10 shadow-pop z-20 overflow-hidden animate-fade-up">
                      <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                        <p className="text-white text-[13px] font-semibold truncate">{session.user.name}</p>
                        <p className="text-zinc-500 text-[12px] truncate">{session.user.email}</p>
                      </div>
                      <div className="p-1.5">
                        {navLinks.map(({ href, label, icon: Icon }) => (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                          >
                            <Icon size={14} />
                            {label}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-white/[0.06] p-1.5">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-red-300 hover:bg-red-400/10 transition-colors"
                        >
                          <LogOut size={14} />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-zinc-950 text-[13px] font-semibold hover:bg-zinc-200 transition-colors"
              >
                <LogIn size={14} />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
      <TickerTape />
    </header>
  );
}

function BackgroundDecor() {
  return (
    <div className="pointer-events-none fixed inset-0" aria-hidden>
      <div className="absolute inset-0 bg-mesh-emerald opacity-70" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />
    </div>
  );
}

export default function Layout({ children, activePage, sidebar, rightRail }) {
  const hasSide = sidebar || rightRail;
  return (
    <div className="relative min-h-screen bg-[#07090d] text-zinc-200">
      <BackgroundDecor />
      <div className="relative z-10 flex flex-col min-h-screen">
        <TopBar activePage={activePage} />
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          {hasSide ? (
            <div
              className={clsx(
                "grid gap-5 items-start",
                rightRail ? "grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_300px]" : "grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)]"
              )}
            >
              {sidebar && (
                <aside className="card p-2 lg:sticky lg:top-28 overflow-hidden">
                  {sidebar}
                </aside>
              )}
              <div className="min-w-0 space-y-5">{children}</div>
              {rightRail && (
                <aside className="card overflow-hidden xl:sticky xl:top-28">
                  {rightRail}
                </aside>
              )}
            </div>
          ) : (
            <div className="min-w-0 space-y-5">{children}</div>
          )}
        </main>
        <footer className="border-t border-white/[0.06] bg-black/30 backdrop-blur">
          <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[12px] text-zinc-600 font-medium">
              Discipline — trade with conviction, not emotion.
            </p>
            <p className="text-[12px] text-zinc-700">
              Next.js · MongoDB · Live market data
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
