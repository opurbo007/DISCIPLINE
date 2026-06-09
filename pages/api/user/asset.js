/**
 * pages/api/user/asset.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET  /api/user/asset  → Return the user's total cash asset (USD)
 *  POST /api/user/asset  → Update the user's total cash asset
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  await dbConnect();
  const userId = session.user.id;

  if (req.method === "GET") {
    try {
      const user = await User.findById(userId).select("totalAsset").lean();
      return res.status(200).json({ success: true, data: { totalAsset: user?.totalAsset ?? 0 } });
    } catch (err) {
      console.error("[GET /api/user/asset]", err);
      return res.status(500).json({ success: false, error: "Failed to fetch asset" });
    }
  }

  if (req.method === "POST") {
    const { totalAsset } = req.body;
    if (typeof totalAsset !== "number" || isNaN(totalAsset)) {
      return res.status(400).json({ success: false, error: "Invalid totalAsset value" });
    }
    try {
      await User.updateOne({ _id: userId }, { $set: { totalAsset } });
      return res.status(200).json({ success: true, data: { totalAsset } });
    } catch (err) {
      console.error("[POST /api/user/asset]", err);
      return res.status(500).json({ success: false, error: "Failed to update asset" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
