/**
 * pages/api/portfolio/trades.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET /api/portfolio/trades  → Return trade history for the authenticated user
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/mongodb";
import Trade from "@/lib/models/Trade";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  await dbConnect();
  const userId = session.user.id;

  try {
    const trades = await Trade.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, data: trades });
  } catch (err) {
    console.error("[GET /api/portfolio/trades]", err);
    return res.status(500).json({ success: false, error: "Failed to fetch trade history" });
  }
}
