/**
 * components/Portfolio/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Fully dynamic crypto portfolio tracker.
 * Supports ANY coin from CoinGecko's 14,000+ catalogue — no fixed list.
 *
 * Architecture:
 *  • /api/portfolio        → user's holdings (MongoDB)
 *  • /api/portfolio/prices → live prices for exactly the user's coins (CoinGecko)
 *  • CoinSearch component  → search + select any coin while adding a holding
 *
 * Features:
 *  – Add any coin via live search (14,000+ coins, debounced, keyboard nav)
 *  – Current price auto-filled on coin selection
 *  – Multiple lots per coin with weighted average cost
 *  – P&L in $ and % per lot and aggregated per coin
 *  – Sortable table columns
 *  – Expand coin row → see individual lots with edit / delete
 *  – Summary cards: invested · value · total P&L · best performer
 *  – Real coin logos from CoinGecko for any coin
 */

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import {
  Plus, Trash2, Pencil, X, Check, TrendingUp, TrendingDown,
  DollarSign, Wallet, BarChart3, Award, ChevronUp, ChevronDown,
  ChevronsUpDown, Loader2, AlertCircle, Calendar, FileText,
  RefreshCw,
} from "lucide-react";
import clsx from "clsx";
import CoinSearch from "./CoinSearch";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt$ = (n, dp = 2) =>
  n == null ? "—"
  : `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

const fmtUnits = (n) =>
  n == null ? "—"
  : n < 0.0001  ? n.toFixed(8)
  : n < 1       ? n.toFixed(6)
  : n < 1000    ? n.toFixed(4)
  : n.toLocaleString("en-US", { maximumFractionDigits: 2 });

const fmtPct = (n) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const pnlClass = (n) =>
  n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-slate-500";

const pnlBg = (n) =>
  n > 0 ? "bg-emerald-400/10 text-emerald-400"
  : n < 0 ? "bg-red-400/10 text-red-400"
  : "bg-white/5 text-slate-500";

// ── Coin logo — handles CoinGecko thumbnail URLs and emoji fallbacks ───────────
function CoinLogo({ icon, symbol, size = 32 }) {
  const isUrl = icon && (icon.startsWith("http") || icon.startsWith("//"));
  if (isUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt={symbol}
        width={size}
        height={size}
        className="rounded-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          e.currentTarget.nextSibling?.style && (e.currentTarget.nextSibling.style.display = "flex");
        }}
      />
    );
  }
  return (
    <div
      className="rounded-lg flex items-center justify-center font-bold text-slate-400"
      style={{
        width: size, height: size, fontSize: size * 0.45,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {icon || symbol?.[0] || "?"}
    </div>
  );
}

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color = "arc", trend }) {
  const colorMap = {
    arc:   { text: "text-[#00d4ff]",   bg: "bg-[rgba(0,212,255,0.08)]",  card: "glass-card-arc"   },
    ember: { text: "text-[#f59e0b]",   bg: "bg-[rgba(245,158,11,0.08)]", card: "glass-card-ember" },
    bull:  { text: "text-emerald-400", bg: "bg-emerald-400/10",           card: "glass-card-bull"  },
    bear:  { text: "text-red-400",     bg: "bg-red-400/10",               card: "glass-card-bear"  },
  };
  const c = colorMap[color];
  return (
    <div className={clsx("p-5 flex flex-col gap-3", c.card)}>
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-xs font-mono uppercase tracking-wider">{label}</span>
        <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", c.bg)}>
          <Icon size={15} className={c.text} />
        </div>
      </div>
      <div>
        <p className={clsx("font-mono font-bold text-2xl leading-none", c.text)}>{value}</p>
        {sub && <p className="text-slate-600 text-xs font-mono mt-1.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={clsx("inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-full self-start", pnlBg(trend))}>
          {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {fmtPct(trend)}
        </div>
      )}
    </div>
  );
}

// ── Add / Edit holding form ───────────────────────────────────────────────────
function HoldingForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [selectedCoin,  setSelectedCoin]  = useState(
    initial.coinId
      ? { coinId: initial.coinId, symbol: initial.symbol, name: initial.name, icon: initial.icon }
      : null
  );
  const [units,          setUnits]          = useState(initial.units         || "");
  const [purchasePrice,  setPurchasePrice]  = useState(initial.purchasePrice || "");
  const [purchaseDate,   setPurchaseDate]   = useState(
    initial.purchaseDate
      ? new Date(initial.purchaseDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [notes,          setNotes]          = useState(initial.notes || "");
  const [coinError,      setCoinError]      = useState("");

  // When a coin is selected, auto-fill current price into empty price field
  const handlePriceHint = useCallback((price) => {
    if (!purchasePrice) setPurchasePrice(String(price));
  }, [purchasePrice]);

  const handleCoinChange = useCallback((coin) => {
    setSelectedCoin(coin);
    setCoinError("");
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCoin?.coinId) {
      setCoinError("Please select a coin from the dropdown.");
      return;
    }
    if (!units || !purchasePrice) return;

    onSubmit({
      coinId:        selectedCoin.coinId,
      symbol:        selectedCoin.symbol,
      name:          selectedCoin.name,
      icon:          selectedCoin.icon || "◎",
      units:         parseFloat(units),
      purchasePrice: parseFloat(purchasePrice),
      purchaseDate,
      notes,
    });
  };

  const totalCost = units && purchasePrice
    ? parseFloat(units) * parseFloat(purchasePrice)
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Coin search */}
        <div>
          <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-1.5 block">
            Coin *
          </label>
          <CoinSearch
            value={selectedCoin}
            onChange={handleCoinChange}
            onPriceHint={handlePriceHint}
            disabled={!!initial._id}
          />
          {coinError && (
            <p className="text-[10px] text-red-400 mt-1 font-mono flex items-center gap-1">
              <AlertCircle size={9} />{coinError}
            </p>
          )}
        </div>

        {/* Units */}
        <div>
          <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-1.5 block">
            Units *
          </label>
          <input
            type="number" step="any" min="0"
            className="glass-input font-mono"
            placeholder="0.5"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            required
          />
        </div>

        {/* Buy price */}
        <div>
          <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-1.5 block">
            Buy Price (USD) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-mono text-sm">$</span>
            <input
              type="number" step="any" min="0"
              className="glass-input font-mono pl-6"
              placeholder="65000"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              required
            />
          </div>
          {selectedCoin && !purchasePrice && (
            <p className="text-[10px] text-slate-700 mt-1 font-mono">← auto-fills on coin select</p>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-1.5 block">
            <Calendar size={9} className="inline mr-1" />Date
          </label>
          <input
            type="date"
            className="glass-input font-mono"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-1.5 block">
          <FileText size={9} className="inline mr-1" />Notes (optional)
        </label>
        <input
          className="glass-input"
          placeholder='e.g. "Bought the dip at support"'
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Preview row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {selectedCoin && (
          <div className="flex items-center gap-2.5">
            <CoinLogo icon={selectedCoin.icon} symbol={selectedCoin.symbol} size={22} />
            <span className="text-xs font-mono text-slate-400">
              <span className="text-white font-bold">{selectedCoin.symbol}</span>
              {" · "}{selectedCoin.name}
            </span>
          </div>
        )}
        {totalCost !== null && (
          <p className="text-xs text-slate-500 font-mono ml-auto">
            Total invested:{" "}
            <span className="text-[#00d4ff] font-bold">{fmt$(totalCost)}</span>
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-arc" disabled={loading}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {loading ? "Saving…" : initial._id ? "Update Holding" : "Add to Portfolio"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          <X size={13} /> Cancel
        </button>
      </div>
    </form>
  );
}

// ── Sort header button ────────────────────────────────────────────────────────
function SortBtn({ col, sort, setSort, children }) {
  const active = sort.col === col;
  return (
    <button
      onClick={() => setSort((s) =>
        s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" }
      )}
      className={clsx(
        "flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors",
        active ? "text-[#00d4ff]" : "text-slate-600 hover:text-slate-400"
      )}
    >
      {children}
      {active
        ? sort.dir === "desc" ? <ChevronDown size={10} /> : <ChevronUp size={10} />
        : <ChevronsUpDown size={10} />}
    </button>
  );
}

// ── Individual lot row (inside expanded coin) ─────────────────────────────────
function LotRow({ lot, currentPrice, onDelete, onEdit }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const cost      = lot.units * lot.purchasePrice;
  const value     = currentPrice != null ? lot.units * currentPrice : null;
  const pnlDollar = value != null ? value - cost : null;
  const pnlPct    = currentPrice
    ? ((currentPrice - lot.purchasePrice) / lot.purchasePrice) * 100
    : null;

  return (
    <tr className="border-b border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.025] transition-colors group">
      <td className="px-4 py-2.5 pl-16">
        <div className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
          <div>
            <p className="text-slate-500 text-xs font-mono">
              {new Date(lot.purchaseDate).toLocaleDateString("en-US", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </p>
            {lot.notes && (
              <p className="text-slate-700 text-[10px] truncate max-w-[180px]">{lot.notes}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-slate-500 text-right tabular-nums">{fmtUnits(lot.units)}</td>
      <td className="px-4 py-2.5 font-mono text-xs text-slate-500 text-right tabular-nums">{fmt$(lot.purchasePrice)}</td>
      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 text-right tabular-nums">
        {currentPrice != null ? fmt$(currentPrice) : "—"}
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-slate-400 text-right tabular-nums">
        {value != null ? fmt$(value) : "—"}
      </td>
      <td className={clsx("px-4 py-2.5 font-mono text-xs text-right tabular-nums font-semibold", pnlClass(pnlDollar))}>
        {pnlDollar != null ? <>{pnlDollar >= 0 ? "+" : "-"}{fmt$(pnlDollar)}</> : "—"}
      </td>
      <td className="px-4 py-2.5 text-right">
        {pnlPct != null
          ? <span className={clsx("text-[10px] font-mono", pnlClass(pnlPct))}>{fmtPct(pnlPct)}</span>
          : "—"}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 rounded text-slate-600 hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-colors">
            <Pencil size={11} />
          </button>
          {confirmDel ? (
            <>
              <button onClick={onDelete} className="p-1 rounded text-red-400 hover:bg-red-400/10"><Check size={11} /></button>
              <button onClick={() => setConfirmDel(false)} className="p-1 rounded text-slate-600 hover:bg-white/5"><X size={11} /></button>
            </>
          ) : (
            <button onClick={() => setConfirmDel(true)} className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors">
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Aggregated coin row ───────────────────────────────────────────────────────
function CoinRow({ coin, priceData, onDeleteLot, onEditLot, editingId, setEditingId }) {
  const [expanded, setExpanded] = useState(false);

  // Use enriched price data from the portfolio/prices endpoint
  const liveData     = priceData || null;
  const currentPrice = liveData?.price ?? null;
  // Prefer live logo from CoinGecko's /coins/markets; fall back to stored icon
  const displayIcon  = liveData?.thumb || coin.icon;

  const totalUnits   = coin.lots.reduce((s, l) => s + l.units, 0);
  const totalCost    = coin.lots.reduce((s, l) => s + l.units * l.purchasePrice, 0);
  const avgPrice     = totalCost / totalUnits;
  const currentValue = currentPrice != null ? totalUnits * currentPrice : null;
  const pnlDollar    = currentValue != null ? currentValue - totalCost : null;
  const pnlPct       = currentPrice != null
    ? ((currentPrice - avgPrice) / avgPrice) * 100
    : null;

  return (
    <>
      <tr
        className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Coin identity */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <CoinLogo icon={displayIcon} symbol={coin.symbol} size={32} />
            <div>
              <p className="text-white font-mono font-bold text-sm leading-none">{coin.symbol}</p>
              <p className="text-slate-600 text-[10px] mt-0.5 truncate max-w-[100px]">{coin.name}</p>
            </div>
            {coin.lots.length > 1 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-slate-600">
                {coin.lots.length} lots
              </span>
            )}
          </div>
        </td>

        <td className="px-4 py-3.5 font-mono text-sm text-slate-300 text-right tabular-nums">
          {fmtUnits(totalUnits)}
        </td>
        <td className="px-4 py-3.5 font-mono text-sm text-slate-400 text-right tabular-nums">
          {fmt$(avgPrice)}
        </td>
        <td className="px-4 py-3.5 font-mono text-sm text-white text-right tabular-nums">
          {currentPrice != null ? fmt$(currentPrice) : <span className="text-slate-700">—</span>}
        </td>
        <td className="px-4 py-3.5 font-mono text-sm text-white font-bold text-right tabular-nums">
          {currentValue != null ? fmt$(currentValue) : "—"}
        </td>
        <td className={clsx("px-4 py-3.5 font-mono text-sm text-right tabular-nums font-bold", pnlClass(pnlDollar))}>
          {pnlDollar != null ? <>{pnlDollar >= 0 ? "+" : "-"}{fmt$(pnlDollar)}</> : "—"}
        </td>
        <td className="px-4 py-3.5 text-right">
          {pnlPct != null ? (
            <span className={clsx("inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-full", pnlBg(pnlPct))}>
              {pnlPct >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {fmtPct(pnlPct)}
            </span>
          ) : "—"}
        </td>
        <td className="px-4 py-3.5 text-center">
          <span className="text-slate-700">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </td>
      </tr>

      {/* Expanded lots */}
      {expanded && coin.lots.map((lot) =>
        editingId === lot._id ? (
          <tr key={lot._id} className="bg-[rgba(0,212,255,0.02)] border-b border-white/[0.04]">
            <td colSpan={8} className="px-4 py-4">
              <HoldingForm
                initial={lot}
                onSubmit={(data) => onEditLot(lot._id, data)}
                onCancel={() => setEditingId(null)}
                loading={false}
              />
            </td>
          </tr>
        ) : (
          <LotRow
            key={lot._id}
            lot={lot}
            currentPrice={currentPrice}
            onDelete={() => onDeleteLot(lot._id)}
            onEdit={() => setEditingId(lot._id)}
          />
        )
      )}
    </>
  );
}

// ── Main Portfolio ────────────────────────────────────────────────────────────
export default function Portfolio() {
  const [showForm,  setShowForm]  = useState(false);
  const [adding,    setAdding]    = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [sort,      setSort]      = useState({ col: "value", dir: "desc" });

  // Holdings from MongoDB
  const { data: holdingsData, mutate: mutateHoldings } = useSWR("/api/portfolio");
  const holdings = holdingsData?.data || [];

  // Live prices for exactly the coins in this user's portfolio
  const {
    data: priceData,
    isLoading: pricesLoading,
    mutate: mutatePrices,
  } = useSWR("/api/portfolio/prices", {
    refreshInterval:      120_000,
    revalidateOnFocus:    false,
    revalidateOnReconnect: false,
  });

  const prices = priceData?.prices || {};  // { [coinId]: { price, change24h, name, symbol, thumb } }

  // Aggregate holdings by coin
  const aggregated = useMemo(() => {
    const map = {};
    holdings.forEach((lot) => {
      if (!map[lot.coinId]) {
        map[lot.coinId] = {
          coinId: lot.coinId,
          symbol: lot.symbol,
          name:   lot.name,
          icon:   lot.icon,
          lots:   [],
        };
      }
      map[lot.coinId].lots.push(lot);
    });
    return Object.values(map);
  }, [holdings]);

  // Summary stats
  const stats = useMemo(() => {
    let totalInvested = 0, totalValue = 0;
    let bestPct = -Infinity, bestSymbol = "—";

    aggregated.forEach((coin) => {
      const costSum  = coin.lots.reduce((s, l) => s + l.units * l.purchasePrice, 0);
      const unitsSum = coin.lots.reduce((s, l) => s + l.units, 0);
      const liveP    = prices[coin.coinId]?.price;
      const val      = liveP != null ? unitsSum * liveP : 0;

      totalInvested += costSum;
      totalValue    += val;

      if (liveP != null) {
        const avgP = costSum / unitsSum;
        const pct  = ((liveP - avgP) / avgP) * 100;
        if (pct > bestPct) { bestPct = pct; bestSymbol = coin.symbol; }
      }
    });

    const pnl    = totalValue - totalInvested;
    const pnlPct = totalInvested ? (pnl / totalInvested) * 100 : 0;
    return { totalInvested, totalValue, pnl, pnlPct, bestSymbol, bestPct };
  }, [aggregated, prices]);

  // Sorted coin rows
  const sorted = useMemo(() => {
    return [...aggregated].sort((a, b) => {
      const getV = (c) => {
        const units = c.lots.reduce((s, l) => s + l.units, 0);
        const cost  = c.lots.reduce((s, l) => s + l.units * l.purchasePrice, 0);
        const liveP = prices[c.coinId]?.price;
        const val   = liveP != null ? units * liveP : 0;
        const pnl   = val - cost;
        const pct   = liveP != null ? ((liveP - cost / units) / (cost / units)) * 100 : 0;
        return { units, value: val, pnl, pct };
      };
      const av = getV(a), bv = getV(b);
      const cm = { units: [av.units, bv.units], value: [av.value, bv.value], pnl: [av.pnl, bv.pnl], pct: [av.pct, bv.pct] };
      const [va, vb] = cm[sort.col] || [0, 0];
      return sort.dir === "desc" ? vb - va : va - vb;
    });
  }, [aggregated, prices, sort]);

  // CRUD
  const handleAdd = async (formData) => {
    setAdding(true);
    try {
      await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      await mutateHoldings();
      await mutatePrices();   // refresh prices to include the new coin
      setShowForm(false);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    mutateHoldings({ data: holdings.filter((h) => h._id !== id) }, { revalidate: false });
    await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
    mutateHoldings();
    mutatePrices();
  };

  const handleEdit = async (id, data) => {
    await fetch(`/api/portfolio/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditingId(null);
    mutateHoldings();
  };

  const coinsWithoutPrice = aggregated.filter((c) => prices[c.coinId]?.price == null).map((c) => c.symbol);

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Wallet size={18} className="text-[#00d4ff]" />
          <h2 className="font-display text-3xl tracking-wider text-white">MY PORTFOLIO</h2>
          <span className="text-xs font-mono text-slate-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
            {aggregated.length} coin{aggregated.length !== 1 ? "s" : ""} · {holdings.length} lot{holdings.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => mutatePrices()}
            className="btn-ghost text-xs"
            title="Refresh prices"
          >
            <RefreshCw size={12} className={pricesLoading ? "animate-spin" : ""} />
          </button>
          <button className="btn-arc" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancel" : "Add Holding"}
          </button>
        </div>
      </div>

      {/* ── Summary cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Invested" icon={DollarSign} color="arc"
          value={fmt$(stats.totalInvested)}
          sub={`${holdings.length} purchase${holdings.length !== 1 ? "s" : ""}`} />
        <StatCard label="Current Value" icon={BarChart3} color="ember"
          value={fmt$(stats.totalValue)} sub="Live prices" />
        <StatCard
          label="Total P&L"
          icon={stats.pnl >= 0 ? TrendingUp : TrendingDown}
          color={stats.pnl >= 0 ? "bull" : "bear"}
          value={`${stats.pnl >= 0 ? "+" : ""}${fmt$(stats.pnl)}`}
          trend={stats.pnlPct}
        />
        <StatCard label="Best Performer" icon={Award} color="arc"
          value={stats.bestSymbol}
          sub={stats.bestPct > -Infinity ? fmtPct(stats.bestPct) : "Add coins to track"} />
      </div>

      {/* ── Add form ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="glass-card-arc p-5 animate-fade-up">
          <p className="text-[11px] text-slate-500 font-mono uppercase tracking-wider mb-4">
            New Holding — Search any of 14,000+ coins
          </p>
          <HoldingForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} loading={adding} />
        </div>
      )}

      {/* ── Price warning for coins not resolved ─────────────────────── */}
      {coinsWithoutPrice.length > 0 && !pricesLoading && (
        <div className="glass-card border-amber-500/20 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-400/80">
          <AlertCircle size={12} className="shrink-0 text-amber-400" />
          Prices not yet loaded for: <span className="font-mono text-amber-400">{coinsWithoutPrice.join(", ")}</span>
          &nbsp;—&nbsp;
          <button onClick={() => mutatePrices()} className="underline hover:text-amber-300">retry</button>
        </div>
      )}

      {/* ── Holdings table ───────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="glass-card py-16 text-center space-y-3">
          <Wallet size={40} className="mx-auto text-slate-800" />
          <p className="text-slate-500 text-sm">No holdings yet.</p>
          <p className="text-slate-700 text-xs">
            Search and add any crypto — Bitcoin, Ethereum, PEPE, and 14,000+ more.
          </p>
          <button className="btn-arc mx-auto mt-2" onClick={() => setShowForm(true)}>
            <Plus size={13} /> Add Your First Coin
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {[
                    { label: "Coin",          col: null,    align: "left"   },
                    { label: "Units",         col: "units", align: "right"  },
                    { label: "Avg Buy Price", col: null,    align: "right"  },
                    { label: "Current Price", col: null,    align: "right"  },
                    { label: "Value",         col: "value", align: "right"  },
                    { label: "P&L ($)",       col: "pnl",   align: "right"  },
                    { label: "P&L (%)",       col: "pct",   align: "right"  },
                    { label: "",              col: null,    align: "center" },
                  ].map(({ label, col, align }, i) => (
                    <th key={i} className={clsx("px-4 py-3 bg-white/[0.02]", `text-${align}`)}>
                      {col ? (
                        <SortBtn col={col} sort={sort} setSort={setSort}>{label}</SortBtn>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600">{label}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((coin) => (
                  <CoinRow
                    key={coin.coinId}
                    coin={coin}
                    priceData={prices[coin.coinId]}
                    onDeleteLot={handleDelete}
                    onEditLot={handleEdit}
                    editingId={editingId}
                    setEditingId={setEditingId}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/[0.02]">
                  <td colSpan={4} className="px-4 py-3 text-slate-500 font-mono text-xs uppercase tracking-wider">
                    Portfolio Total
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-white text-right tabular-nums">
                    {fmt$(stats.totalValue)}
                  </td>
                  <td className={clsx("px-4 py-3 font-mono font-bold text-right tabular-nums", pnlClass(stats.pnl))}>
                    {stats.pnl >= 0 ? "+" : "-"}{fmt$(stats.pnl)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={clsx("inline-flex items-center gap-1 text-sm font-mono font-bold px-2.5 py-1 rounded-full", pnlBg(stats.pnlPct))}>
                      {stats.pnlPct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {fmtPct(stats.pnlPct)}
                    </span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      {priceData?.timestamp && (
        <p className="text-[10px] text-slate-700 font-mono text-right">
          Prices via CoinGecko · {new Date(priceData.timestamp).toLocaleTimeString()} · Not financial advice.
        </p>
      )}
    </div>
  );
}
