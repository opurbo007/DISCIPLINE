/**
 * pages/api/bookmarks/[id].js
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET    /api/bookmarks/:id  → Fetch a single bookmark
 *  PUT    /api/bookmarks/:id  → Update a bookmark
 *  DELETE /api/bookmarks/:id  → Delete a bookmark
 */

import dbConnect from "@/lib/mongodb";
import Bookmark from "@/lib/models/Bookmark";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: "Invalid bookmark ID" });
  }

  if (req.method === "GET") {
    const bookmark = await Bookmark.findById(id).lean();
    if (!bookmark) return res.status(404).json({ success: false, error: "Not found" });
    return res.status(200).json({ success: true, data: bookmark });
  }

  if (req.method === "PUT") {
    try {
      const allowed = ["title", "url", "description", "category", "favicon", "order"];
      const updates = {};
      allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

      const bookmark = await Bookmark.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).lean();

      if (!bookmark) return res.status(404).json({ success: false, error: "Not found" });
      return res.status(200).json({ success: true, data: bookmark });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  if (req.method === "DELETE") {
    const bookmark = await Bookmark.findByIdAndDelete(id);
    if (!bookmark) return res.status(404).json({ success: false, error: "Not found" });
    return res.status(200).json({ success: true, data: { _id: id } });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
