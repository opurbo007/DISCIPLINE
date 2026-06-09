/**
 * pages/api/portfolio/sell.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  POST /api/portfolio/sell  → Record a sell against an existing holding
 *
 *  Expected body:
 *    {
 *      holdingId: string,   // Mongo ObjectId of the holding to sell
 *      units: number,       // Units to sell (must be <= holding.units)
 *      sellPrice: number,   // Price per unit at which the sell occurs (USD)
 *      sellDate?: string,   // Optional ISO date string, defaults to now
 *    }
 *
 *  This endpoint reduces the holding's `units` by the sold amount (deleting the
 *  holding when units reach zero) and creates a Trade document that records the
 *  profit/loss of the transaction. The Trade direction is stored as "LONG" with a
 *  negative `netPnl` when a loss occurs and positive when a profit occurs.
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/mongodb";
import Holding from "@/lib/models/Holding";
import Trade from "@/lib/models/Trade";
import User from "@/lib/models/User";

export default async function handler(req, res) {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { holdingId, units, sellPrice, sellDate } = req.body;
  if (!holdingId || !units || !sellPrice) {
    return res.status(400).json({ success: false, error: "holdingId, units and sellPrice are required" });
  }

  await dbConnect();
  const userId = session.user.id;

  try {
    // Find the holding belonging to the user
    const holding = await Holding.findOne({ _id: holdingId, userId });
    if (!holding) {
      return res.status(404).json({ success: false, error: "Holding not found" });
    }
    if (units > holding.units) {
      return res.status(400).json({ success: false, error: "Sell units exceed holding units" });
    }

    // Calculate profit/loss for the sold portion
    const purchasePrice = holding.purchasePrice; // price per unit at purchase
    const pnl = (sellPrice - purchasePrice) * units; // positive = profit
    const tradeAmount = sellPrice * units; // total USD received

    // Create a Trade entry to log the sell
    const trade = await Trade.create({
      userId,
      coin: holding.coinId,
      direction: "LONG", // Using LONG to represent a sell trade; profit/loss is derived from netPnl
      setup: "sell",
      tradeAmount,
      leverage: 1,
      entryPrice: sellPrice,
      stopLoss: null,
      takeProfit: null,
      netPnl: pnl,
      tradeDate: sellDate ? new Date(sellDate) : new Date(),
    });
    // Adjust user's cash asset after selling
    await User.updateOne({ _id: userId }, { $inc: { totalAsset: (sellPrice * units) } });

    // Update or delete the holding
    if (units === holding.units) {
      await Holding.deleteOne({ _id: holdingId });
    } else {
      holding.units = holding.units - units;
      await holding.save();
    }

    return res.status(200).json({ success: true, data: { trade, remainingHolding: units === holding.units ? null : holding } });
  } catch (err) {
    console.error("[POST /api/portfolio/sell]", err);
    return res.status(500).json({ success: false, error: "Failed to process sell" });
  }
}
