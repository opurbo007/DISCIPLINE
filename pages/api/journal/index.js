/**
 * pages/api/journal/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET  /api/journal  → list trades for the authenticated user
 *  POST /api/journal  → create a new trade entry
 *
 * Query params for GET:
 *   status   : PLANNED | OPEN | CLOSED | CANCELLED | all (default: all)
 *   direction: LONG | SHORT | all
 *   limit    : number (default 100)
 *   page     : number (default 1)
 */

import { getServerSession } from "next-auth/next";
import { authOptions }      from "@/pages/api/auth/[...nextauth]";
import dbConnect            from "@/lib/mongodb";
import Trade                from "@/lib/models/Trade";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

  await dbConnect();
  const userId = session.user.id;

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const { status, direction, limit = 100, page = 1 } = req.query;

      const filter = { userId };
      if (status    && status    !== "all") filter.status    = status;
      if (direction && direction !== "all") filter.direction = direction;

      const skip  = (parseInt(page) - 1) * parseInt(limit);
      const total = await Trade.countDocuments(filter);
      const trades = await Trade.find(filter)
        .sort({ tradeDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      return res.status(200).json({ success: true, data: trades, total, page: parseInt(page) });
    } catch (err) {
      console.error("[GET /api/journal]", err);
      return res.status(500).json({ success: false, error: "Failed to fetch journal" });
    }
  }

  // ── POST ──────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const {
        coin, direction, setup,
        tradeAmount, leverage,
        entryPrice, stopLoss, takeProfit,
        exitPrice, netPnl, status,
        reason, outcome, mood, tags, tradeDate,
      } = req.body;

      if (!coin?.trim())    return res.status(400).json({ success: false, error: "Coin is required" });
      if (!direction)       return res.status(400).json({ success: false, error: "Direction is required" });
      if (!tradeAmount)     return res.status(400).json({ success: false, error: "Trade amount is required" });

      const trade = new Trade({
        userId,
        coin:        coin.trim().toUpperCase(),
        direction,
        setup:       setup || "",
        tradeAmount: parseFloat(tradeAmount),
        leverage:    parseFloat(leverage) || 1,
        entryPrice:  entryPrice  ? parseFloat(entryPrice)  : null,
        stopLoss:    stopLoss    ? parseFloat(stopLoss)    : null,
        takeProfit:  takeProfit  ? parseFloat(takeProfit)  : null,
        exitPrice:   exitPrice   ? parseFloat(exitPrice)   : null,
        netPnl:      netPnl !== undefined && netPnl !== "" ? parseFloat(netPnl) : null,
        status:      status || "PLANNED",
        reason:      reason  || "",
        outcome:     outcome || "",
        mood:        mood    || "",
        tags:        Array.isArray(tags) ? tags : [],
        tradeDate:   tradeDate ? new Date(tradeDate) : new Date(),
      });

      await trade.save(); // triggers pre-save hook to calculate R:R
      return res.status(201).json({ success: true, data: trade.toObject() });
    } catch (err) {
      if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ success: false, error: messages.join(", ") });
      }
      console.error("[POST /api/journal]", err);
      return res.status(500).json({ success: false, error: "Failed to create trade" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
