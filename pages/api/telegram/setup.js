/**
 * pages/api/telegram/setup.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  POST /api/telegram/setup → register suggested bot commands (setMyCommands)
 *  GET  /api/telegram/setup → return the command list (for debugging)
 *
 *  Requires login. Needs TELEGRAM_BOT_TOKEN on the server.
 *  Call once after creating the bot — Telegram clients then show
 *  command suggestions when the user types "/".
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { BOT_COMMANDS, setBotCommands } from "@/lib/telegram";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ success: true, data: { commands: BOT_COMMANDS } });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

  try {
    await setBotCommands();
    return res.status(200).json({ success: true, data: { commands: BOT_COMMANDS } });
  } catch (err) {
    console.error("[telegram/setup]", err);
    return res.status(500).json({ success: false, error: err.message || "Setup failed" });
  }
}
