/**
 * lib/models/User.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mongoose schema for authenticated users.
 *
 * Passwords are stored as bcrypt hashes — plain text is never persisted.
 * comparePassword() is a convenience method used in the NextAuth credentials
 * provider to verify a login attempt.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      maxlength: [60, "Name must be 60 characters or fewer"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never returned in queries unless explicitly requested
    },
    avatar: {
      type: String,
      default: "", // Optional avatar URL
    },
  },
  { timestamps: true }
);

// ── Pre-save hook: hash the password before storing ──────────────────────────
UserSchema.pre("save", async function (next) {
  // Only re-hash if the password field was actually modified
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(12); // Cost factor 12
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ── Instance method: verify a plain-text password against the hash ────────────
UserSchema.methods.comparePassword = async function (plainText) {
  return bcrypt.compare(plainText, this.password);
};

export default mongoose.models.User || mongoose.model("User", UserSchema);
