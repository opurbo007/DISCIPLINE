/**
 * pages/api/bookmarks/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET  /api/bookmarks   → List all bookmarks (ordered by `order` asc)
 *  POST /api/bookmarks   → Create a new bookmark
 */

import dbConnect from "@/lib/mongodb";
import Bookmark from "@/lib/models/Bookmark";

export default async function handler(req, res) {
  await dbConnect();

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const bookmarks = await Bookmark.find({}).sort({ order: 1, createdAt: 1 }).lean();
      return res.status(200).json({ success: true, data: bookmarks });
    } catch (err) {
      return res.status(500).json({ success: false, error: "Failed to fetch bookmarks" });
    }
  }

  // ── POST ──────────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const { title, url, description, category, favicon, order } = req.body;

      if (!title?.trim() || !url?.trim()) {
        return res.status(400).json({
          success: false,
          error: "'title' and 'url' are required",
        });
      }

      // Auto-generate favicon URL using Google's favicon service if not provided
      const faviconUrl =
        favicon ||
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`;

      const bookmark = await Bookmark.create({
        title,
        url,
        description,
        category,
        favicon: faviconUrl,
        order: order ?? 0,
      });

      return res.status(201).json({ success: true, data: bookmark });
    } catch (err) {
      if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ success: false, error: messages.join(", ") });
      }
      return res.status(500).json({ success: false, error: "Failed to create bookmark" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
