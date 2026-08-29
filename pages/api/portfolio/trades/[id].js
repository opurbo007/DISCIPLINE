/**
 * pages/api/portfolio/trades/[id].js
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET    /api/portfolio/trades/:id  → Fetch a single trade
 *  PUT    /api/portfolio/trades/:id  → Update a trade (sell record)
 *  DELETE /api/portfolio/trades/:id  → Delete a trade and reverse its side-effects
 *
 * Editable fields:
 *   - units (sold)
 *   - sellPrice (exitPrice)
 *   - sellDate  (tradeDate / closedAt)
 *   - notes     (outcome)
 *
 * The userId check on every operation prevents one user from
 * reading/modifying another user's trades.
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/mongodb";
import Trade from "@/lib/models/Trade";
import Holding from "@/lib/models/Holding";
import User from "@/lib/models/User";
import mongoose from "mongoose";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  const { id } = req.query;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: "Invalid trade ID" });
  }

  await dbConnect();
  const userId = session.user.id;

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const trade = await Trade.findOne({ _id: id, userId }).lean();
      if (!trade) return res.status(404).json({ success: false, error: "Not found" });
      return res.status(200).json({ success: true, data: trade });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── PUT (edit) ────────────────────────────────────────────────────────────
  if (req.method === "PUT") {
    try {
      const existing = await Trade.findOne({ _id: id, userId });
      if (!existing) {
        return res.status(404).json({ success: false, error: "Not found" });
      }

      // Read incoming fields
      const { units, sellPrice, sellDate, notes } = req.body;

      const newUnits =
        units != null && units !== "" ? Number(units) : existing.tags?.find?.((t) => t.startsWith("units:"))
          ? Number(existing.tags.find((t) => t.startsWith("units:")).split(":")[1])
          : null;

      const newPrice = sellPrice != null ? Number(sellPrice) : existing.exitPrice;
      const newDate = sellDate ? new Date(sellDate) : existing.tradeDate;
      const buyPrice = existing.entryPrice;

      if (!Number.isFinite(newUnits) || newUnits <= 0) {
        return res.status(400).json({ success: false, error: "Units must be > 0" });
      }
      if (!Number.isFinite(newPrice) || newPrice <= 0) {
        return res.status(400).json({ success: false, error: "Sell price must be > 0" });
      }

      // Reverse the previous sell's cash impact, then re-apply with new values
      const oldTradeAmount = existing.tradeAmount;
      const newTradeAmount = newUnits * newPrice;
      const cashDelta = newTradeAmount - oldTradeAmount;
      if (cashDelta !== 0) {
        await User.updateOne({ _id: userId }, { $inc: { totalAsset: cashDelta } });
      }

      // Update Trade fields
      existing.exitPrice = newPrice;
      existing.tradeAmount = newTradeAmount;
      existing.netPnl = (newPrice - buyPrice) * newUnits;
      existing.tradeDate = newDate;
      existing.closedAt = newDate;
      if (notes != null) existing.outcome = notes;

      // Update tags: units:xx and any holding:xx reference
      const newTags = (existing.tags || []).map((t) =>
        t.startsWith("units:") ? `units:${newUnits}` : t,
      );
      // Ensure units tag exists
      if (!newTags.some((t) => t.startsWith("units:"))) {
        newTags.push(`units:${newUnits}`);
      }
      existing.tags = newTags;

      await existing.save();

      // If the trade references a holding, sync the holding's units to reflect
      // the new sell size (so the holding table stays consistent).
      const holdingTag = existing.tags.find((t) => t.startsWith("holding:"));
      if (holdingTag) {
        const holdingId = holdingTag.split(":")[1];
        // We don't know the original purchased units exactly; instead we
        // re-derive a "remaining units delta" = (oldUnits - newUnits)
        const oldUnits = oldTradeAmount && existing.exitPrice
          ? oldTradeAmount / existing.exitPrice
          : null;
        if (oldUnits != null) {
          const delta = newUnits - oldUnits; // positive = fewer sold now
          if (Math.abs(delta) > 1e-12) {
            await Holding.updateOne(
              { _id: holdingId, userId },
              { $inc: { units: delta } },
            );
          }
        }
      }

      return res.status(200).json({ success: true, data: existing.toObject() });
    } catch (err) {
      console.error("[PUT /api/portfolio/trades/:id]", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to update trade" });
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    try {
      const trade = await Trade.findOneAndDelete({ _id: id, userId });
      if (!trade) return res.status(404).json({ success: false, error: "Not found" });

      // Reverse cash impact (we added the trade amount when the sell happened)
      await User.updateOne(
        { _id: userId },
        { $inc: { totalAsset: -trade.tradeAmount } },
      );

      // Restore holding units
      const holdingTag = (trade.tags || []).find((t) => t.startsWith("holding:"));
      if (holdingTag) {
        const holdingId = holdingTag.split(":")[1];
        const soldUnits = Number(
          (trade.tags || []).find((t) => t.startsWith("units:"))?.split(":")[1] || 0,
        );
        if (soldUnits > 0) {
          await Holding.updateOne(
            { _id: holdingId, userId },
            { $inc: { units: soldUnits } },
          );
        }
      }

      return res.status(200).json({ success: true, data: { _id: id } });
    } catch (err) {
      console.error("[DELETE /api/portfolio/trades/:id]", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to delete trade" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
