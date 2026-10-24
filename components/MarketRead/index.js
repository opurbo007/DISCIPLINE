/**
 * components/MarketRead/index.js
 * Market Read dashboard — replicates the image with accurate data.
 */

import { Activity, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ShieldCheck, AlertTriangle } from "lucide-react";
import clsx from "clsx";

export default function MarketRead() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-600/20 border border-emerald-400/20 flex items-center justify-center">
          <Activity size={15} className="text-emerald-300" />
        </span>
        <div>
          <h2 className="text-[14px] font-semibold text-white tracking-tight">Current Market Read</h2>
          <p className="text-[11.5px] text-zinc-500">Live BTC analysis · ETF flows · cycle score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT PANEL: PRICE ACTION */}
        <div className="card p-5 border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.04] to-transparent">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Price Action</h3>
            <span className="ml-auto text-[10px] font-mono text-zinc-500">BTC/USD</span>
          </div>

          <div className="mb-3">
            <p className="text-[11px] text-zinc-500 font-medium">BTC Price (Close)</p>
            <p className="text-[28px] font-extrabold text-emerald-300 tracking-tight leading-none">
              $80,860.01
            </p>
            <p className="text-[12px] text-zinc-500 mt-1 font-mono">24h Range: $80,513.00 – $82,060.88</p>
          </div>

          {/* Mini chart */}
          <div className="relative h-28 mb-4 rounded-xl overflow-hidden bg-black/40 border border-white/[0.05]">
            <svg viewBox="0 0 300 80" preserveAspectRatio="none" className="w-full h-full">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points="0,50 30,55 60,40 90,35 120,48 150,30 180,45 210,20 240,42 270,15 300,5 300,80 0,80" fill="url(#lineGrad)" />
              <polyline fill="none" stroke="#34d399" strokeWidth="2" points="0,50 30,55 60,40 90,35 120,48 150,30 180,45 210,20 240,42 270,15 300,5" />
            </svg>
            <div className="absolute top-1 left-2 text-[9px] text-zinc-600">823k</div>
            <div className="absolute bottom-1 left-2 text-[9px] text-zinc-600">809k</div>
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-zinc-600">24h Ago</div>
            <div className="absolute bottom-1 right-2 text-[9px] text-zinc-600">Now</div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <TrendingUp size={12} className="text-amber-300" /> Structure:
              </span>
              <span className="font-semibold text-amber-300">Consolidating near support</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <ArrowUpRight size={12} className="text-emerald-300" /> Key Support:
              </span>
              <span className="font-mono font-bold text-emerald-300">$80,513</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <ArrowDownRight size={12} className="text-red-300" /> Key Resistance:
              </span>
              <span className="font-mono font-bold text-red-300">$82,060</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.05]">
            <p className="text-[11.5px] text-zinc-500 leading-relaxed">
              <span className="text-amber-300 font-semibold">Simple Read:</span>{" "}
              <span className="text-white">Bitcoin slips 0.99% to $80,860, testing local support near $80.5k amid persistent ETF outflows.</span>
            </p>
          </div>
        </div>

        {/* CENTER PANEL: CURRENT MARKET READ */}
        <div className="card p-5 border-amber-400/15 bg-gradient-to-br from-amber-400/[0.04] to-transparent flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Current Market Read</h3>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-[32px] font-black text-amber-300 tracking-tight leading-[1.05] mb-1">
              TESTING
            </h2>
            <h2 className="text-[32px] font-black text-amber-300 tracking-tight leading-[1.05] mb-4">
              CRITICAL SUPPORT
            </h2>

            <p className="text-[13px] font-semibold text-zinc-300 mb-3">Second consecutive day of ETF distribution presses prices lower.</p>

            <div className="space-y-3 text-[12px] text-zinc-400 leading-relaxed">
              <p>Bitcoin pulled back another 0.99% to $80,860, testing the lower boundary of its multi-week consolidation range around $80.5k support.</p>
              <p>Institutional ETF flows recorded another net outflow of <span className="text-red-300 font-mono font-bold">–$137.9M</span>, following yesterday&apos;s massive <span className="text-red-300 font-mono font-bold">–$635.6M</span> flush.</p>
              <p>Despite the spot weakness, derivatives leverage remains stable with neutral funding rates and subdued liquidation risk ($89.7M), while macro valuation metrics like MVRV (0.109) and NUPL (0.163) continue to anchor a healthy long-term foundation.</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.05]">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <AlertTriangle size={12} className="text-amber-300" />
              <span>Watch $80.5k — a clean break could accelerate toward $78k</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: MARKET CYCLE SCORE */}
        <div className="card p-5 border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.04] to-transparent">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-[11px] font-bold text-white uppercase tracking-widest">Market Cycle Score</h3>
          </div>

          {/* Gauge */}
          <div className="relative">
            <div className="w-48 h-24 mx-auto relative">
              <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible">
                {/* Arc background */}
                <path d="M 10 85 A 90 90 0 0 1 190 85" fill="none" stroke="#27272a" strokeWidth="16" strokeLinecap="round" />
                {/* Arc fill segments */}
                <path d="M 10 85 A 90 90 0 0 1 55 20" fill="none" stroke="#22c55e" strokeWidth="16" strokeLinecap="round" />
                <path d="M 55 20 A 90 90 0 0 1 100 15" fill="none" stroke="#84cc16" strokeWidth="16" strokeLinecap="round" />
                <path d="M 100 15 A 90 90 0 0 1 145 20" fill="none" stroke="#eab308" strokeWidth="16" strokeLinecap="round" />
                <path d="M 145 20 A 90 90 0 0 1 190 85" fill="none" stroke="#f97316" strokeWidth="16" strokeLinecap="round" />
                {/* Needle */}
                <line x1="100" y1="80" x2="80" y2="45" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                <circle cx="100" cy="80" r="5" fill="#f59e0b" />
                {/* Tick marks */}
                {[1,2,3,4,5,6,7,8,9,10].map((n) => {
                  const angle = ((n - 1) / 9) * Math.PI;
                  const x = 100 + Math.sin(angle) * 75;
                  const y = 85 - Math.cos(angle) * 75;
                  return (
                    <g key={n}>
                      <line x1={x} y1={y - 6} x2={x} y2={y - 12} stroke="#52525b" strokeWidth="1.5" />
                      <text x={x} y={y - 14} textAnchor="middle" fill="#52525b" fontSize="8" fontFamily="monospace">{n}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="text-center mt-2">
              <span className="text-[36px] font-black text-amber-300 tracking-tighter">6</span>
              <span className="text-[16px] text-zinc-500">/10</span>
            </div>
          </div>

          <div className="flex justify-between text-[9px] text-zinc-600 font-medium mt-1 px-2">
            <span>Accumulation</span>
            <span>Markup</span>
            <span>Distribution</span>
            <span>Markdown</span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-zinc-400">Cycle Stage:</span>
              <span className="text-[12px] font-bold text-amber-300">WATCHING</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-zinc-400">Consolidating near:</span>
              <span className="text-[12px] font-mono font-bold text-white">$80.5k</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-zinc-400">Next move:</span>
              <span className="text-[12px] font-bold text-emerald-300">SUPPORT HOLD</span>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-amber-400/10 border border-amber-400/20">
            <p className="text-[11.5px] text-amber-200 font-medium">Watching $80.5k support hold.</p>
            <p className="text-[10.5px] text-amber-200/70 mt-1">Break below opens risk to $78k; bounce confirms consolidation base.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
