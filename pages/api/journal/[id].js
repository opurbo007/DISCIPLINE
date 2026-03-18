/**
 * pages/api/journal/[id].js
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET    /api/journal/:id  → fetch single trade
 *  PUT    /api/journal/:id  → update trade (partial update supported)
 *  DELETE /api/journal/:id  → delete trade
 */

import { getServerSession } from "next-auth/next";
import { authOptions }      from "@/pages/api/auth/[...nextauth]";
import dbConnect            from "@/lib/mongodb";
import Trade                from "@/lib/models/Trade";
import mongoose             from "mongoose";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

  const { id } = req.query;
  if (!mongoose.isValidObjectId(id))
    return res.status(400).json({ success: false, error: "Invalid trade ID" });

  await dbConnect();
  const userId = session.user.id;

  if (req.method === "GET") {
    const trade = await Trade.findOne({ _id: id, userId }).lean();
    if (!trade) return res.status(404).json({ success: false, error: "Trade not found" });
    return res.status(200).json({ success: true, data: trade });
  }

  if (req.method === "PUT") {
    try {
      const allowed = [
        "coin", "direction", "setup",
        "tradeAmount", "leverage",
        "entryPrice", "stopLoss", "takeProfit",
        "exitPrice", "netPnl", "status",
        "reason", "outcome", "mood", "tags", "tradeDate", "closedAt",
      ];

      // Find, update fields, then save (so pre-save hook recalculates R:R etc.)
      const trade = await Trade.findOne({ _id: id, userId });
      if (!trade) return res.status(404).json({ success: false, error: "Trade not found" });

      allowed.forEach((key) => {
        if (req.body[key] !== undefined) {
          const numFields = ["tradeAmount", "leverage", "entryPrice", "stopLoss", "takeProfit", "exitPrice", "netPnl"];
          if (numFields.includes(key)) {
            trade[key] = req.body[key] !== "" && req.body[key] !== null
              ? parseFloat(req.body[key])
              : null;
          } else if (key === "tradeDate" || key === "closedAt") {
            trade[key] = req.body[key] ? new Date(req.body[key]) : null;
          } else {
            trade[key] = req.body[key];
          }
        }
      });

      // Auto-set closedAt when status transitions to CLOSED
      if (req.body.status === "CLOSED" && !trade.closedAt) {
        trade.closedAt = new Date();
      }

      await trade.save();
      return res.status(200).json({ success: true, data: trade.toObject() });
    } catch (err) {
      if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ success: false, error: messages.join(", ") });
      }
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === "DELETE") {
    const trade = await Trade.findOneAndDelete({ _id: id, userId });
    if (!trade) return res.status(404).json({ success: false, error: "Trade not found" });
    return res.status(200).json({ success: true, data: { _id: id } });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
