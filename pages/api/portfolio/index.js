/**
 * pages/api/portfolio/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET  /api/portfolio  → Return all holdings for the authenticated user
 *  POST /api/portfolio  → Add a new holding for the authenticated user
 *
 * All routes are protected — unauthenticated requests get 401.
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/mongodb";
import Holding from "@/lib/models/Holding";

export default async function handler(req, res) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  await dbConnect();
  const userId = session.user.id;

  // ── GET: list all holdings for this user ──────────────────────────────────
  if (req.method === "GET") {
    try {
      const holdings = await Holding.find({ userId })
        .sort({ createdAt: -1 })
        .lean();
      return res.status(200).json({ success: true, data: holdings });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Failed to fetch portfolio" });
    }
  }

  // ── POST: add a holding ───────────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const { coinId, symbol, name, icon, units, purchasePrice, purchaseDate, notes } = req.body;

      if (!coinId || !symbol || !name || !units || purchasePrice === undefined) {
        return res.status(400).json({
          success: false,
          error: "coinId, symbol, name, units, and purchasePrice are required",
        });
      }

      const holding = await Holding.create({
        userId,
        coinId: coinId.toLowerCase(),
        symbol: symbol.toUpperCase(),
        name,
        icon: icon || "◎",
        units: parseFloat(units),
        purchasePrice: parseFloat(purchasePrice),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        notes: notes || "",
      });

      return res.status(201).json({ success: true, data: holding });
    } catch (err) {
      if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ success: false, error: messages.join(", ") });
      }
      console.error("[POST /api/portfolio]", err);
      return res.status(500).json({ success: false, error: "Failed to add holding" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
