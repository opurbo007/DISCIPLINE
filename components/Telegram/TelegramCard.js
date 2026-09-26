/**
 * components/Telegram/TelegramCard.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Links the logged-in user to the Telegram bot and shows suggested commands.
 */

import { useState } from "react";
import useSWR from "swr";
import { Send, Copy, Check, RefreshCw, Unlink, Loader2, Terminal, Sparkles } from "lucide-react";

const SUGGESTED = ["/start", "/portfolio", "/holdings", "/pnl", "/help", "/unlink"];

export default function TelegramCard() {
  const { data, mutate, isLoading } = useSWR("/api/telegram/link-code");
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestedOk, setSuggestedOk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const info = data?.data || {};
  const linked = Boolean(info.linked);
  const code = info.linkToken || "";
  const deepLink = info.deepLink || "";
  const botUsername = info.botUsername || "";

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/telegram/link-code", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to generate code");
      await mutate();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/telegram/link-code", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to unlink");
      await mutate();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`/start ${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy failed — select the code manually.");
    }
  };

  const enableSuggestions = async () => {
    setSuggesting(true);
    setSuggestedOk(false);
    setError("");
    try {
      const res = await fetch("/api/telegram/setup", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to enable suggestions");
      setSuggestedOk(true);
      setTimeout(() => setSuggestedOk(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[13px] font-semibold text-white flex items-center gap-2">
          <Send size={13} className="text-sky-300" />
          Telegram bot
        </h3>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            linked
              ? "text-emerald-300 bg-emerald-400/10 border-emerald-400/20"
              : "text-zinc-500 bg-white/[0.04] border-white/[0.07]"
          }`}
        >
          {linked ? "Linked" : "Not linked"}
        </span>
      </div>
      <p className="text-[12px] text-zinc-500 leading-relaxed">
        View your portfolio from Telegram. Commands are suggested when you type <span className="font-mono text-zinc-300">/</span>.
      </p>

      {isLoading ? (
        <div className="mt-3 h-9 rounded-xl shimmer-bg" />
      ) : linked ? (
        <div className="mt-3 space-y-2.5">
          <p className="text-[12px] text-emerald-300 bg-emerald-400/[0.07] border border-emerald-400/20 rounded-xl px-3 py-2">
            ✅ Connected — try <span className="font-mono">/portfolio</span> in Telegram.
          </p>
          <button onClick={unlink} disabled={busy} className="btn-ghost w-full !text-[12px]">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
            Unlink Telegram
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          {code ? (
            <>
              <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 flex items-center gap-2">
                <code className="font-mono text-[13px] text-white flex-1 truncate">/start {code}</code>
                <button
                  onClick={copyCode}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Copy command"
                >
                  {copied ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                </button>
              </div>
              {deepLink ? (
                <a href={deepLink} target="_blank" rel="noreferrer" className="btn-primary w-full !text-[12px]">
                  <Send size={12} /> Open @{botUsername} to link
                </a>
              ) : (
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Send that command to your bot. Set <span className="font-mono">TELEGRAM_BOT_USERNAME</span> to enable a one-tap link button.
                </p>
              )}
              <button onClick={generate} disabled={busy} className="btn-ghost w-full !text-[12px]">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                New code
              </button>
            </>
          ) : (
            <button onClick={generate} disabled={busy} className="btn-primary w-full !text-[12px]">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Generate link code
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-[12px] text-red-300">{error}</p>}

      <div className="mt-3 border-t border-white/[0.06] pt-3">
        <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
          <Terminal size={11} /> Suggested commands
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTED.map((c) => (
            <span key={c} className="font-mono text-[11px] px-2 py-1 rounded-lg bg-white/[0.05] border border-white/[0.07] text-zinc-300">
              {c}
            </span>
          ))}
        </div>
        <button
          onClick={enableSuggestions}
          disabled={suggesting}
          className="btn-ghost w-full !text-[12px] mt-2.5"
          title="Registers / commands + bot description so Telegram shows suggestions when you type /"
        >
          {suggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {suggestedOk ? "Suggestions enabled ✓" : "Enable Telegram suggestions"}
        </button>
        <p className="mt-1.5 text-[11px] text-zinc-600 leading-relaxed">
          One click registers the / menu + bot bio. Then type / in chat or tap the buttons under messages.
        </p>
      </div>
    </div>
  );
}
