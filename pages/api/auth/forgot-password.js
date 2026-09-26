/**
 * pages/api/auth/forgot-password.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  POST /api/auth/forgot-password  body: { email }
 *  Generates a one-time reset token (1h expiry) and emails the reset link.
 *  Always returns success to avoid email enumeration.
 */

import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { sendResetEmail } from "@/lib/mailer";

function getAppUrl(req) {
  const envUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "";
  if (envUrl) return envUrl.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${req.headers.host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { email } = req.body || {};
  if (!email?.trim()) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }

  await dbConnect();

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond success — but only email if the account exists.
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
      user.resetPasswordToken = hashed;
      user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await user.save();

      const resetUrl = `${getAppUrl(req)}/reset-password?token=${rawToken}`;
      try {
        await sendResetEmail({ to: user.email, resetUrl });
      } catch (err) {
        console.error("[forgot-password] email failed:", err.message);
        // Don't leak SMTP errors — user can retry.
      }
    }

    return res.status(200).json({
      success: true,
      message: "If an account exists for that email, a reset link was sent.",
    });
  } catch (err) {
    console.error("[forgot-password]", err);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}
