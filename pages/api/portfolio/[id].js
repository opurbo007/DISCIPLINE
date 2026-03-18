/**
 * pages/api/portfolio/[id].js
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET    /api/portfolio/:id  → Fetch a single holding
 *  PUT    /api/portfolio/:id  → Update a holding
 *  DELETE /api/portfolio/:id  → Delete a holding
 *
 * All routes verify the holding belongs to the authenticated user (userId check
 * prevents one user from reading/modifying another user's data).
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/mongodb";
import Holding from "@/lib/models/Holding";
import mongoose from "mongoose";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  const { id } = req.query;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: "Invalid holding ID" });
  }

  await dbConnect();
  const userId = session.user.id;

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const holding = await Holding.findOne({ _id: id, userId }).lean();
    if (!holding) return res.status(404).json({ success: false, error: "Not found" });
    return res.status(200).json({ success: true, data: holding });
  }

  // ── PUT ───────────────────────────────────────────────────────────────────
  if (req.method === "PUT") {
    try {
      const allowed = ["units", "purchasePrice", "purchaseDate", "notes"];
      const updates = {};
      allowed.forEach((k) => {
        if (req.body[k] !== undefined) {
          updates[k] =
            k === "purchaseDate"
              ? new Date(req.body[k])
              : k === "units" || k === "purchasePrice"
                ? parseFloat(req.body[k])
                : req.body[k];
        }
      });

      const holding = await Holding.findOneAndUpdate(
        { _id: id, userId }, // userId check prevents cross-user mutation
        { $set: updates },
        { new: true, runValidators: true }
      ).lean();

      if (!holding) return res.status(404).json({ success: false, error: "Not found" });
      return res.status(200).json({ success: true, data: holding });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const holding = await Holding.findOneAndDelete({ _id: id, userId });
    if (!holding) return res.status(404).json({ success: false, error: "Not found" });
    return res.status(200).json({ success: true, data: { _id: id } });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
