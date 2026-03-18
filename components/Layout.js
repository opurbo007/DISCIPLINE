import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
// import useSWR from "swr";
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
} from "lucide-react";
import clsx from "clsx";

// ── Price formatter ───────────────────────────────────────────────────────────
// function fmtPrice(price) {
//   if (price >= 10000)
//     return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
//   if (price >= 1000)
//     return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//   if (price >= 1) return `$${price.toFixed(2)}`;
//   return `$${price.toFixed(4)}`;
// }

// ── Ticker tape ───────────────────────────────────────────────────────────────
// function TickerTape() {
//   // Use the same SWR key as MarketPrices — Next.js/SWR deduplicates this,
//   // so there is only ONE /api/prices request shared between the ticker and
//   // the price grid, no matter how many components use this hook.
//   const { data } = useSWR("/api/prices", {
//     refreshInterval:      120_000, // 2 min — matches MarketPrices component
//     revalidateOnFocus:    false,
//     revalidateOnReconnect: false,
//   });
//   const markets = data?.markets || [];

//   if (markets.length === 0) return (
//     <div className="h-9 border-b border-white/5 bg-black/50 backdrop-blur-sm" />
//   );

//   // Triplicate for a seamless infinite loop with no gap
//   const items = [...markets, ...markets, ...markets];

//   return (
//     <div
//       className="relative overflow-hidden border-b border-white/[0.06] bg-black/50 backdrop-blur-sm"
//       style={{ height: "36px" }}
//     >
//       {/* ── Left fade mask ───────────────────────────────────────────── */}
//       <div
//         className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10"
//         style={{ background: "linear-gradient(to right, rgba(4,8,15,0.95), transparent)" }}
//       />
//       {/* ── Right fade mask ──────────────────────────────────────────── */}
//       <div
//         className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10"
//         style={{ background: "linear-gradient(to left, rgba(4,8,15,0.95), transparent)" }}
//       />

//       {/* ── Scrolling strip ──────────────────────────────────────────── */}
//       <div
//         className="ticker-inner absolute top-0 left-0 flex items-center h-full gap-0"
//         style={{ willChange: "transform" }}
//       >
//         {items.map((asset, i) => {
//           const positive = asset.change24h > 0;
//           const negative = asset.change24h < 0;

//           return (
//             <span
//               key={`${asset.id}-${i}`}
//               className="flex items-center shrink-0 h-full"
//             >
//               {/* ── Asset pill ───────────────────────────────────────── */}
//               <span className="flex items-center gap-2.5 px-5">
//                 {/* Symbol */}
//                 <span className="font-mono text-[11px] font-bold tracking-widest text-slate-400 uppercase">
//                   {asset.symbol}
//                 </span>

//                 {/* Price */}
//                 <span className="font-mono text-[12px] font-bold text-white tabular-nums">
//                   {fmtPrice(asset.price)}
//                 </span>

//                 {/* Change badge */}
//                 <span
//                   className={clsx(
//                     "inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold",
//                     "px-1.5 py-0.5 rounded",
//                     positive && "text-emerald-400 bg-emerald-400/10",
//                     negative && "text-red-400 bg-red-400/10",
//                     !positive && !negative && "text-slate-600 bg-white/5"
//                   )}
//                 >
//                   {positive ? "+" : ""}{asset.change24h.toFixed(2)}%
//                 </span>
//               </span>

