/**
 * pages/register.js
 * ─────────────────────────────────────────────────────────────────────────────
 * New account registration page.
 * On success, auto-signs the user in and redirects to the dashboard.
 */

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { BarChart2, User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";

// ── Password strength meter ───────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;

  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.ok).length;
  const colors = ["bg-red-500", "bg-amber-500", "bg-emerald-500"];
  const labels = ["Weak", "Fair", "Strong"];

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : "bg-white/5"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-600">
          {score > 0 && <span className={score === 3 ? "text-emerald-400" : score === 2 ? "text-amber-400" : "text-red-400"}>{labels[score - 1]}</span>}
        </span>
        <div className="flex gap-2">
          {checks.map((c) => (
            <span key={c.label} className={`text-[10px] font-mono flex items-center gap-1 ${c.ok ? "text-emerald-400" : "text-slate-700"}`}>
              <CheckCircle2 size={9} />
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { status } = useSession();
  const router = useRouter();

  const [form,    setForm]    = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      return setError("Passwords do not match.");
    }
    if (form.password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }

    setLoading(true);
    try {
      // 1. Create account
      const res = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setSuccess(true);

      // 2. Auto sign-in after registration
      await signIn("credentials", {
        redirect:  false,
        email:     form.email,
        password:  form.password,
      });

      router.replace("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Create Account · Trading Discipline Dashboard</title></Head>

      <div className="min-h-screen bg-[#04080f] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
          style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.05) 0%, transparent 70%)" }} />
        <div className="pointer-events-none fixed inset-0 opacity-30"
          style={{
            backgroundImage: "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }} />

        <div className="relative z-10 w-full max-w-md animate-fade-up">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.04))",
                border: "1px solid rgba(245,158,11,0.3)",
                boxShadow: "0 0 40px rgba(245,158,11,0.1)",
              }}>
              <BarChart2 size={26} className="text-[#f59e0b]" />
            </div>
            <h1 className="font-display text-3xl tracking-widest text-white">TRADING DISCIPLINE</h1>
            <p className="text-slate-500 text-sm font-mono mt-1">Create your free account</p>
          </div>

          <div className="glass-card-ember p-8 space-y-5">
            <h2 className="text-white font-semibold text-lg">Get started</h2>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2.5">
                <AlertCircle size={14} className="shrink-0" /> {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2.5">
                <CheckCircle2 size={14} className="shrink-0" /> Account created! Signing you in…
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-1.5 block">Display name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type="text" className="glass-input pl-9" placeholder="John Trader"
                    value={form.name} onChange={set("name")} required autoComplete="name" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-1.5 block">Email address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type="email" className="glass-input pl-9" placeholder="you@example.com"
                    value={form.email} onChange={set("email")} required autoComplete="email" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-1.5 block">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type={showPw ? "text" : "password"} className="glass-input pl-9 pr-9"
                    placeholder="Min 8 characters" value={form.password} onChange={set("password")} required />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <PasswordStrength password={form.password} />
              </div>

              {/* Confirm password */}
              <div>
                <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-1.5 block">Confirm password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type={showPw ? "text" : "password"} className="glass-input pl-9"
                    placeholder="Repeat password" value={form.confirm} onChange={set("confirm")} required />
                </div>
              </div>

              <button type="submit" disabled={loading || success}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 mt-2"
                style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.1))",
                  border: "1px solid rgba(245,158,11,0.3)",
                  color: "#f59e0b",
                  boxShadow: "0 0 20px rgba(245,158,11,0.08)",
                }}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-slate-700 text-xs font-mono">OR</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-[#f59e0b] hover:text-[#d97706] font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
