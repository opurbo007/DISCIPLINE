/**
 * pages/api/telegram/webhook.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  POST /api/telegram/webhook → Telegram Bot API update receiver.
 *
 *  Commands (all suggested via setMyCommands + reply keyboard):
 *    /start [code]  — link account (code from web app) or welcome back
 *    /link <code>   — same as /start <code>
 *    /portfolio     — portfolio summary (total, invested, value, P&L) [linked]
 *    /holdings      — per-coin holdings with live values [linked]
 *    /pnl           — total P&L only [linked]
 *    /price SYMBOL  — live coin price, e.g. /price BTC (public)
 *    /feargreed     — Crypto Fear & Greed index (public)
 *    /help          — command list
 *    /unlink        — disconnect this chat
 *
 *  Setup:
 *    1. Create bot via @BotFather → TELEGRAM_BOT_TOKEN + TELEGRAM_BOT_USERNAME
 *    2. POST /api/telegram/setup (logged in) to register suggested commands
 *    3. Set webhook: https://api.telegram.org/bot<token>/setWebhook?url=<app>/api/telegram/webhook
 */

import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import Holding from "@/lib/models/Holding";
import {
  BOT_COMMANDS,
  sendMessage,
  escapeHtml,
} from "@/lib/telegram";

const fmt$ = (n, dp = 2) =>
  n == null || Number.isNaN(Number(n))
    ? "—"
    : `$${Math.abs(Number(n)).toLocaleString("en-US", {
        minimumFractionDigits: dp,
        maximumFractionDigits: dp,
      })}`;

const fmtUnits = (n) =>
  n == null
    ? "—"
    : n < 0.0001
      ? Number(n).toFixed(8)
      : n < 1
        ? Number(n).toFixed(6)
        : n < 1000
          ? Number(n).toFixed(4)
          : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

function helpText() {
  const lines = BOT_COMMANDS.map((c) => `/${c.command} — ${c.description}`);
  return `<b>Available commands</b>\n${lines.map(escapeHtml).join("\n")}\n\nTip: tap a button below or type / to see suggestions.`;
}

function linkInstructions() {
  return (
    `Your Telegram is not linked yet.\n\n` +
    `<b>To link:</b>\n` +
    `1. Sign in to the web app\n` +
    `2. Open the Telegram card → Generate code\n` +
    `3. Send <code>/start YOUR_CODE</code> here`
  );
}

async function fetchPricesForCoins(coinIds) {
  if (!coinIds.length) return {};
  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=usd&ids=${encodeURIComponent(coinIds.join(","))}` +
    `&per_page=250&price_change_percentage=24h&precision=2`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  const map = {};
  (data || []).forEach((c) => {
    map[c.id] = { price: c.current_price ?? 0, symbol: c.symbol?.toUpperCase() || "" };
  });
  return map;
}

async function buildPortfolio(userId) {
  const [user, lots] = await Promise.all([
    User.findById(userId).select("totalAsset name").lean(),
    Holding.find({ userId }).lean(),
  ]);
  const totalAsset = Number(user?.totalAsset) || 0;
  const coinIds = [...new Set((lots || []).map((l) => l.coinId))];
  let prices = {};
  try {
    prices = await fetchPricesForCoins(coinIds);
  } catch {
    prices = {};
  }

  const byCoin = {};
  let totalInvested = 0;
  let totalValue = 0;
  (lots || []).forEach((l) => {
    const cost = l.units * l.purchasePrice;
    const live = prices[l.coinId]?.price;
    const value = live != null ? l.units * live : 0;
    totalInvested += cost;
    totalValue += value;
    if (!byCoin[l.coinId]) {
      byCoin[l.coinId] = { symbol: l.symbol, units: 0, cost: 0, value: 0 };
    }
    byCoin[l.coinId].units += l.units;
    byCoin[l.coinId].cost += cost;
    byCoin[l.coinId].value += value;
  });

  const pnl = totalValue - totalInvested;
  const cashLeft = totalAsset - totalInvested;
  const assetAfterPnl = cashLeft + totalValue;
  const coins = Object.values(byCoin).sort((a, b) => b.value - a.value);
  return { totalAsset, totalInvested, totalValue, pnl, cashLeft, assetAfterPnl, coins, count: (lots || []).length };
}

function portfolioMessage(p) {
  const sign = p.pnl >= 0 ? "+" : "-";
  return (
    `<b>📊 Portfolio</b>\n` +
    `Total asset: <b>${escapeHtml(fmt$(p.totalAsset))}</b>\n` +
    `Invested: ${escapeHtml(fmt$(p.totalInvested))} (${p.count} lots)\n` +
    `Current value: <b>${escapeHtml(fmt$(p.totalValue))}</b>\n` +
    `Cash left: ${escapeHtml(fmt$(p.cashLeft))}\n` +
    `P&amp;L: <b>${sign}${escapeHtml(fmt$(p.pnl).slice(1))}</b>\n` +
    `Asset after P&amp;L: <b>${escapeHtml(fmt$(p.assetAfterPnl))}</b>`
  );
}

function holdingsMessage(p) {
  if (!p.coins.length) return "No holdings yet. Add coins in the web app first.";
  const lines = p.coins.slice(0, 20).map((c) => {
    const pnl = c.value - c.cost;
    const sign = pnl >= 0 ? "+" : "-";
    return `<b>${escapeHtml(c.symbol)}</b> ${escapeHtml(fmtUnits(c.units))} · ${escapeHtml(fmt$(c.value))} (${sign}${escapeHtml(fmt$(pnl).slice(1))})`;
  });
  const more = p.coins.length > 20 ? `\n…and ${p.coins.length - 20} more` : "";
  return `<b>💰 Holdings (${p.coins.length} coins)</b>\n${lines.join("\n")}${more}`;
}

// ── Public price lookup (no link needed — CoinGecko, 1 call) ──
const SYMBOL_TO_ID = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  LINK: "chainlink",
  DOGE: "dogecoin",
  XRP: "ripple",
  ONDO: "ondo-finance",
};

async function fetchCoinPrice(coinId) {
  const url =
    `https://api.coingecko.com/api/v3/simple/price` +
    `?ids=${encodeURIComponent(coinId)}&vs_currencies=usd` +
    `&include_24hr_change=true&precision=2`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  return data?.[coinId] || null;
}

