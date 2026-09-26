/**
 * pages/forgot-password.js — request a password reset link.
 */

import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { CandlestickChart, Mail, AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Forgot password · Discipline</title></Head>
      <div className="min-h-screen bg-[#07090d] flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-mesh-emerald" />
        <div className="relative z-10 w-full max-w-md card p-7 sm:p-8 animate-fade-up">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-600 shadow-glow">
              <CandlestickChart size={19} className="text-[#04120c]" strokeWidth={2.5} />
            </div>
            <p className="text-white text-[15px] font-bold tracking-tight">Discipline</p>
          </div>

          <h1 className="text-[22px] font-bold text-white tracking-tight">Forgot password?</h1>
          <p className="text-[13.5px] text-zinc-500 mt-1">Enter your account email — we&apos;ll send a 1-hour reset link.</p>

          {error && (
            <div className="mt-5 flex items-center gap-2 text-red-200 text-[13px] bg-red-400/10 border border-red-400/20 rounded-xl px-3.5 py-2.5">
              <AlertCircle size={15} className="shrink-0" /> {error}
            </div>
          )}
          {sent && (
            <div className="mt-5 flex items-center gap-2 text-emerald-200 text-[13px] bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-3.5 py-2.5">
              <CheckCircle2 size={15} className="shrink-0" /> If an account exists, a reset link was sent. Check your inbox.
            </div>
          )}

          {!sent && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="field-label">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    type="email"
                    className="glass-input !pl-10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3 disabled:opacity-60">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {loading ? "Sending…" : "Send reset link"}
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
