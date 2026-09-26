/**
 * lib/telegram.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared Telegram Bot API helpers.
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN    — required, from @BotFather
 *   TELEGRAM_BOT_USERNAME — optional, used to build t.me deep links
 *   TELEGRAM_WEBHOOK_SECRET — optional, validates x-telegram-bot-api-secret-token
 */

// Suggested commands — shown by Telegram clients in the "/" autocomplete menu
// once registered via setMyCommands (POST /api/telegram/setup).
export const BOT_COMMANDS = [
  { command: "start", description: "Link account & get started" },
  { command: "portfolio", description: "View portfolio summary" },
  { command: "holdings", description: "List holdings with live values" },
  { command: "pnl", description: "Show total P&L" },
  { command: "help", description: "Show all commands" },
  { command: "unlink", description: "Disconnect Telegram" },
];

export function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

export function getBotUsername() {
  return (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
}

async function tgApi(method, payload) {
  const token = getBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data.result;
}

// Reply keyboard — puts tappable command suggestions under the input box.
function commandKeyboard() {
  return {
    keyboard: [
      [{ text: "/portfolio" }, { text: "/holdings" }],
      [{ text: "/pnl" }, { text: "/help" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
    selective: false,
  };
}

export async function sendMessage(chatId, text, opts = {}) {
  const { parseMode = "HTML", replyMarkup } = opts;
  return tgApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true,
    reply_markup: replyMarkup || commandKeyboard(),
  });
}

export async function setBotCommands() {
  return tgApi("setMyCommands", { commands: BOT_COMMANDS });
}

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
