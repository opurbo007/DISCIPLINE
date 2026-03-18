/**
 * components/Journal/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Full trade journal — log, track, and analyse every trade.
 *
 * Three tabs:
 *   1. Trades   — filterable list of all trades with add/edit/delete
 *   2. Analytics — win rate, P&L curves, R:R, mood + setup breakdowns
 *   3. Add/Edit form (inline, no modal)
 *
 * No coin price fetching — everything is manual entry.
 */

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  BookOpen, Plus, X, Check, Pencil, Trash2, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Target, AlertCircle, BarChart3,
  Zap, Brain, Filter, RefreshCw, Loader2, ArrowUpRight,
  ArrowDownRight, Minus, Award, Shield, Activity, Clock,
} from "lucide-react";
import clsx from "clsx";

// ── Constants ──────────────────────────────────────────────────────────────────
const DIRECTIONS = ["LONG", "SHORT"];
const STATUSES   = ["PLANNED", "OPEN", "CLOSED", "CANCELLED"];
const MOODS      = ["confident", "uncertain", "fomo", "revenge", "neutral"];

const STATUS_STYLE = {
  PLANNED:   { label: "Planned",   cls: "text-slate-400  bg-white/5        border-white/10"         },
  OPEN:      { label: "Open",      cls: "text-[#00d4ff]  bg-[rgba(0,212,255,0.1)] border-[rgba(0,212,255,0.2)]" },
  CLOSED:    { label: "Closed",    cls: "text-slate-300  bg-white/8        border-white/15"         },
  CANCELLED: { label: "Cancelled", cls: "text-slate-600  bg-white/3        border-white/6"          },
};

const MOOD_EMOJI = {
  confident: "😎", uncertain: "😐", fomo: "😰", revenge: "😤", neutral: "🙂", "": "—",
};

const DIR_ICON = { LONG: ArrowUpRight, SHORT: ArrowDownRight };

