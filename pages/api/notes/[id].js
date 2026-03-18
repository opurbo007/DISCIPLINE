/**
 * pages/api/notes/[id].js
 * ─────────────────────────────────────────────────────────────────────────────
 * REST endpoint for a single note document.
 *
 *  GET    /api/notes/:id  → Fetch a single note
 *  PUT    /api/notes/:id  → Update a note (full or partial)
 *  DELETE /api/notes/:id  → Delete a note
 */

import dbConnect from "@/lib/mongodb";
import Note from "@/lib/models/Note";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;

  // Validate that `id` is a well-formed MongoDB ObjectId
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, error: "Invalid note ID" });
  }

  // ── GET – fetch single note ───────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const note = await Note.findById(id).lean();
      if (!note) return res.status(404).json({ success: false, error: "Note not found" });
      return res.status(200).json({ success: true, data: note });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── PUT – update note ─────────────────────────────────────────────────────
  if (req.method === "PUT") {
    try {
      const allowed = ["title", "content", "tags", "pinned", "color"];
      const updates = {};
      allowed.forEach((key) => {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      });

      const note = await Note.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }  // return updated doc & validate
      ).lean();

      if (!note) return res.status(404).json({ success: false, error: "Note not found" });
      return res.status(200).json({ success: true, data: note });
    } catch (err) {
      if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ success: false, error: messages.join(", ") });
      }
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ── DELETE – remove note ──────────────────────────────────────────────────
  if (req.method === "DELETE") {
    try {
      const note = await Note.findByIdAndDelete(id);
      if (!note) return res.status(404).json({ success: false, error: "Note not found" });
      return res.status(200).json({ success: true, data: { _id: id } });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