//               {/* ── Vertical separator ───────────────────────────────── */}
//               <span
//                 className="shrink-0 w-px h-3.5 rounded-full"
//                 style={{ background: "rgba(255,255,255,0.07)" }}
//               />
//             </span>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// ── Navigation bar ────────────────────────────────────────────────────────────
function Navbar({ activePage }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [time, setTime] = useState("");
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
          timeZoneName: "short",
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
    <header className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* ── Left: branding + nav ─────────────────────────────────── */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.05))",
                border: "1px solid rgba(0,212,255,0.3)",
                boxShadow: "0 0 12px rgba(0,212,255,0.15)",
              }}
            >
              <BarChart2 size={15} className="text-[#00d4ff]" />
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-white text-lg tracking-widest leading-none">
                TRADING DISCIPLINE
              </p>
              <p className="text-[10px] text-slate-600 font-mono leading-none mt-0.5 tracking-wider">
                DASHBOARD
              </p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map(({ href, label, key }) => (
              <Link
                key={key}
                href={href}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                  activePage === key
                    ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)]"
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/5",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* ── Right: clock + status + user ────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Clock */}
          {time && (
            <span className="hidden lg:block font-mono text-sm text-slate-500 tabular-nums">
              {time}
            </span>
          )}

          {/* Network */}
          <div
            className={clsx(
              "hidden sm:flex items-center gap-1.5 text-xs font-mono",
              online ? "text-emerald-600" : "text-red-400",
            )}
          >
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          </div>

          {/* Auth section */}
          {status === "loading" ? (
            <div className="w-8 h-8 rounded-full shimmer-bg" />
          ) : session ? (
            /* ── User menu ────────────────────────────────────────── */
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className={clsx(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200",
                  userMenuOpen
                    ? "border-[rgba(0,212,255,0.3)] bg-[rgba(0,212,255,0.08)]"
                    : "border-white/8 hover:border-white/15 hover:bg-white/5",
                )}
              >
                {/* Avatar initial */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-[#00d4ff] shrink-0"
                  style={{
                    background: "rgba(0,212,255,0.15)",
                    border: "1px solid rgba(0,212,255,0.25)",
                  }}
                >
                  {session.user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="hidden sm:block text-sm text-slate-300 max-w-[100px] truncate">
                  {session.user.name}
                </span>
                <ChevronDownIcon
                  size={12}
                  className={clsx(
                    "text-slate-500 transition-transform",
                    userMenuOpen && "rotate-180",
                  )}
                />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-full mt-2 w-52 z-20 rounded-xl border border-white/8 overflow-hidden animate-fade-up"
                    style={{
                      background: "rgba(10,14,22,0.95)",
                      backdropFilter: "blur(20px)",
                      boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                    }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-white text-sm font-semibold truncate">
                        {session.user.name}
                      </p>
                      <p className="text-slate-600 text-xs truncate">
                        {session.user.email}
                      </p>
                    </div>

                    {/* Links */}
                    <div className="py-1">
                      {navLinks.map(({ href, label, key }) => (
                        <Link
                          key={key}
                          href={href}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          {key === "portfolio" ? (
                            <Wallet size={13} />
                          ) : key === "journal" ? (
                            <BookOpen size={13} />
                          ) : (
                            <LayoutDashboard size={13} />
                          )}
                          {label}
                        </Link>
                      ))}
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-white/5 py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/8 transition-colors"
                      >
                        <LogOut size={13} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ── Guest: sign in button ───────────────────────────── */
            <Link href="/login" className="btn-arc text-xs py-1.5 px-3">
              <LogIn size={12} /> Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Decorative background gradients ──────────────────────────────────────────
function BackgroundDecor() {
  return (
    <>
      {/* Top-left arc glow */}
      <div
        className="pointer-events-none fixed top-0 left-0 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)",
        }}
      />
      {/* Bottom-right ember glow */}
      <div
        className="pointer-events-none fixed bottom-0 right-0 w-[800px] h-[800px] translate-x-1/4 translate-y-1/4"
        style={{
          background:
            "radial-gradient(circle, rgba(245,158,11,0.03) 0%, transparent 70%)",
        }}
      />
      {/* Center dim radial */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.02) 0%, transparent 60%)",
        }}
      />
      {/* Grid overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Vignette */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(4,8,15,0.6) 100%)",
        }}
      />
    </>
  );
}

// ── Main Layout export ────────────────────────────────────────────────────────
export default function Layout({ children, activePage }) {
  return (
    <div className="relative min-h-screen bg-[#04080f] overflow-x-hidden">
      {/* Background decorations */}
      <BackgroundDecor />

      {/* Content stack */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar activePage={activePage} />

        <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-20 space-y-10">
          {children}
        </main>

        <footer className="border-t border-white/5 py-4 text-center">
          <p className="text-[11px] text-slate-700 font-mono">
            TRADING DISCIPLINE DASHBOARD · Built with Next.js + MongoDB ·{" "}
            <span className="text-slate-600">
              Trade with conviction, not emotion.
            </span>
          </p>
        </footer>
      </div>
    </div>
  );
}
