/**
 * pages/api/journal/stats.js
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/journal/stats
 *
 * Returns pre-aggregated analytics for the user's trade journal:
 *   totalTrades, wins, losses, winRate, totalPnl, avgPnl,
 *   avgRR, bestTrade, worstTrade, avgLeverage,
 *   byDirection { LONG, SHORT }, byMood, bySetup, streak
 */

import { getServerSession } from "next-auth/next";
import { authOptions }      from "@/pages/api/auth/[...nextauth]";
import dbConnect            from "@/lib/mongodb";
import Trade                from "@/lib/models/Trade";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  await dbConnect();
  const userId = session.user.id;

  // Only analyse CLOSED trades
  const closed = await Trade.find({ userId, status: "CLOSED" })
    .sort({ closedAt: 1, tradeDate: 1 })
    .lean();

  const total  = closed.length;
  if (total === 0) {
    return res.status(200).json({
      success: true,
      data: {
        totalTrades: 0, wins: 0, losses: 0, winRate: 0,
        totalPnl: 0, avgPnl: 0, avgRR: null,
        bestTrade: null, worstTrade: null, avgLeverage: 1,
        byDirection: {}, byMood: {}, bySetup: {},
        currentStreak: 0, longestWinStreak: 0, longestLossStreak: 0,
      },
    });
  }

  const wins   = closed.filter((t) => (t.netPnl ?? 0) > 0);
  const losses = closed.filter((t) => (t.netPnl ?? 0) <= 0);

  const totalPnl  = closed.reduce((s, t) => s + (t.netPnl ?? 0), 0);
  const avgPnl    = totalPnl / total;
  const avgRR     = closed.filter((t) => t.rrRatio).reduce((s, t) => s + t.rrRatio, 0)
                  / (closed.filter((t) => t.rrRatio).length || 1);
  const avgLev    = closed.reduce((s, t) => s + (t.leverage ?? 1), 0) / total;

  const bestTrade  = [...closed].sort((a, b) => (b.netPnl ?? 0) - (a.netPnl ?? 0))[0];
  const worstTrade = [...closed].sort((a, b) => (a.netPnl ?? 0) - (b.netPnl ?? 0))[0];

  // By direction
  const byDirection = {};
  ["LONG", "SHORT"].forEach((dir) => {
    const grp = closed.filter((t) => t.direction === dir);
    const gPnl = grp.reduce((s, t) => s + (t.netPnl ?? 0), 0);
    byDirection[dir] = {
      count: grp.length,
      wins:  grp.filter((t) => (t.netPnl ?? 0) > 0).length,
      pnl:   gPnl,
    };
  });

  // By mood
  const byMood = {};
  closed.forEach((t) => {
    const m = t.mood || "neutral";
    if (!byMood[m]) byMood[m] = { count: 0, pnl: 0, wins: 0 };
    byMood[m].count++;
    byMood[m].pnl  += (t.netPnl ?? 0);
    if ((t.netPnl ?? 0) > 0) byMood[m].wins++;
  });

  // By setup
  const bySetup = {};
  closed.forEach((t) => {
    const s = t.setup || "untagged";
    if (!bySetup[s]) bySetup[s] = { count: 0, pnl: 0, wins: 0 };
    bySetup[s].count++;
    bySetup[s].pnl  += (t.netPnl ?? 0);
    if ((t.netPnl ?? 0) > 0) bySetup[s].wins++;
  });

  // Win / loss streaks (iterate chronologically)
  let currentStreak = 0, longestWin = 0, longestLoss = 0;
  let runLen = 0, runType = null;
  closed.forEach((t) => {
    const isWin = (t.netPnl ?? 0) > 0;
    if (runType === null || runType !== isWin) { runType = isWin; runLen = 1; }
    else runLen++;
    if (isWin)  longestWin  = Math.max(longestWin,  runLen);
    else        longestLoss = Math.max(longestLoss, runLen);
  });
  // Current streak (from end)
  const lastType = (closed[closed.length - 1]?.netPnl ?? 0) > 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    if (((closed[i]?.netPnl ?? 0) > 0) === lastType) currentStreak++;
    else break;
  }
  currentStreak = lastType ? currentStreak : -currentStreak; // positive = win streak, negative = loss

  return res.status(200).json({
    success: true,
    data: {
      totalTrades:       total,
      wins:              wins.length,
      losses:            losses.length,
      winRate:           parseFloat(((wins.length / total) * 100).toFixed(1)),
      totalPnl:          parseFloat(totalPnl.toFixed(2)),
      avgPnl:            parseFloat(avgPnl.toFixed(2)),
      avgRR:             parseFloat(avgRR.toFixed(2)),
      bestTrade,
      worstTrade,
      avgLeverage:       parseFloat(avgLev.toFixed(1)),
      byDirection,
      byMood,
      bySetup,
      currentStreak,
      longestWinStreak:  longestWin,
      longestLossStreak: longestLoss,
    },
  });
}
