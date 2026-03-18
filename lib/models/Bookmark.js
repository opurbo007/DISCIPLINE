/**
 * lib/models/Bookmark.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mongoose schema for quick-access website bookmarks.
 *
 * Fields:
 *  - title      : Display name for the bookmark
 *  - url        : Full URL including protocol (validated with a simple regex)
 *  - description: Optional short description
 *  - category   : Category tag (e.g. "charting", "news", "broker", "data")
 *  - favicon    : Optional custom favicon URL (falls back to Google's favicon service)
 *  - order      : Integer for manual sort ordering (lower = first)
 *  - createdAt  : Auto-set by Mongoose timestamps
 *  - updatedAt  : Auto-updated by Mongoose timestamps
 */

import mongoose from "mongoose";

const BookmarkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Bookmark title is required"],
      trim: true,
      maxlength: [80, "Title must be 80 characters or fewer"],
    },
    url: {
      type: String,
      required: [true, "URL is required"],
      trim: true,
      validate: {
        validator: (v) => /^https?:\/\/.+/.test(v),
        message: "URL must start with http:// or https://",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description must be 200 characters or fewer"],
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "general",
    },
    favicon: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Bookmark ||
  mongoose.model("Bookmark", BookmarkSchema);
