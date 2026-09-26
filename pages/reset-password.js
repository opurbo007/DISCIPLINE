/**
 * pages/reset-password.js — set a new password via ?token=...
 */

import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { CandlestickChart, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) return setError("Missing reset token. Open the link from your email.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Reset failed.");
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Reset password · Discipline</title></Head>
      <div className="min-h-screen bg-[#07090d] flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-mesh-emerald" />
        <div className="relative z-10 w-full max-w-md card p-7 sm:p-8 animate-fade-up">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-600 shadow-glow">
              <CandlestickChart size={19} className="text-[#04120c]" strokeWidth={2.5} />
            </div>
            <p className="text-white text-[15px] font-bold tracking-tight">Discipline</p>
          </div>

          <h1 className="text-[22px] font-bold text-white tracking-tight">Set a new password</h1>
          <p className="text-[13.5px] text-zinc-500 mt-1">Min 8 characters. The link expires in 1 hour.</p>

          {error && (
            <div className="mt-5 flex items-center gap-2 text-red-200 text-[13px] bg-red-400/10 border border-red-400/20 rounded-xl px-3.5 py-2.5">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}
          {done && (
            <div className="mt-5 flex items-center gap-2 text-emerald-200 text-[13px] bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-3.5 py-2.5">
              <CheckCircle2 size={15} className="shrink-0" /> Password reset! Redirecting to sign in…
            </div>
          )}

          {!done && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="field-label">New password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    type={showPw ? "text" : "password"}
                    className="glass-input !pl-10 !pr-11"
                    placeholder="Min 8 characters"
                    value={form.password}
                    onChange={set("password")}
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="field-label">Confirm password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    type={showPw ? "text" : "password"}
                    className="glass-input !pl-10"
                    placeholder="Repeat password"
                    value={form.confirm}
                    onChange={set("confirm")}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3 disabled:opacity-60">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>
          )}

          <p className="text-center text-[13.5px] text-zinc-500 mt-6">
            <Link href="/login" className="text-emerald-300 hover:text-emerald-200 font-semibold transition-colors">Back to sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
