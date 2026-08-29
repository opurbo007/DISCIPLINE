/**
 * components/Layout.js
 * Terminal / Bloomberg-inspired shell.
 *   - Sharp 1px borders instead of glass blur
 *   - Ticker tape across the top
 *   - 3-zone main: optional left rail (page sidebar), center, optional right rail
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import useSWR from "swr";
import {
  BarChart2,
  Wifi,
  WifiOff,
  LogIn,
  LogOut,
  Wallet,
  LayoutDashboard,
  ChevronDown as ChevronDownIcon,
  BookOpen,
  Activity,
} from "lucide-react";
import clsx from "clsx";

// ── Price formatter (terminal style) ──────────────────────────────────────────
function fmtPrice(price) {
  if (price >= 10000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 1000)  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1)     return price.toFixed(2);
  return price.toFixed(4);
}

// ── Ticker tape (Bloomberg top strip) ─────────────────────────────────────────
function TickerTape() {
  const { data } = useSWR("/api/prices", {
    refreshInterval: 120_000,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const markets = data?.markets || [];

  if (markets.length === 0) {
    return <div className="h-8 border-b border-white/10 bg-black" />;
  }

  // Triplicate for seamless infinite scroll
  const items = [...markets, ...markets, ...markets];

  return (
    <div className="relative h-8 border-b border-white/10 bg-black overflow-hidden">
      {/* Fade masks */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10"
           style={{ background: "linear-gradient(to right, #000, transparent)" }} />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10"
           style={{ background: "linear-gradient(to left, #000, transparent)" }} />

      <div className="ticker-inner absolute top-0 left-0 flex items-center h-full">
        {items.map((asset, i) => {
          const positive = asset.change24h > 0;
          const negative = asset.change24h < 0;
          return (
            <span key={`${asset.id}-${i}`} className="flex items-center h-full shrink-0">
              <span className="flex items-center gap-2 px-4">
                <span className="font-mono text-[11px] font-bold text-slate-400 tracking-wider">
                  {asset.symbol}
                </span>
                <span className="font-mono text-[11px] font-bold text-white tabular-nums">
                  {fmtPrice(asset.price)}
                </span>
                <span className={clsx(
                  "font-mono text-[10px] font-semibold tabular-nums",
                  positive && "text-emerald-400",
                  negative && "text-red-400",
                  !positive && !negative && "text-slate-500",
                )}>
                  {positive ? "▲" : negative ? "▼" : "•"} {Math.abs(asset.change24h).toFixed(2)}%
                </span>
              </span>
              <span className="w-px h-3 bg-white/10" />
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Top bar (terminal header) ─────────────────────────────────────────────────
function TopBar({ activePage }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [online, setOnline]     = useState(true);
  const [time, setTime]         = useState("");
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

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const navLinks = [
    { href: "/", label: "Dashboard", key: "dashboard" },
    { href: "/portfolio", label: "Portfolio", key: "portfolio" },
    { href: "/journal", label: "Journal", key: "journal" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur-sm">
      <div className="flex items-stretch h-12">
        {/* ── Brand block ─────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2.5 px-4 border-r border-white/10 shrink-0">
          <div className="w-7 h-7 rounded bg-[#009E60] flex items-center justify-center">
            <BarChart2 size={14} className="text-black" strokeWidth={2.5} />
          </div>
          <div className="hidden sm:block">
            <p className="font-mono text-white text-[11px] font-bold tracking-widest leading-none">
              TRADING DISCIPLINE
            </p>
            <p className="text-[9px] text-slate-500 font-mono leading-none mt-0.5 tracking-widest">
              TERMINAL v1.0
            </p>
          </div>
        </Link>

        {/* ── Nav tabs ───────────────────────────────────────────── */}
        <nav className="flex items-stretch">
          {navLinks.map(({ href, label, key }) => (
            <Link
              key={key}
              href={href}
              className={clsx(
                "flex items-center gap-1.5 px-4 border-r border-white/10 font-mono text-[11px] font-semibold tracking-widest uppercase transition-colors",
                activePage === key
                  ? "bg-[#009E60]/10 text-[#009E60]"
                  : "text-slate-500 hover:text-white hover:bg-white/5",
              )}
            >
              {key === "dashboard" && <LayoutDashboard size={12} />}
              {key === "portfolio" && <Wallet size={12} />}
              {key === "journal"   && <BookOpen size={12} />}
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Spacer ─────────────────────────────────────────────── */}
        <div className="flex-1" />

        {/* ── Right cluster ──────────────────────────────────────── */}
        <div className="flex items-stretch">
          {/* Clock */}
          {time && (
            <div className="hidden md:flex items-center px-4 border-l border-white/10">
              <span className="font-mono text-[11px] text-slate-400 tabular-nums tracking-wider">
                {time}
              </span>
            </div>
          )}

          {/* Network status */}
          <div className={clsx(
            "hidden sm:flex items-center gap-1.5 px-3 border-l border-white/10 font-mono text-[10px] uppercase tracking-widest",
            online ? "text-emerald-400" : "text-red-400",
          )}>
            {online ? <Wifi size={11} /> : <WifiOff size={11} />}
            <span>{online ? "Online" : "Offline"}</span>
          </div>

          {/* Auth */}
          <div className="flex items-stretch border-l border-white/10">
            {status === "loading" ? (
              <div className="w-12" />
            ) : session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 h-full hover:bg-white/5 transition-colors"
                >
                  <div className="w-6 h-6 rounded bg-[#009E60]/20 border border-[#009E60]/40 flex items-center justify-center text-[10px] font-bold text-[#009E60] font-mono">
                    {session.user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="hidden md:block text-[11px] font-mono text-slate-300 max-w-[100px] truncate">
                    {session.user.name}
                  </span>
                  <ChevronDownIcon size={10} className={clsx(
                    "text-slate-500 transition-transform",
                    userMenuOpen && "rotate-180",
                  )} />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full w-56 bg-black border border-white/10 z-20 animate-fade-up">
                      <div className="px-3 py-2 border-b border-white/10">
                        <p className="text-white text-xs font-mono font-semibold truncate">{session.user.name}</p>
                        <p className="text-slate-500 text-[10px] font-mono truncate">{session.user.email}</p>
                      </div>
                      <div className="py-1">
                        {navLinks.map(({ href, label, key }) => (
                          <Link
                            key={key}
                            href={href}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono text-slate-400 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-widest"
                          >
                            {key === "portfolio" ? <Wallet size={11} /> : key === "journal" ? <BookOpen size={11} /> : <LayoutDashboard size={11} />}
                            {label}
                          </Link>
                        ))}
                      </div>
                      <div className="border-t border-white/10 py-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors uppercase tracking-widest"
                        >
                          <LogOut size={11} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 text-[11px] font-mono text-[#009E60] uppercase tracking-widest font-semibold hover:bg-[#009E60]/10 transition-colors"
              >
                <LogIn size={11} />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Ticker tape ─────────────────────────────────────────── */}
      <TickerTape />
    </header>
  );
}

// ── Background (subtle grid, no glows) ────────────────────────────────────────
function BackgroundDecor() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────────
export default function Layout({ children, activePage, sidebar, rightRail }) {
  return (
    <div className="relative min-h-screen bg-black text-slate-200 overflow-x-hidden">
      <BackgroundDecor />

      <div className="relative z-10 flex flex-col min-h-screen">
        <TopBar activePage={activePage} />

        <main className="flex-1 w-full max-w-[1600px] mx-auto">
          <div className={clsx(
            "grid",
            sidebar || rightRail ? "grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]" : "grid-cols-1",
            rightRail && "xl:grid-cols-[260px_minmax(0,1fr)_280px]",
          )}>
            {sidebar && (
              <aside className="bg-black border-r border-white/10">
                {sidebar}
              </aside>
            )}

            <div className="bg-black min-w-0 border-r border-white/10">
              {children}
            </div>

            {rightRail && (
              <aside className="hidden xl:block bg-black">
                {rightRail}
              </aside>
            )}
          </div>
        </main>

        <footer className="border-t border-white/10 py-2 px-4 flex items-center justify-between">
          <p className="text-[10px] text-slate-600 font-mono tracking-wider uppercase">
            Trading Discipline Terminal · Next.js + MongoDB
          </p>
          <p className="text-[10px] text-slate-700 font-mono tracking-wider uppercase">
            Trade with conviction, not emotion.
          </p>
        </footer>
      </div>
    </div>
  );
}
