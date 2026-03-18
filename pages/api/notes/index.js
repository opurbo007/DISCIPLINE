/**
 * pages/api/notes/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * REST endpoint for the notes collection.
 *
 *  GET  /api/notes        → List all notes (newest first, pinned first)
 *  POST /api/notes        → Create a new note
 */

import dbConnect from "@/lib/mongodb";
import Note from "@/lib/models/Note";

export default async function handler(req, res) {
  await dbConnect();

  // ── GET – list all notes ──────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const notes = await Note.find({})
        // Pinned notes appear first, then newest first
        .sort({ pinned: -1, updatedAt: -1 })
        .lean(); // Return plain JS objects (faster, no Mongoose overhead)

      return res.status(200).json({ success: true, data: notes });
    } catch (error) {
      console.error("[GET /api/notes]", error);
      return res.status(500).json({ success: false, error: "Failed to fetch notes" });
    }
  }

  // ── POST – create a new note ──────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const { title, content, tags, pinned, color } = req.body;

      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({
          success: false,
          error: "Both 'title' and 'content' are required",
        });
      }

      const note = await Note.create({ title, content, tags, pinned, color });
      return res.status(201).json({ success: true, data: note });
    } catch (error) {
      console.error("[POST /api/notes]", error);
      // Mongoose validation errors come back as error.name === 'ValidationError'
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((e) => e.message);
        return res.status(400).json({ success: false, error: messages.join(", ") });
      }
      return res.status(500).json({ success: false, error: "Failed to create note" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
