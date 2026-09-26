/**
 * lib/mailer.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Nodemailer SMTP transport (Gmail / SendGrid / Mailgun / any SMTP).
 *
 * Env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 *   SMTP_FROM (e.g. "Discipline <no-reply@yourdomain.com>")
 *   SMTP_SECURE=true for port 465, false for 587 (STARTTLS)
 */

import nodemailer from "nodemailer";

let cached = null;

export function getTransporter() {
  if (cached) return cached;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)");
  }
  cached = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: String(SMTP_SECURE).toLowerCase() === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return cached;
}

export async function sendResetEmail({ to, resetUrl }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to,
    subject: "Reset your Discipline password",
    text: `Reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request it, ignore this email.`,
    html: `<p>Reset your Discipline password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request it, ignore this email.</p>`,
  });
}
