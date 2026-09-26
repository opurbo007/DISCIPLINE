/**
 * pages/api/auth/reset-password.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  POST /api/auth/reset-password  body: { token, password }
 *  Verifies the one-time token (hash + 1h expiry) and sets the new password.
 */

import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ success: false, error: "Token and new password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: "Password must be at least 8 characters" });
  }

  await dbConnect();

  try {
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: "Reset link is invalid or expired" });
    }

    user.password = password; // hashed by pre-save hook
    user.resetPasswordToken = "";
    user.resetPasswordExpire = null;
    await user.save();

    return res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("[reset-password]", err);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}
