/**
 * components/Portfolio/CoinSearch.js
 * ─────────────────────────────────────────────────────────────────────────────
 * A glassmorphic combobox that searches the entire CoinGecko catalogue
 * (~14 000 coins) in real time as the user types.
 *
 * Features:
 *  – 300 ms debounce → saves API calls while typing
 *  – Shows coin thumbnail, symbol, name, and market-cap rank
 *  – Keyboard navigation (↑ ↓ Enter Escape)
 *  – Click-outside closes the dropdown
 *  – Disabled state for edit mode (coin can't be changed after adding)
 *  – Graceful error / empty state
 *  – When a coin is selected its current CoinGecko price is auto-filled
 *    into the purchase price field if the field is still empty
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, AlertCircle, ChevronDown, X } from "lucide-react";
import clsx from "clsx";

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ── Market cap rank badge ─────────────────────────────────────────────────────
function RankBadge({ rank }) {
  if (!rank) return null;
  return (
    <span className="text-[9px] font-mono text-slate-700 bg-white/5 border border-white/8 px-1 py-0.5 rounded shrink-0">
      #{rank}
    </span>
  );
}

export default function CoinSearch({ value, onChange, onPriceHint, disabled }) {
  const [query,    setQuery]    = useState(value?.name || "");
  const [results,  setResults]  = useState([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [cursor,   setCursor]   = useState(-1);   // keyboard nav index

  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);
  const debouncedQ  = useDebounce(query, 300);

  // ── Fetch search results ───────────────────────────────────────────────────
  const search = useCallback(async (q) => {
    if (!q || q.length < 1) { setResults([]); return; }

    setLoading(true);
    setError("");

    try {
      const res  = await fetch(`/api/coins/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.coins || []);
      setCursor(-1);
    } catch {
      setError("Search failed. Check connection.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQ && open) search(debouncedQ);
  }, [debouncedQ, open, search]);

  // ── Click outside closes dropdown ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current    && !inputRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Select a coin ──────────────────────────────────────────────────────────
  const selectCoin = useCallback(async (coin) => {
    setQuery(`${coin.symbol} — ${coin.name}`);
    setOpen(false);
    setResults([]);

    // Build the coin object for the parent form
    const selected = {
      coinId: coin.id,
      symbol: coin.symbol,
      name:   coin.name,
      icon:   coin.thumb || "◎",  // use thumbnail as icon reference
    };
    onChange(selected);

    // Optionally auto-fill current price from CoinGecko
    if (onPriceHint) {
      try {
        const r = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd&precision=2`
        );
        const d = await r.json();
        const price = d[coin.id]?.usd;
        if (price) onPriceHint(price);
      } catch {
        /* price hint is best-effort, ignore errors */
      }
    }
  }, [onChange, onPriceHint]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && cursor >= 0) {
      e.preventDefault();
      selectCoin(results[cursor]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const clearSelection = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange(null);
    inputRef.current?.focus();
  };

  const hasSelection = !!value?.coinId;

  return (
    <div className="relative">
      {/* ── Input ─────────────────────────────────────────────────── */}
      <div className="relative">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          className={clsx(
            "glass-input pl-8 pr-8 truncate",
            disabled && "opacity-50 cursor-not-allowed",
            hasSelection && "text-[#00d4ff]"
          )}
          placeholder="Search any coin… (BTC, ETH, PEPE…)"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange(null);
          }}
          onFocus={() => { if (!disabled) setOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        {/* Right icons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 size={12} className="text-slate-600 animate-spin" />}
          {hasSelection && !disabled && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-slate-600 hover:text-slate-300 transition-colors p-0.5"
            >
              <X size={12} />
            </button>
          )}
          {!loading && !hasSelection && (
            <ChevronDown
              size={12}
              className={clsx("text-slate-700 transition-transform", open && "rotate-180")}
            />
          )}
        </div>
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────── */}
      {open && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-white/10 overflow-hidden"
          style={{
            background:    "rgba(8,12,20,0.97)",
            backdropFilter: "blur(24px)",
            boxShadow:     "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,212,255,0.08)",
            maxHeight:     "280px",
            overflowY:     "auto",
          }}
        >
          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-red-400">
              <AlertCircle size={12} /> {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && results.length === 0 && query.length > 0 && (
            <div className="px-3 py-4 text-center text-xs text-slate-600 font-mono">
              No coins found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Hint when nothing typed yet */}
          {!loading && !error && results.length === 0 && query.length === 0 && (
            <div className="px-3 py-3 text-xs text-slate-700 font-mono text-center">
              Start typing to search 14 000+ coins
            </div>
          )}

          {/* Results */}
          {results.map((coin, i) => (
            <button
              key={coin.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectCoin(coin); }}
              onMouseEnter={() => setCursor(i)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                cursor === i
                  ? "bg-[rgba(0,212,255,0.08)] text-white"
                  : "hover:bg-white/[0.04] text-slate-300"
              )}
            >
              {/* Thumbnail */}
              {coin.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coin.thumb}
                  alt={coin.symbol}
                  width={22}
                  height={22}
                  className="rounded-full shrink-0 bg-white/5"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <div className="w-[22px] h-[22px] rounded-full bg-white/8 shrink-0 flex items-center justify-center text-[10px] text-slate-500">
                  ?
                </div>
              )}

              {/* Symbol + name */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-bold leading-none">
                  {coin.symbol}
                </p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5 leading-none">
                  {coin.name}
                </p>
              </div>

              {/* Rank */}
              <RankBadge rank={coin.marketCapRank} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
