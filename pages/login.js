/**
 * pages/login.js — Modern sign-in.
 */

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { CandlestickChart, Mail, Lock, LogIn, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Zap, LineChart } from "lucide-react";

const PERKS = [
  { icon: LineChart, text: "Live prices across crypto, forex & indices" },
  { icon: ShieldCheck, text: "Journal & analytics to protect your edge" },
  { icon: Zap, text: "Portfolio tracking with instant P&L" },
];

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const { callbackUrl, error: urlError } = router.query;

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl || "/");
  }, [status, router, callbackUrl]);

  useEffect(() => {
    if (urlError === "CredentialsSignin") setError("Invalid email or password.");
  }, [urlError]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { redirect: false, email: form.email, password: form.password });
    setLoading(false);
    if (result?.error) setError("Invalid email or password. Please try again.");
    else router.replace(callbackUrl || "/");
  };

  return (
    <>
      <Head><title>Sign in · Discipline</title></Head>
      <div className="min-h-screen bg-[#07090d] flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-mesh-emerald" />
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-emerald-500/[0.09] blur-[100px] rounded-full" />

        <div className="relative z-10 w-full max-w-4xl grid md:grid-cols-2 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0e14]/90 backdrop-blur-xl shadow-pop animate-fade-up">
          {/* Left brand panel */}
          <div className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-emerald-500/[0.12] via-transparent to-indigo-500/[0.1] border-r border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-600 shadow-glow">
                <CandlestickChart size={19} className="text-[#04120c]" strokeWidth={2.5} />
              </div>
              <div className="leading-none">
                <p className="text-white text-[15px] font-bold tracking-tight">Discipline</p>
                <p className="text-[12px] text-zinc-500 mt-0.5">Trading terminal</p>
              </div>
            </div>
            <div className="space-y-5 my-8">
              <h2 className="text-[28px] font-bold text-white tracking-tight leading-[1.15]">
                Trade with conviction,<br />not emotion.
              </h2>
              <div className="space-y-3">
                {PERKS.map((p) => (
                  <div key={p.text} className="flex items-center gap-3 text-[13.5px] text-zinc-300">
                    <span className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <p.icon size={14} className="text-emerald-300" />
                    </span>
                    {p.text}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[12px] text-zinc-600">Join focused traders logging every setup.</p>
          </div>

          {/* Right form */}
          <div className="p-7 sm:p-9">
            <div className="md:hidden flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-600">
                <CandlestickChart size={17} className="text-[#04120c]" strokeWidth={2.5} />
              </div>
              <p className="text-white font-bold tracking-tight">Discipline</p>
            </div>
            <h1 className="text-[22px] font-bold text-white tracking-tight">Welcome back</h1>
            <p className="text-[13.5px] text-zinc-500 mt-1">Sign in to continue to your dashboard.</p>

            {error && (
              <div className="mt-5 flex items-center gap-2 text-red-200 text-[13px] bg-red-400/10 border border-red-400/20 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={15} className="shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="field-label">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input type="email" className="glass-input !pl-10" placeholder="you@example.com" value={form.email} onChange={set("email")} required autoComplete="email" />
                </div>
              </div>
              <div>
                <label className="field-label">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input type={showPw ? "text" : "password"} className="glass-input !pl-10 !pr-11" placeholder="••••••••" value={form.password} onChange={set("password")} required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <span className="text-zinc-600 text-[11px] font-medium uppercase tracking-wide">or</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            <p className="text-center text-[13.5px] text-zinc-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-emerald-300 hover:text-emerald-200 font-semibold transition-colors">Create one free</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
