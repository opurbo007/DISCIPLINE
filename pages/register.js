/**
 * pages/register.js — Modern registration.
 */

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { CandlestickChart, User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";

function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: "8+ chars", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["bg-red-400", "bg-amber-400", "bg-emerald-400"];
  return (
    <div className="space-y-1.5 mt-2.5">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : "bg-white/[0.07]"}`} />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map((c) => (
          <span key={c.label} className={`text-[11px] flex items-center gap-1 ${c.ok ? "text-emerald-300" : "text-zinc-600"}`}>
            <CheckCircle2 size={10} /> {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => { if (status === "authenticated") router.replace("/"); }, [status, router]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); setLoading(false); return; }
      setSuccess(true);
      await signIn("credentials", { redirect: false, email: form.email, password: form.password });
      router.replace("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Create account · Discipline</title></Head>
      <div className="min-h-screen bg-[#07090d] flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-mesh-emerald" />
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-emerald-500/[0.09] blur-[100px] rounded-full" />
        <div className="relative z-10 w-full max-w-md card p-7 sm:p-8 animate-fade-up">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-600 shadow-glow">
              <CandlestickChart size={19} className="text-[#04120c]" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <p className="text-white text-[15px] font-bold tracking-tight">Discipline</p>
              <p className="text-[12px] text-zinc-500 mt-0.5">Start trading with clarity</p>
            </div>
          </div>

          <h1 className="text-[22px] font-bold text-white tracking-tight">Create your account</h1>
          <p className="text-[13.5px] text-zinc-500 mt-1">Free forever for focused traders.</p>

          {error && (
            <div className="mt-5 flex items-center gap-2 text-red-200 text-[13px] bg-red-400/10 border border-red-400/20 rounded-xl px-3.5 py-2.5">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="mt-5 flex items-center gap-2 text-emerald-200 text-[13px] bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-3.5 py-2.5">
              <CheckCircle2 size={15} className="shrink-0" /> Account created! Signing you in…
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="field-label">Display name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input type="text" className="glass-input !pl-10" placeholder="Alex Trader" value={form.name} onChange={set("name")} required autoComplete="name" />
              </div>
            </div>
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
                <input type={showPw ? "text" : "password"} className="glass-input !pl-10 !pr-11" placeholder="Min 8 characters" value={form.password} onChange={set("password")} required />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>
            <div>
              <label className="field-label">Confirm password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input type={showPw ? "text" : "password"} className="glass-input !pl-10" placeholder="Repeat password" value={form.confirm} onChange={set("confirm")} required />
              </div>
            </div>
            <button type="submit" disabled={loading || success} className="btn-primary w-full !py-3 disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-[13.5px] text-zinc-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-300 hover:text-emerald-200 font-semibold transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