async function fetchFearGreed() {
  const res = await fetch("https://api.alternative.me/fng/?limit=2&format=json", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`FearGreed ${res.status}`);
  const json = await res.json();
  return json?.data || [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, commands: BOT_COMMANDS.map((c) => c.command) });
  }

  // Optional shared-secret validation (set same value in setWebhook call)
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers["x-telegram-bot-api-secret-token"];
    if (got !== secret) return res.status(401).json({ ok: false });
  }

  const update = req.body || {};
  const msg = update.message || update.edited_message;
  const chatId = msg?.chat?.id;
  const text = (msg?.text || "").trim();

  // Always ack quickly so Telegram doesn't retry
  if (!chatId || !text) return res.status(200).json({ ok: true });

  const [rawCmd, ...args] = text.split(/\s+/);
  const command = rawCmd.toLowerCase().split("@")[0]; // strip @bot suffix in groups

  try {
    await dbConnect();

    // ── /start [code] ──
    if (command === "/start") {
      const code = (args[0] || "").trim();
      if (code) {
        const user = await User.findOne({ telegramLinkToken: code });
        if (!user) {
          await sendMessage(chatId, `Invalid code. Generate a fresh one in the web app and try <code>/start YOUR_CODE</code>.`);
          return res.status(200).json({ ok: true });
        }
        user.telegramChatId = String(chatId);
        user.telegramLinkToken = ""; // one-time use
        await user.save();
        await sendMessage(
          chatId,
          `✅ Linked as <b>${escapeHtml(user.name || user.email)}</b>!\n\nTry <code>/portfolio</code> to see your portfolio.`,
        );
        return res.status(200).json({ ok: true });
      }
      const linked = await User.findOne({ telegramChatId: String(chatId) }).select("name email").lean();
      if (linked) {
        await sendMessage(chatId, `Welcome back, <b>${escapeHtml(linked.name || linked.email)}</b>! Try <code>/portfolio</code>.`);
      } else {
        await sendMessage(chatId, `👋 Welcome!\n\n${linkInstructions()}\n\n${helpText()}`);
      }
      return res.status(200).json({ ok: true });
    }

    // ── /link <code> ──
    if (command === "/link") {
      const code = (args[0] || "").trim();
      if (!code) {
        await sendMessage(chatId, `Send <code>/link YOUR_CODE</code> — get the code from the Telegram card in the web app.`);
        return res.status(200).json({ ok: true });
      }
      const user = await User.findOne({ telegramLinkToken: code });
      if (!user) {
        await sendMessage(chatId, `Invalid code. Generate a fresh one and try again.`);
        return res.status(200).json({ ok: true });
      }
      user.telegramChatId = String(chatId);
      user.telegramLinkToken = "";
      await user.save();
      await sendMessage(chatId, `✅ Linked as <b>${escapeHtml(user.name || user.email)}</b>! Try <code>/portfolio</code>.`);
      return res.status(200).json({ ok: true });
    }

    // ── /help ──
    if (command === "/help" || command === "/commands") {
      await sendMessage(chatId, helpText());
      return res.status(200).json({ ok: true });
    }

    // ── /feargreed (public — no link needed) ──
    if (command === "/feargreed" || command === "/fng" || command === "/fear") {
      try {
        const list = await fetchFearGreed();
        const cur = list[0];
        if (!cur) throw new Error("empty");
        const prev = list[1];
        const delta = prev ? Number(cur.value) - Number(prev.value) : null;
        await sendMessage(
          chatId,
          `<b>😨 Fear &amp; Greed: ${escapeHtml(cur.value)} · ${escapeHtml(cur.value_classification || "")}</b>` +
            (delta == null ? "" : `\n${delta > 0 ? "+" : ""}${delta} vs yesterday`),
        );
      } catch {
        await sendMessage(chatId, "Sentiment unavailable right now. Try again later.");
      }
      return res.status(200).json({ ok: true });
    }

    // ── /price SYMBOL (public — no link needed) ──
    if (command === "/price" || command === "/p") {
      const raw = (args[0] || "").trim().toUpperCase();
      if (!raw) {
        await sendMessage(
          chatId,
          `Usage: <code>/price BTC</code>\nSupported: ${escapeHtml(Object.keys(SYMBOL_TO_ID).join(", "))}`,
        );
        return res.status(200).json({ ok: true });
      }
      const coinId = SYMBOL_TO_ID[raw] || raw.toLowerCase().replace(/[^a-z0-9-]/g, "");
      try {
        const q = await fetchCoinPrice(coinId);
        if (!q?.usd) throw new Error("not found");
        const chg = Number(q.usd_24h_change) || 0;
        const sign = chg >= 0 ? "+" : "";
        await sendMessage(
          chatId,
          `<b>${escapeHtml(raw)}</b>: <b>${escapeHtml(fmt$(q.usd))}</b>\n24h: ${sign}${chg.toFixed(2)}%`,
        );
      } catch {
        await sendMessage(
          chatId,
          `No price for <b>${escapeHtml(raw)}</b>. Try: ${escapeHtml(Object.keys(SYMBOL_TO_ID).join(", "))}`,
        );
      }
      return res.status(200).json({ ok: true });
    }

    // ── /unlink ──
    if (command === "/unlink") {
      const user = await User.findOne({ telegramChatId: String(chatId) });
      if (!user) {
        await sendMessage(chatId, "Nothing to unlink — this chat isn't linked.");
        return res.status(200).json({ ok: true });
      }
      user.telegramChatId = "";
      await user.save();
      await sendMessage(chatId, "🔌 Unlinked. Use <code>/start YOUR_CODE</code> to link again anytime.");
      return res.status(200).json({ ok: true });
    }

    // ── Linked-only commands ──
    const linkedUser = await User.findOne({ telegramChatId: String(chatId) });
    if (!linkedUser) {
      await sendMessage(chatId, `${linkInstructions()}\n\n${helpText()}`);
      return res.status(200).json({ ok: true });
    }

    if (command === "/portfolio") {
      const p = await buildPortfolio(linkedUser._id);
      await sendMessage(chatId, portfolioMessage(p));
      return res.status(200).json({ ok: true });
    }

    if (command === "/holdings") {
      const p = await buildPortfolio(linkedUser._id);
      await sendMessage(chatId, holdingsMessage(p));
      return res.status(200).json({ ok: true });
    }

    if (command === "/pnl") {
      const p = await buildPortfolio(linkedUser._id);
      const sign = p.pnl >= 0 ? "+" : "-";
      await sendMessage(
        chatId,
        `P&amp;L: <b>${sign}${escapeHtml(fmt$(p.pnl).slice(1))}</b>\nInvested ${escapeHtml(fmt$(p.totalInvested))} → value ${escapeHtml(fmt$(p.totalValue))}`,
      );
      return res.status(200).json({ ok: true });
    }

    // Unknown text — nudge toward suggested commands
    await sendMessage(chatId, `I don't know that command.\n\n${helpText()}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[telegram/webhook]", err);
    try {
      await sendMessage(chatId, "⚠️ Something went wrong. Try again in a moment.");
    } catch {}
    return res.status(200).json({ ok: true });
  }
}
