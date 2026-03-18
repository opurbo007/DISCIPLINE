/**
 * pages/login.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sign-in page. Uses NextAuth signIn() with the credentials provider.
 * On success, redirects to the callbackUrl (defaults to "/").
 */

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { BarChart2, Mail, Lock, LogIn, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const { callbackUrl, error: urlError } = router.query;

  const [form,       setForm]       = useState({ email: "", password: "" });
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  // If already authenticated, redirect away
  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl || "/");
  }, [status, router, callbackUrl]);

  // Map NextAuth error codes to friendly messages
  useEffect(() => {
    if (urlError === "CredentialsSignin") setError("Invalid email or password.");
  }, [urlError]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      email:    form.email,
      password: form.password,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else {
      router.replace(callbackUrl || "/");
    }
  };

  return (
    <>
      <Head><title>Sign In · Trading Discipline Dashboard</title></Head>

      {/* ── Full-screen dark background ───────────────────────────────── */}
      <div className="min-h-screen bg-[#04080f] flex items-center justify-center px-4 relative overflow-hidden">

        {/* Background glows */}
        <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
          style={{ background: "radial-gradient(ellipse, rgba(0,212,255,0.05) 0%, transparent 70%)" }} />
        <div className="pointer-events-none fixed inset-0 opacity-30"
          style={{
            backgroundImage: "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }} />

        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div className="relative z-10 w-full max-w-md animate-fade-up">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.04))",
                border: "1px solid rgba(0,212,255,0.3)",
                boxShadow: "0 0 40px rgba(0,212,255,0.12)",
              }}>
              <BarChart2 size={26} className="text-[#00d4ff]" />
            </div>
            <h1 className="font-display text-3xl tracking-widest text-white">TRADING DISCIPLINE</h1>
            <p className="text-slate-500 text-sm font-mono mt-1">Sign in to your dashboard</p>
          </div>

          {/* Form card */}
          <div className="glass-card-arc p-8 space-y-5">
            <h2 className="text-white font-semibold text-lg">Welcome back</h2>

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2.5">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-1.5 block">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="email"
                    className="glass-input pl-9"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={set("email")}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type={showPw ? "text" : "password"}
                    className="glass-input pl-9 pr-9"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set("password")}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 mt-2"
                style={{
                  background: loading
                    ? "rgba(0,212,255,0.1)"
                    : "linear-gradient(135deg, rgba(0,212,255,0.25), rgba(0,212,255,0.1))",
                  border: "1px solid rgba(0,212,255,0.3)",
                  color: "#00d4ff",
                  boxShadow: loading ? "none" : "0 0 20px rgba(0,212,255,0.1)",
                }}
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-slate-700 text-xs font-mono">OR</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-[#00d4ff] hover:text-[#00b8e6] font-medium transition-colors">
                Create one free
              </Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-slate-700 mt-6 font-mono">
            Trade with conviction, not emotion.
          </p>
        </div>
      </div>
    </>
  );
}
