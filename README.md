# 📊 Trading Discipline Dashboard

A glassmorphic, full-stack trading dashboard built with **Next.js 14**, **TailwindCSS**, and **MongoDB Atlas**.

Live market prices · Market session clocks · Bookmark manager · Trading notes journal

---

## ✨ Features

| Feature                 | Details                                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| **Live Market Prices**  | BTC, ETH, SOL, XRP, LINK, ONDO, DOGE (CoinGecko) + S&P 500, NASDAQ, DOW, Bonds, WTI, Silver, Gold (Finnhub) + DXY (Frankfurter/ECB) |
| **Auto-refresh**        | Prices refresh every 60 seconds via SWR                                      |
| **Ticker Tape**         | Scrolling live price strip across the top                                    |
| **Market Sessions**     | Live clocks for New York, London, Tokyo with session progress bars           |
| **Bookmarks**           | CRUD bookmark manager with favicon, categories, and filter pills             |
| **Trading Notes**       | Full journal with pin, color-code, tags, search, and expand/collapse         |
| **MongoDB Persistence** | Notes and bookmarks persist across sessions and devices                      |
| **Glassmorphism UI**    | Backdrop blur, gradient borders, neon accents, grid background               |
| **Responsive**          | Works on mobile, tablet, and desktop                                         |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd trading-dashboard
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:

### 3. Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

---

## 🗝️ API Keys

### CoinGecko (Crypto prices)

- **No API key required** for the public API
- Rate limit: 50 calls/minute
- Used for: BTC, ETH, SOL, XRP, LINK, ONDO, DOGE — via `/coins/markets` with `sparkline=true` (one call returns price, 24h change, and 7-day sparkline)

### Finnhub (Stocks, ETFs, Commodities)

