/**
 * lib/models/Note.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mongoose schema for trading notes / strategy logs.
 *
 * Fields:
 *  - title      : Short headline for the note
 *  - content    : Full note body (supports markdown-style plain text)
 *  - tags       : Optional array of string tags (e.g. ["BTC", "risk-management"])
 *  - pinned     : Boolean – pinned notes appear at the top
 *  - color      : Accent color key for visual grouping ("arc"|"ember"|"bull"|"bear"|"default")
 *  - createdAt  : Auto-set by Mongoose timestamps
 *  - updatedAt  : Auto-updated by Mongoose timestamps
 */

import mongoose from "mongoose";

const NoteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Note title is required"],
      trim: true,
      maxlength: [120, "Title must be 120 characters or fewer"],
    },
    content: {
      type: String,
      required: [true, "Note content is required"],
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      enum: ["arc", "ember", "bull", "bear", "default"],
      default: "default",
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
  }
);

/**
 * Prevent model re-compilation during Next.js hot reloads.
 * If the model is already registered, reuse it; otherwise create it.
 */
export default mongoose.models.Note || mongoose.model("Note", NoteSchema);
