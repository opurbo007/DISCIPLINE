/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Color Palette ──────────────────────────────────────────────────
      colors: {
        // Deep backgrounds
        void:    "#04080f",
        abyss:   "#080c14",
        surface: "#0d1117",
        panel:   "#111827",

        // Accent – electric cyan
        arc: {
          DEFAULT: "#00d4ff",
          dim:     "#00a8cc",
          glow:    "rgba(0,212,255,0.15)",
        },

        // Accent – amber gold
        ember: {
          DEFAULT: "#f59e0b",
          dim:     "#d97706",
          glow:    "rgba(245,158,11,0.15)",
        },

        // Semantic
        bull:  "#10b981",   // gains / positive
        bear:  "#ef4444",   // losses / negative

        // Neutral glass tints
        glass: {
          border:  "rgba(255,255,255,0.07)",
          muted:   "rgba(255,255,255,0.04)",
          white:   "rgba(255,255,255,0.08)",
        },
      },

      // ── Typography ─────────────────────────────────────────────────────
      fontFamily: {
        mono:    ["'Space Mono'", "monospace"],
        display: ["'Bebas Neue'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
      },

      // ── Blur & backdrop ────────────────────────────────────────────────
      backdropBlur: {
        xs: "4px",
        glass: "16px",
      },

      // ── Box shadows ────────────────────────────────────────────────────
      boxShadow: {
        "glass-arc":   "0 0 0 1px rgba(0,212,255,0.15), 0 8px 32px rgba(0,0,0,0.4)",
        "glass-ember": "0 0 0 1px rgba(245,158,11,0.15), 0 8px 32px rgba(0,0,0,0.4)",
        "glass-plain": "0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.4)",
        "inner-glow":  "inset 0 1px 0 rgba(255,255,255,0.08)",
      },

      // ── Animations ─────────────────────────────────────────────────────
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-arc": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0,212,255,0)" },
          "50%":       { boxShadow: "0 0 0 4px rgba(0,212,255,0.25)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.85" },
        },
        ticker: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-33.333%)" },
        },
      },
      animation: {
        "fade-up":    "fade-up 0.5s ease forwards",
        "pulse-arc":  "pulse-arc 2s ease infinite",
        shimmer:      "shimmer 2s linear infinite",
        flicker:      "flicker 3s ease-in-out infinite",
        ticker:       "ticker 30s linear infinite",
      },

      // ── Gradients ──────────────────────────────────────────────────────
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
        "noise-overlay":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },

      backgroundSize: {
        grid: "32px 32px",
      },
    },
  },
  plugins: [],
};