- **Free key required** → [Get yours here](https://finnhub.io)
- Free tier: **60 calls/minute**
- Used for: S&P 500 (SPY), NASDAQ 100 (QQQ), Dow (DIA), Bonds (TLT), WTI Oil (USO), Gold (GLD), Silver (SLV) — ETF proxies for index/commodity exposure
- Without a key, stocks are skipped and crypto + DXY still work

### Frankfurter / ECB (USD Index — DXY)

- **No API key required**
- Free ECB USD reference rates; the app fetches a 6-day series and derives the DXY level and its day-over-day change (geometric weighted mean, base 50.14348112)
- DXY only moves on ECB publication days (Mon–Fri, ~16:00 CET); "change" is day-over-day, not intraday

> Server-side caching (90 s during market hours, 10 min when closed) means **one** set of upstream calls per TTL no matter how many clients are connected.

---

## 🏗️ Architecture

```
trading-dashboard/
├── pages/
│   ├── _app.js              # SWR global config
│   ├── _document.js         # HTML shell, meta tags
│   ├── index.js             # Main dashboard page
│   └── api/
│       ├── prices.js        # GET /api/prices — aggregates all market data
│       ├── notes/
│       │   ├── index.js     # GET /api/notes, POST /api/notes
│       │   └── [id].js      # GET, PUT, DELETE /api/notes/:id
│       └── bookmarks/
│           ├── index.js     # GET /api/bookmarks, POST /api/bookmarks
│           └── [id].js      # GET, PUT, DELETE /api/bookmarks/:id
│
├── components/
│   ├── Layout.js            # Navbar, ticker tape, background, footer
│   ├── MarketPrices/
│   │   ├── index.js         # Price grid with SWR polling
│   │   └── PriceCard.js     # Individual asset card + skeleton
│   ├── TimeZones/
│   │   └── index.js         # Live session clocks with progress bars
│   ├── Bookmarks/
│   │   └── index.js         # CRUD bookmark manager
│   └── Notes/
│       └── index.js         # CRUD trading journal
│
├── lib/
│   ├── mongodb.js           # Singleton Mongoose connection
│   └── models/
│       ├── Note.js          # Mongoose Note schema
│       └── Bookmark.js      # Mongoose Bookmark schema
│
├── styles/
│   └── globals.css          # Tailwind + glass utilities + animations
│
├── tailwind.config.js       # Custom tokens (colors, fonts, shadows)
├── .env.example             # Environment variable template
└── README.md
```

---

## 📡 API Reference

### Market Prices

```
GET /api/prices
→ { markets: MarketAsset[], timestamp: string, errors: string[], marketOpen: boolean, cached: boolean, cacheAge: number }
```

Each `MarketAsset` is `{ id, symbol, name, icon, category, price, change24h, spark?, ... }`.
`price` / `change24h` are `null` when upstream data is unavailable (clients render "—" rather than fake zeros). `spark` (crypto only) is a downsampled 7-day hourly series for the sparkline. DXY's `change24h` is day-over-day ECB change, and it carries `asOf` (last ECB publication date).

Caching: server-side TTL of 90 s during US market hours / 10 min when closed, request coalescing, stale-while-revalidate (up to 4× TTL), and CDN `s-maxage`. Clients poll every 60 s (free-tier safe — upstream is hit at most once per TTL).

### Notes (CRUD)

```
GET    /api/notes          → { data: Note[] }
POST   /api/notes          → { data: Note }     body: { title, content, tags?, pinned?, color? }
GET    /api/notes/:id      → { data: Note }
PUT    /api/notes/:id      → { data: Note }     body: Partial<Note>
DELETE /api/notes/:id      → { data: { _id } }
```

### Bookmarks (CRUD)

```
GET    /api/bookmarks      → { data: Bookmark[] }
POST   /api/bookmarks      → { data: Bookmark }  body: { title, url, description?, category?, order? }
GET    /api/bookmarks/:id  → { data: Bookmark }
PUT    /api/bookmarks/:id  → { data: Bookmark }  body: Partial<Bookmark>
DELETE /api/bookmarks/:id  → { data: { _id } }
```

---

## 🌐 Deploying to Vercel

### 1. Push to GitHub

```bash
git init && git add . && git commit -m "init"
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)

### 3. Add Environment Variables

In Vercel dashboard → **Settings** → **Environment Variables**, add:

| Key                 | Value                                |
| ------------------- | ------------------------------------ |
| `MONGODB_URI`       | Your MongoDB Atlas connection string |
| `MONGODB_DB`        | `trading_dashboard`                  |
| `NEXTAUTH_SECRET`   | Random 32+ byte secret               |
| `NEXTAUTH_URL`      | Your deployed URL                    |
| `FINNHUB_KEY`       | Finnhub key (optional — stocks only)   |

### 4. Deploy

Click **Deploy** — Vercel handles the rest! 🚀

---

## 📈 Extending Market Data

### Adding More Crypto (CoinGecko)

In `pages/api/prices.js`, add coin IDs to the URL and the `CRYPTO_META` map:

```js
// 1. Add to COINGECKO_URL
"&ids=bitcoin,ethereum,solana,chainlink,dogecoin,ripple,ondo-finance,avalanche-2"

// 2. Add to the CRYPTO_META object
"avalanche-2": { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", icon: "🔺", category: "crypto" },
```

### Adding More Stocks/ETFs (Finnhub)

```js
// In FINNHUB_STOCKS, add another entry (one /quote call per symbol):
{
  ticker: "SLV",
  id: "silver",
  symbol: "SILVER",
  name: "Silver (SLV)",
  icon: "🥈",
  category: "commodity",
},
```

---

## 🎨 Design System

| Token   | Value                             | Usage                   |
| ------- | --------------------------------- | ----------------------- |
| `arc`   | `#00d4ff`                         | Primary accent (cyan)   |
| `ember` | `#f59e0b`                         | Secondary accent (gold) |
| `bull`  | `#10b981`                         | Positive / gains        |
| `bear`  | `#ef4444`                         | Negative / losses       |
| `void`  | `#04080f`                         | Darkest background      |
| Font    | Bebas Neue + DM Sans + Space Mono | Display + Body + Code   |

### Glass Card Variants

```css
.glass-card        /* neutral glass */
.glass-card-arc    /* cyan-tinted glass */
.glass-card-ember  /* gold-tinted glass */
.glass-card-bull   /* green-tinted glass */
.glass-card-bear   /* red-tinted glass */
```

### Button Variants

```css
.btn-arc    /* cyan primary action */
.btn-ember  /* gold secondary action */
.btn-danger /* red destructive action */
.btn-ghost  /* transparent neutral */
```

---

## 📝 License

MIT — use freely for personal or commercial projects.

# DISCIPLINE HERO
