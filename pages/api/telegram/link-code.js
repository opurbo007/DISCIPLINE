/**
 * pages/api/telegram/link-code.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET  /api/telegram/link-code → link status + current code (if any)
 *  POST /api/telegram/link-code → generate a fresh one-time link code
 *
 *  The user sends /start <code> to the bot to link their chat.
 */

import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { getBotUsername } from "@/lib/telegram";

function buildDeepLink(code) {
  const username = getBotUsername();
  if (!username) return "";
  return `https://t.me/${username}?start=${code}`;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

  await dbConnect();
  const userId = session.user.id;

  if (req.method === "GET") {
    const user = await User.findById(userId).select("telegramChatId telegramLinkToken").lean();
    if (!user) return res.status(404).json({ success: false, error: "Not found" });
    const code = user.telegramLinkToken || "";
    return res.status(200).json({
      success: true,
      data: {
        linked: Boolean(user.telegramChatId),
        hasCode: Boolean(code),
        linkToken: code,
        deepLink: code ? buildDeepLink(code) : "",
        botUsername: getBotUsername(),
      },
    });
  }

  if (req.method === "POST") {
    const code = crypto.randomBytes(4).toString("hex"); // 8-char code
    await User.updateOne({ _id: userId }, { $set: { telegramLinkToken: code } });
    return res.status(200).json({
      success: true,
      data: { linkToken: code, deepLink: buildDeepLink(code), botUsername: getBotUsername() },
    });
  }

  if (req.method === "DELETE") {
    await User.updateOne({ _id: userId }, { $set: { telegramChatId: "", telegramLinkToken: "" } });
    return res.status(200).json({ success: true, data: { linked: false } });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
