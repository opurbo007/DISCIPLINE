# 📊 Trading Discipline Dashboard

A glassmorphic, full-stack trading dashboard built with **Next.js 14**, **TailwindCSS**, and **MongoDB Atlas**.

Live market prices · Market session clocks · Bookmark manager · Trading notes journal

---

## ✨ Features

| Feature | Details |
|---|---|
| **Live Market Prices** | BTC, ETH, SOL (CoinGecko) + S&P 500, NASDAQ, Bonds, WTI, DXY (Alpha Vantage) |
| **Auto-refresh** | Prices refresh every 60 seconds via SWR |
| **Ticker Tape** | Scrolling live price strip across the top |
| **Market Sessions** | Live clocks for New York, London, Tokyo with session progress bars |
| **Bookmarks** | CRUD bookmark manager with favicon, categories, and filter pills |
| **Trading Notes** | Full journal with pin, color-code, tags, search, and expand/collapse |
| **MongoDB Persistence** | Notes and bookmarks persist across sessions and devices |
| **Glassmorphism UI** | Backdrop blur, gradient borders, neon accents, grid background |
| **Responsive** | Works on mobile, tablet, and desktop |

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

```env
# MongoDB Atlas (free tier works great)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/trading_dashboard?retryWrites=true&w=majority
MONGODB_DB=trading_dashboard

# Alpha Vantage — free key: https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_KEY=your_key_here
```

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
- Used for: BTC, ETH, SOL

### Alpha Vantage (Stocks, Forex, Commodities)
- **Free key required** → [Get yours here](https://www.alphavantage.co/support/#api-key)
- Free tier: **25 requests/day**, 5 requests/minute
- Used for: S&P 500 (SPY), NASDAQ (QQQ), Bonds (TLT), WTI Oil (USO), DXY (EUR/USD)

> ⚠️ **Free tier limits**: With 6 Alpha Vantage calls per price refresh, you'll use ~6 calls per load. At 25/day, avoid refreshing more than 4 times per day on the free tier. Consider upgrading to premium ($50/month) for production.

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
→ { markets: MarketAsset[], timestamp: string, errors: string[] }
```

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

| Key | Value |
|-----|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `MONGODB_DB` | `trading_dashboard` |
| `ALPHA_VANTAGE_KEY` | Your Alpha Vantage API key |

### 4. Deploy
Click **Deploy** — Vercel handles the rest! 🚀

---

## 📈 Extending Market Data

### Adding More Crypto (CoinGecko)
In `pages/api/prices.js`, add coin IDs to the URL and the `map` object:

```js
// 1. Add to COINGECKO_URL
"?ids=bitcoin,ethereum,solana,chainlink,avalanche-2"

// 2. Add to the map object inside fetchCrypto()
"chainlink":     { symbol: "LINK", name: "Chainlink", icon: "⬡", category: "crypto" },
"avalanche-2":   { symbol: "AVAX", name: "Avalanche", icon: "🔺", category: "crypto" },
```

### Adding More Stocks/ETFs (Alpha Vantage)
```js
// In the main handler, add another fetchAVQuote call:
const gold = await fetchAVQuote("GLD", {
  symbol: "GOLD", name: "Gold (GLD)", icon: "🥇", category: "commodity",
});
results.push(gold);
```

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `arc` | `#00d4ff` | Primary accent (cyan) |
| `ember` | `#f59e0b` | Secondary accent (gold) |
| `bull` | `#10b981` | Positive / gains |
| `bear` | `#ef4444` | Negative / losses |
| `void` | `#04080f` | Darkest background |
| Font | Bebas Neue + DM Sans + Space Mono | Display + Body + Code |

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
# DISCIPLINE
