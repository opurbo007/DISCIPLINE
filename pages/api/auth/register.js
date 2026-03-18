/**
 * pages/api/auth/register.js
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/auth/register — creates a new user account.
 *
 * Body: { name, email, password }
 * Returns: { success, message } or { success, error }
 */

import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  await dbConnect();

  const { name, email, password } = req.body;

  // ── Basic validation ──────────────────────────────────────────────────────
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ success: false, error: "Name, email, and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters" });
  }

  // ── Check for duplicate email ─────────────────────────────────────────────
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return res.status(409).json({ success: false, error: "An account with this email already exists" });
  }

  // ── Create user (password is hashed by the pre-save hook in the model) ────
  try {
    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password });
    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, error: messages.join(", ") });
    }
    console.error("[register]", err);
    return res.status(500).json({ success: false, error: "Failed to create account" });
  }
}