// ── Formatters ─────────────────────────────────────────────────────────────────
const fmt$ = (n, dp = 2) =>
  n == null ? "—"
  : `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

const fmtPct = (n) => n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const fmtR   = (n) => n == null ? "—" : `${n.toFixed(2)}R`;

const pnlClass = (n) =>
  n == null ? "text-slate-500"
  : n > 0   ? "text-emerald-400"
  : n < 0   ? "text-red-400"
  : "text-slate-500";

// ── Stat mini-card ─────────────────────────────────────────────────────────────
function MiniStat({ label, value, sub, icon: Icon, color = "slate", highlight }) {
  const colors = {
    arc:   "text-[#00d4ff]",
    ember: "text-[#f59e0b]",
    bull:  "text-emerald-400",
    bear:  "text-red-400",
    slate: "text-slate-300",
  };
  return (
    <div className={clsx("glass-card p-4 flex flex-col gap-2", highlight && "glass-card-arc")}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600">{label}</span>
        {Icon && <Icon size={13} className={colors[color]} />}
      </div>
      <p className={clsx("font-mono font-bold text-xl leading-none", colors[color])}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 font-mono">{sub}</p>}
    </div>
  );
}

// ── Trade form ─────────────────────────────────────────────────────────────────
function TradeForm({ initial = {}, onSubmit, onCancel, loading }) {
  const blank = {
    coin: "", direction: "LONG", setup: "",
    tradeAmount: "", leverage: "1",
    entryPrice: "", stopLoss: "", takeProfit: "",
    exitPrice: "", netPnl: "", status: "PLANNED",
    reason: "", outcome: "", mood: "", tags: "",
    tradeDate: new Date().toISOString().split("T")[0],
  };
  const [f, setF] = useState({ ...blank, ...initial,
    tradeDate: initial.tradeDate
      ? new Date(initial.tradeDate).toISOString().split("T")[0]
      : blank.tradeDate,
    tags: Array.isArray(initial.tags) ? initial.tags.join(", ") : (initial.tags || ""),
  });

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  // Live R:R preview
  const rrPreview = useMemo(() => {
    const ep = parseFloat(f.entryPrice), sl = parseFloat(f.stopLoss), tp = parseFloat(f.takeProfit);
    if (!ep || !sl || !tp) return null;
    const risk   = Math.abs(ep - sl);
    const reward = Math.abs(tp - ep);
    return risk > 0 ? (reward / risk).toFixed(2) : null;
  }, [f.entryPrice, f.stopLoss, f.takeProfit]);

  // Live P&L preview (if exit price set)
  const pnlPreview = useMemo(() => {
    const ep = parseFloat(f.entryPrice), xp = parseFloat(f.exitPrice);
    const amt = parseFloat(f.tradeAmount), lev = parseFloat(f.leverage) || 1;
    if (!ep || !xp || !amt) return null;
    const pct = f.direction === "LONG" ? (xp - ep) / ep : (ep - xp) / ep;
    return (pct * amt * lev).toFixed(2);
  }, [f.entryPrice, f.exitPrice, f.tradeAmount, f.leverage, f.direction]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!f.coin.trim() || !f.tradeAmount) return;
    onSubmit({
      ...f,
      tags: f.tags ? f.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      // Auto-fill netPnl from preview if not set
      netPnl: f.netPnl !== "" ? f.netPnl : (pnlPreview !== null ? pnlPreview : ""),
    });
  };

  const isEditing = !!initial._id;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Row 1: Core trade identity ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Coin */}
        <div className="lg:col-span-1">
          <label className="field-label">Coin / Market *</label>
          <input className="glass-input font-mono uppercase" placeholder="BTC" value={f.coin}
            onChange={(e) => setF((p) => ({ ...p, coin: e.target.value.toUpperCase() }))} required />
        </div>

        {/* Direction */}
        <div>
          <label className="field-label">Direction *</label>
          <div className="flex rounded-lg overflow-hidden border border-white/8">
            {DIRECTIONS.map((d) => (
              <button key={d} type="button"
                onClick={() => setF((p) => ({ ...p, direction: d }))}
                className={clsx(
                  "flex-1 py-2 text-xs font-mono font-bold transition-all",
                  f.direction === d
                    ? d === "LONG"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                    : "bg-white/3 text-slate-600 hover:bg-white/6"
                )}>
                {d === "LONG" ? "▲ LONG" : "▼ SHORT"}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="field-label">Status</label>
          <select className="glass-input" value={f.status} onChange={set("status")}>
            {STATUSES.map((s) => <option key={s} value={s} className="bg-[#0d1117]">{s}</option>)}
          </select>
        </div>

        {/* Trade Amount */}
        <div>
          <label className="field-label">Capital (USD) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm">$</span>
            <input type="number" step="any" min="0" className="glass-input font-mono pl-6"
              placeholder="1000" value={f.tradeAmount} onChange={set("tradeAmount")} required />
          </div>
        </div>

        {/* Leverage */}
        <div>
          <label className="field-label">Leverage</label>
          <div className="relative">
            <input type="number" step="1" min="1" max="500" className="glass-input font-mono pr-6"
              placeholder="1" value={f.leverage} onChange={set("leverage")} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-mono">x</span>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="field-label">Date</label>
          <input type="date" className="glass-input font-mono" value={f.tradeDate} onChange={set("tradeDate")} />
        </div>
      </div>

      {/* ── Row 2: Price levels ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Entry */}
        <div>
          <label className="field-label">Entry Price</label>
          <input type="number" step="any" min="0" className="glass-input font-mono"
            placeholder="65000" value={f.entryPrice} onChange={set("entryPrice")} />
        </div>

        {/* SL */}
        <div>
          <label className="field-label flex items-center gap-1">
            <Shield size={9} className="text-red-400" /> Stop Loss
          </label>
          <input type="number" step="any" min="0" className="glass-input font-mono border-red-500/20"
            placeholder="63000" value={f.stopLoss} onChange={set("stopLoss")} />
        </div>

        {/* TP */}
        <div>
          <label className="field-label flex items-center gap-1">
            <Target size={9} className="text-emerald-400" /> Take Profit
          </label>
          <input type="number" step="any" min="0" className="glass-input font-mono border-emerald-500/20"
            placeholder="70000" value={f.takeProfit} onChange={set("takeProfit")} />
        </div>

        {/* R:R live preview */}
        <div className="flex flex-col justify-end">
          <div className={clsx(
            "rounded-lg border px-3 py-2 text-center",
            rrPreview
              ? parseFloat(rrPreview) >= 2
                ? "border-emerald-500/25 bg-emerald-500/8"
                : parseFloat(rrPreview) >= 1
                  ? "border-amber-500/25 bg-amber-500/8"
                  : "border-red-500/25 bg-red-500/8"
              : "border-white/6 bg-white/2"
          )}>
            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">R:R Ratio</p>
            <p className={clsx("font-mono font-bold text-lg mt-0.5",
              rrPreview
                ? parseFloat(rrPreview) >= 2 ? "text-emerald-400"
                  : parseFloat(rrPreview) >= 1 ? "text-amber-400"
                  : "text-red-400"
                : "text-slate-700"
            )}>
              {rrPreview ? `${rrPreview}R` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Row 3: Outcome (show when closing a trade) ───────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Exit price */}
        <div>
          <label className="field-label">Exit Price</label>
          <input type="number" step="any" min="0" className="glass-input font-mono"
            placeholder="Optional" value={f.exitPrice} onChange={set("exitPrice")} />
        </div>

        {/* Net P&L */}
        <div>
          <label className="field-label">Net P&L (USD)</label>
          <div className="relative">
            <input type="number" step="any" className={clsx(
                "glass-input font-mono pl-6",
                f.netPnl !== "" && parseFloat(f.netPnl) > 0 && "border-emerald-500/25",
                f.netPnl !== "" && parseFloat(f.netPnl) < 0 && "border-red-500/25"
              )}
              placeholder={pnlPreview != null ? `Auto: ${pnlPreview}` : "0.00"}
              value={f.netPnl} onChange={set("netPnl")} />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm">$</span>
          </div>
          {pnlPreview != null && f.netPnl === "" && (
            <p className="text-[10px] font-mono text-slate-600 mt-1 flex items-center gap-1">
              <Zap size={8} />
              Calculated: <span className={pnlClass(parseFloat(pnlPreview))}>{fmt$(parseFloat(pnlPreview))}</span>
              <button type="button" className="text-[#00d4ff] underline ml-1"
                onClick={() => setF((p) => ({ ...p, netPnl: pnlPreview }))}>use</button>
            </p>
          )}
        </div>

        {/* Mood */}
        <div>
          <label className="field-label flex items-center gap-1">
            <Brain size={9} /> Entry Mood
          </label>
          <select className="glass-input" value={f.mood} onChange={set("mood")}>
            <option value="" className="bg-[#0d1117]">— Select mood</option>
            {MOODS.map((m) => (
              <option key={m} value={m} className="bg-[#0d1117]">
                {MOOD_EMOJI[m]} {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Row 4: Analysis text ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <label className="field-label">Trade Reason / Thesis *</label>
          <textarea className="glass-input resize-none h-24 font-mono text-xs leading-relaxed"
            placeholder={"Why are you taking this trade?\n\n• Key level / structure?\n• Confluence factors?\n• What's your edge here?"}
            value={f.reason} onChange={set("reason")} />
        </div>
        <div>
          <label className="field-label">Outcome Notes</label>
          <textarea className="glass-input resize-none h-24 font-mono text-xs leading-relaxed"
            placeholder={"Post-trade review:\n\n• What went right / wrong?\n• Did you follow your plan?\n• Lessons for next time?"}
            value={f.outcome} onChange={set("outcome")} />
        </div>
      </div>

      {/* ── Row 5: Tags + setup ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="field-label">Setup / Pattern</label>
          <input className="glass-input" placeholder="e.g. Break & Retest, EMA Crossover, Fib 618"
            value={f.setup} onChange={set("setup")} />
        </div>
        <div>
          <label className="field-label">Tags (comma separated)</label>
          <input className="glass-input" placeholder="e.g. swing, htf, confluence"
            value={f.tags} onChange={set("tags")} />
        </div>
      </div>

      {/* ── Position size preview ────────────────────────────────── */}
      {f.tradeAmount && parseFloat(f.leverage) > 1 && (
        <p className="text-xs text-slate-500 font-mono bg-white/3 rounded-lg px-3 py-2 border border-white/5">
          Position size: <span className="text-white font-bold">
            ${(parseFloat(f.tradeAmount) * parseFloat(f.leverage)).toLocaleString()}
          </span>
          {" "}({f.leverage}× leverage on ${parseFloat(f.tradeAmount).toLocaleString()} capital)
        </p>
      )}

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-arc" disabled={loading}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {loading ? "Saving…" : isEditing ? "Update Trade" : "Log Trade"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          <X size={13} /> Cancel
        </button>
      </div>
    </form>
  );
}

// ── Analytics panel ────────────────────────────────────────────────────────────
function Analytics({ stats, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="text-[#00d4ff] animate-spin" />
      </div>
    );
  }

  if (!stats || stats.totalTrades === 0) {
    return (
      <div className="glass-card py-14 text-center">
        <BarChart3 size={36} className="mx-auto text-slate-800 mb-3" />
        <p className="text-slate-500 text-sm">Close some trades to see analytics.</p>
      </div>
    );
  }

  const { totalTrades, wins, losses, winRate, totalPnl, avgPnl, avgRR,
          bestTrade, worstTrade, avgLeverage, byDirection, byMood, bySetup,
          currentStreak, longestWinStreak, longestLossStreak } = stats;

  const streakPositive = currentStreak > 0;
  const streakLabel = streakPositive
    ? `🔥 ${currentStreak}W streak`
    : currentStreak < 0
      ? `❄️ ${Math.abs(currentStreak)}L streak`
      : "—";

  return (
    <div className="space-y-6">

      {/* ── Overview stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniStat label="Win Rate"      value={`${winRate}%`}
          sub={`${wins}W / ${losses}L`}  icon={Activity}
          color={winRate >= 50 ? "bull" : "bear"}  highlight />
        <MiniStat label="Total P&L"     value={fmt$(totalPnl)}
          sub={`${totalTrades} trades`}  icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
          color={totalPnl >= 0 ? "bull" : "bear"} />
        <MiniStat label="Avg P&L"       value={fmt$(avgPnl)}
          sub="per closed trade"         icon={BarChart3}
          color={avgPnl >= 0 ? "bull" : "bear"} />
        <MiniStat label="Avg R:R"       value={avgRR ? `${avgRR}R` : "—"}
          sub="reward / risk"            icon={Target}
          color={avgRR >= 2 ? "bull" : avgRR >= 1 ? "ember" : "bear"} />
        <MiniStat label="Avg Leverage"  value={`${avgLeverage}x`}
          sub="across closed trades"     icon={Zap} color="ember" />
        <MiniStat label="Current Streak" value={streakLabel}
          sub={`Best: ${longestWinStreak}W | ${longestLossStreak}L`}
          icon={Award} color={streakPositive ? "bull" : "bear"} />
      </div>

      {/* ── Best & worst ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: "Best Trade",  trade: bestTrade,  color: "bull" },
          { label: "Worst Trade", trade: worstTrade, color: "bear" },
        ].map(({ label, trade, color }) => trade && (
          <div key={label} className={clsx("glass-card p-4 space-y-2", color === "bull" ? "glass-card-bull" : "glass-card-bear")}>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{label}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={clsx(
                  "text-xs font-mono font-bold px-2 py-0.5 rounded",
                  trade.direction === "LONG"
                    ? "text-emerald-400 bg-emerald-400/10"
                    : "text-red-400 bg-red-400/10"
                )}>
                  {trade.direction === "LONG" ? "▲" : "▼"} {trade.direction}
                </span>
                <p className="text-white font-bold font-mono">{trade.coin}</p>
              </div>
              <p className={clsx("font-mono font-bold text-lg", pnlClass(trade.netPnl))}>
                {fmt$(trade.netPnl)}
              </p>
            </div>
            {trade.reason && (
              <p className="text-slate-600 text-[11px] font-mono truncate">{trade.reason}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── By direction ────────────────────────────────────────── */}
      <div className="glass-card p-4">
        <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-3">Performance by Direction</p>
        <div className="grid grid-cols-2 gap-4">
          {["LONG", "SHORT"].map((dir) => {
            const d = byDirection[dir] || { count: 0, wins: 0, pnl: 0 };
            const wr = d.count ? ((d.wins / d.count) * 100).toFixed(0) : 0;
            const barColor = dir === "LONG" ? "bg-emerald-500" : "bg-red-500";
            return (
              <div key={dir}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={clsx("text-sm font-mono font-bold", dir === "LONG" ? "text-emerald-400" : "text-red-400")}>
                    {dir === "LONG" ? "▲" : "▼"} {dir}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {d.count} trades · {wr}% WR
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={clsx("h-full rounded-full transition-all", barColor)}
                    style={{ width: `${wr}%` }} />
                </div>
                <p className={clsx("text-xs font-mono mt-1", pnlClass(d.pnl))}>
                  {fmt$(d.pnl)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── By mood & setup (side by side) ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Mood breakdown */}
        <div className="glass-card p-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Brain size={11} /> Trading Psychology
          </p>
          {Object.entries(byMood).length === 0 ? (
            <p className="text-slate-700 text-xs font-mono">Log your mood on trades to see patterns.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(byMood)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([mood, data]) => {
                  const wr = data.count ? ((data.wins / data.count) * 100).toFixed(0) : 0;
                  return (
                    <div key={mood} className="flex items-center gap-3">
                      <span className="text-base w-6 text-center">{MOOD_EMOJI[mood]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-300 capitalize font-medium">{mood || "neutral"}</span>
                          <span className="text-slate-500 font-mono">{data.count}t · {wr}%WR</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={clsx("h-full rounded-full", parseInt(wr) >= 50 ? "bg-emerald-500" : "bg-red-500")}
                            style={{ width: `${wr}%` }}
                          />
                        </div>
                      </div>
                      <span className={clsx("text-xs font-mono w-16 text-right shrink-0", pnlClass(data.pnl))}>
                        {fmt$(data.pnl)}
                      </span>
                    </div>
                  );
              })}
            </div>
          )}
        </div>

        {/* Setup breakdown */}
        <div className="glass-card p-4">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Target size={11} /> Setup Performance
          </p>
          {Object.entries(bySetup).length === 0 ? (
            <p className="text-slate-700 text-xs font-mono">Add setup names to track which patterns work.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(bySetup)
                .sort((a, b) => b[1].pnl - a[1].pnl)
                .slice(0, 6)
                .map(([setup, data]) => {
                  const wr = data.count ? ((data.wins / data.count) * 100).toFixed(0) : 0;
                  return (
                    <div key={setup} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-300 truncate max-w-[120px]" title={setup}>{setup}</span>
                          <span className="text-slate-500 font-mono shrink-0 ml-1">{data.count}t · {wr}%WR</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={clsx("h-full rounded-full", parseInt(wr) >= 50 ? "bg-[#00d4ff]" : "bg-amber-500")}
                            style={{ width: `${wr}%` }}
                          />
                        </div>
                      </div>
                      <span className={clsx("text-xs font-mono w-16 text-right shrink-0", pnlClass(data.pnl))}>
                        {fmt$(data.pnl)}
                      </span>
                    </div>
                  );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Trade row card ─────────────────────────────────────────────────────────────
function TradeCard({ trade, onEdit, onDelete, onStatusChange }) {
  const [expanded,   setExpanded]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const DirIcon  = DIR_ICON[trade.direction] || Minus;
  const statusCfg = STATUS_STYLE[trade.status] || STATUS_STYLE.PLANNED;

  return (
    <div className="glass-card group">
      {/* ── Header row ─────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors rounded-xl"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Direction badge */}
        <span className={clsx(
          "shrink-0 flex items-center gap-1 text-xs font-mono font-bold px-2 py-1 rounded-lg",
          trade.direction === "LONG"
            ? "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20"
            : "text-red-400 bg-red-400/10 border border-red-400/20"
        )}>
          <DirIcon size={11} />
          {trade.direction}
        </span>

        {/* Coin */}
        <span className="font-mono font-bold text-white text-sm tracking-wider">{trade.coin}</span>

        {/* Status */}
        <span className={clsx("text-[10px] font-mono px-1.5 py-0.5 rounded border", statusCfg.cls)}>
          {statusCfg.label}
        </span>

        {/* Setup */}
        {trade.setup && (
          <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/8 hidden sm:inline">
            {trade.setup}
          </span>
        )}

        {/* R:R ratio */}
        {trade.rrRatio && (
          <span className={clsx(
            "text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0",
            trade.rrRatio >= 2
              ? "text-emerald-400 bg-emerald-400/8 border-emerald-400/20"
              : trade.rrRatio >= 1
                ? "text-amber-400 bg-amber-400/8 border-amber-400/20"
                : "text-red-400 bg-red-400/8 border-red-400/20"
          )}>
            {fmtR(trade.rrRatio)}
          </span>
        )}

        {/* Capital + leverage */}
        <span className="text-xs font-mono text-slate-500 hidden sm:inline">
          {fmt$(trade.tradeAmount)}
          {trade.leverage > 1 && <span className="text-amber-500/70 ml-1">{trade.leverage}×</span>}
        </span>

        {/* P&L — most important — right aligned */}
        <div className="ml-auto flex items-center gap-3">
          {trade.netPnl != null && (
            <span className={clsx("font-mono font-bold text-sm", pnlClass(trade.netPnl))}>
              {fmt$(trade.netPnl)}
              {trade.netPnlPercent != null && (
                <span className="text-[10px] font-normal ml-1">({fmtPct(trade.netPnlPercent)})</span>
              )}
            </span>
          )}

          {/* Expand toggle */}
          <span className="text-slate-700">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </div>

      {/* ── Expanded detail ─────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-white/5 px-4 py-4 space-y-4">

          {/* Price levels grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs font-mono">
            {[
              { label: "Entry",      val: trade.entryPrice,  color: "text-white"        },
              { label: "Stop Loss",  val: trade.stopLoss,    color: "text-red-400"      },
              { label: "Take Profit",val: trade.takeProfit,  color: "text-emerald-400"  },
              { label: "Exit Price", val: trade.exitPrice,   color: "text-[#00d4ff]"    },
              { label: "Position",   val: trade.positionSize,color: "text-amber-400"    },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
                <p className="text-slate-600 text-[9px] uppercase tracking-wider mb-1">{label}</p>
                <p className={clsx("font-bold", color)}>{val != null ? fmt$(val) : "—"}</p>
              </div>
            ))}
          </div>

          {/* Reason + outcome */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trade.reason && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-600 mb-1.5">Thesis</p>
                <p className="text-slate-400 text-xs leading-relaxed font-mono whitespace-pre-wrap">{trade.reason}</p>
              </div>
            )}
            {trade.outcome && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-600 mb-1.5">Outcome Notes</p>
                <p className="text-slate-400 text-xs leading-relaxed font-mono whitespace-pre-wrap">{trade.outcome}</p>
              </div>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3">
            {trade.mood && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Brain size={10} className="text-slate-600" />
                {MOOD_EMOJI[trade.mood]} {trade.mood}
              </span>
            )}
            {trade.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {trade.tags.map((t) => (
                  <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-slate-500">
                    #{t}
                  </span>
                ))}
              </div>
            )}
            <span className="text-[10px] text-slate-700 font-mono ml-auto flex items-center gap-1">
              <Clock size={9} />
              {new Date(trade.tradeDate).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>

          {/* Quick status update */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
            {STATUSES.filter((s) => s !== trade.status).map((s) => (
              <button key={s}
                onClick={() => onStatusChange(trade._id, s)}
                className="text-[10px] font-mono px-2 py-1 rounded border border-white/8 text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
                → {s}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button onClick={() => onEdit(trade)}
                className="btn-ghost text-xs py-1">
                <Pencil size={11} /> Edit
              </button>
              {confirmDel ? (
                <>
                  <button onClick={() => onDelete(trade._id)} className="btn-danger text-xs py-1"><Check size={11} /> Confirm</button>
                  <button onClick={() => setConfirmDel(false)} className="btn-ghost text-xs py-1"><X size={11} /></button>
                </>
              ) : (
                <button onClick={() => setConfirmDel(true)} className="btn-danger text-xs py-1">
                  <Trash2 size={11} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Journal Component ─────────────────────────────────────────────────────
export default function Journal() {
  const [activeTab,    setActiveTab]    = useState("trades"); // "trades" | "analytics"
  const [showForm,     setShowForm]     = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDir,    setFilterDir]    = useState("all");
  const [searchCoin,   setSearchCoin]   = useState("");

  const { data: tradesData, mutate: mutateTrades } = useSWR("/api/journal");
  const { data: statsData,  mutate: mutateStats, isLoading: statsLoading } = useSWR(
    activeTab === "analytics" ? "/api/journal/stats" : null
  );

  const trades = tradesData?.data || [];
  const stats  = statsData?.data || null;

  // Client-side filter
  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (filterStatus !== "all" && t.status    !== filterStatus) return false;
      if (filterDir    !== "all" && t.direction !== filterDir)    return false;
      if (searchCoin.trim() && !t.coin.toLowerCase().includes(searchCoin.toLowerCase())) return false;
      return true;
    });
  }, [trades, filterStatus, filterDir, searchCoin]);

  // Quick stats from local data
  const localStats = useMemo(() => {
    const closed = trades.filter((t) => t.status === "CLOSED" && t.netPnl != null);
    const totalPnl = closed.reduce((s, t) => s + t.netPnl, 0);
    return {
      open:      trades.filter((t) => t.status === "OPEN").length,
      planned:   trades.filter((t) => t.status === "PLANNED").length,
      totalPnl,
      winRate:   closed.length ? (closed.filter((t) => t.netPnl > 0).length / closed.length * 100).toFixed(0) : null,
    };
  }, [trades]);

  // CRUD
  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editingTrade) {
        await fetch(`/api/journal/${editingTrade._id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/journal", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      await mutateTrades();
      await mutateStats();
      setShowForm(false);
      setEditingTrade(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    mutateTrades({ data: trades.filter((t) => t._id !== id) }, { revalidate: false });
    await fetch(`/api/journal/${id}`, { method: "DELETE" });
    mutateTrades();
    mutateStats();
  };

  const handleEdit = (trade) => {
    setEditingTrade(trade);
    setShowForm(true);
    setActiveTab("trades");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStatusChange = async (id, status) => {
    await fetch(`/api/journal/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    mutateTrades();
    mutateStats();
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTrade(null);
  };

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen size={18} className="text-[#f59e0b]" />
          <h2 className="font-display text-3xl tracking-wider text-white">TRADE JOURNAL</h2>
          <span className="text-xs font-mono text-slate-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
            {trades.length} trades
          </span>
        </div>
        <div className="flex items-center gap-2">
          {localStats.totalPnl !== 0 && (
            <span className={clsx("font-mono text-sm font-bold px-3 py-1.5 rounded-lg border",
              localStats.totalPnl > 0
                ? "text-emerald-400 bg-emerald-400/8 border-emerald-400/20"
                : "text-red-400 bg-red-400/8 border-red-400/20"
            )}>
              {fmt$(localStats.totalPnl)}
            </span>
          )}
          <button className="btn-ember" onClick={() => { setShowForm((v) => !v); setEditingTrade(null); }}>
            {showForm && !editingTrade ? <X size={13} /> : <Plus size={13} />}
            {showForm && !editingTrade ? "Cancel" : "Log Trade"}
          </button>
        </div>
      </div>

      {/* ── Quick stats bar ──────────────────────────────────────── */}
      {trades.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Open",    val: localStats.open,    color: "text-[#00d4ff]"  },
            { label: "Planned", val: localStats.planned, color: "text-slate-400"  },
            { label: "Win Rate",val: localStats.winRate ? `${localStats.winRate}%` : "—", color: localStats.winRate >= 50 ? "text-emerald-400" : "text-red-400" },
          ].map(({ label, val, color }) => (
            <div key={label} className="glass-card px-4 py-2.5 flex items-center gap-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600">{label}</span>
              <span className={clsx("font-mono font-bold text-sm", color)}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit form ──────────────────────────────────────── */}
      {showForm && (
        <div className="glass-card-ember p-5 animate-fade-up">
          <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-4">
            {editingTrade ? `Editing: ${editingTrade.coin} ${editingTrade.direction}` : "New Trade Entry"}
          </p>
          <TradeForm
            initial={editingTrade || {}}
            onSubmit={handleSave}
            onCancel={handleCancelForm}
            loading={saving}
          />
        </div>
      )}

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-white/5 pb-0">
        {[
          { key: "trades",    label: "Trades",    icon: BookOpen  },
          { key: "analytics", label: "Analytics", icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
              activeTab === key
                ? "border-[#f59e0b] text-[#f59e0b]"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Trades ──────────────────────────────────────────── */}
      {activeTab === "trades" && (
        <div className="space-y-4">
          {/* Filters */}
          {trades.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={12} className="text-slate-600" />
              <input
                className="glass-input w-32 text-xs py-1.5"
                placeholder="Coin…"
                value={searchCoin}
                onChange={(e) => setSearchCoin(e.target.value)}
              />
              {["all", ...STATUSES].map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={clsx(
                    "text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all",
                    filterStatus === s
                      ? "border-[#f59e0b]/40 text-[#f59e0b] bg-[rgba(245,158,11,0.1)]"
                      : "border-white/8 text-slate-500 hover:text-slate-300 hover:border-white/15"
                  )}>
                  {s === "all" ? "All" : STATUS_STYLE[s]?.label}
                </button>
              ))}
              {["all", ...DIRECTIONS].map((d) => d !== "all" && (
                <button key={d} onClick={() => setFilterDir(filterDir === d ? "all" : d)}
                  className={clsx(
                    "text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all",
                    filterDir === d
                      ? d === "LONG"
                        ? "border-emerald-500/30 text-emerald-400 bg-emerald-400/8"
                        : "border-red-500/30 text-red-400 bg-red-400/8"
                      : "border-white/8 text-slate-500 hover:text-slate-300"
                  )}>
                  {d === "LONG" ? "▲" : "▼"} {d}
                </button>
              ))}
            </div>
          )}

          {/* Trade list */}
          {filtered.length === 0 ? (
            <div className="glass-card py-16 text-center space-y-3">
              <BookOpen size={36} className="mx-auto text-slate-800" />
              <p className="text-slate-500 text-sm">
                {trades.length === 0
                  ? "No trades logged yet. Start tracking your edge."
                  : "No trades match your filters."}
              </p>
              {trades.length === 0 && (
                <button className="btn-ember mx-auto mt-2" onClick={() => setShowForm(true)}>
                  <Plus size={13} /> Log Your First Trade
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((trade) => (
                <TradeCard
                  key={trade._id}
                  trade={trade}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Analytics ───────────────────────────────────────── */}
      {activeTab === "analytics" && (
        <Analytics stats={stats} loading={statsLoading} />
      )}
    </div>
  );
}
