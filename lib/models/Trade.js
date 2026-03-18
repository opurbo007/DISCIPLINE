/**
 * lib/models/Trade.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mongoose schema for a single trade journal entry.
 *
 * A trade moves through statuses:
 *   PLANNED → OPEN → CLOSED
 *             OPEN → CANCELLED
 *
 * Fields overview:
 *   Identity    : userId, coin, direction (LONG/SHORT), setup tag
 *   Sizing      : tradeAmount, leverage, positionSize (auto-calculated)
 *   Levels      : entryPrice, stopLoss, takeProfit
 *   Risk/Reward : riskAmount, riskPercent, rrRatio (all server-calculated)
 *   Outcome     : exitPrice, netPnl, status, closedAt
 *   Analysis    : reason (pre-trade thesis), outcome (post-trade notes), mood, tags
 */

import mongoose from "mongoose";

const TradeSchema = new mongoose.Schema(
  {
    // ── Ownership ──────────────────────────────────────────────────────────
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },

    // ── Identity ───────────────────────────────────────────────────────────
    coin: {
      type:      String,
      required:  [true, "Coin / market is required"],
      trim:      true,
      uppercase: true,  // Store as "BTC", "ETH", "EUR/USD", etc.
    },
    direction: {
      type:    String,
      enum:    ["LONG", "SHORT"],
      required: [true, "Direction (LONG / SHORT) is required"],
    },
    setup: {
      type:    String,
      trim:    true,
      default: "",  // e.g. "Break & Retest", "Fib Reversal", "EMA Crossover"
    },

    // ── Sizing ─────────────────────────────────────────────────────────────
    tradeAmount: {
      type:     Number,
      required: [true, "Trade amount is required"],
      min:      [0, "Amount must be positive"],
    },
    leverage: {
      type:    Number,
      default: 1,
      min:     [1, "Leverage minimum is 1x"],
      max:     [500, "Leverage maximum is 500x"],
    },
    // positionSize = tradeAmount × leverage (stored for quick display)
    positionSize: {
      type:    Number,
      default: 0,
    },

    // ── Price levels ───────────────────────────────────────────────────────
    entryPrice: {
      type:    Number,
      default: null,
    },
    stopLoss: {
      type:    Number,
      default: null,
    },
    takeProfit: {
      type:    Number,
      default: null,
    },

    // ── Calculated risk metrics (set on save) ──────────────────────────────
    riskAmount: {
      type:    Number,
      default: null,  // USD at risk based on SL distance
    },
    rewardAmount: {
      type:    Number,
      default: null,  // USD potential gain based on TP distance
    },
    rrRatio: {
      type:    Number,
      default: null,  // reward / risk ratio (e.g. 2.5 = 2.5R)
    },

    // ── Outcome ────────────────────────────────────────────────────────────
    exitPrice: {
      type:    Number,
      default: null,
    },
    netPnl: {
      type:    Number,
      default: null,  // Final P&L in USD (positive = profit, negative = loss)
    },
    netPnlPercent: {
      type:    Number,
      default: null,  // P&L as % of tradeAmount
    },
    status: {
      type:    String,
      enum:    ["PLANNED", "OPEN", "CLOSED", "CANCELLED"],
      default: "PLANNED",
    },
    closedAt: {
      type:    Date,
      default: null,
    },

    // ── Analysis ───────────────────────────────────────────────────────────
    reason: {
      type:    String,
      trim:    true,
      default: "",  // Pre-trade: why you're taking this trade
    },
    outcome: {
      type:    String,
      trim:    true,
      default: "",  // Post-trade: what happened, lessons learned
    },
    mood: {
      type:    String,
      enum:    ["confident", "uncertain", "fomo", "revenge", "neutral", ""],
      default: "",  // Emotional state at entry — for psychology tracking
    },
    tags: {
      type:    [String],
      default: [],
    },

    // ── Date ───────────────────────────────────────────────────────────────
    tradeDate: {
      type:    Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ── Pre-save: auto-calculate derived fields ───────────────────────────────────
TradeSchema.pre("save", function (next) {
  // Position size
  if (this.tradeAmount != null && this.leverage != null) {
    this.positionSize = this.tradeAmount * this.leverage;
  }

  // Risk / Reward only if we have all three levels
  if (this.entryPrice && this.stopLoss && this.takeProfit && this.positionSize) {
    const slDist = Math.abs(this.entryPrice - this.stopLoss);
    const tpDist = Math.abs(this.takeProfit  - this.entryPrice);
    const slPct  = slDist / this.entryPrice;
    const tpPct  = tpDist / this.entryPrice;

    this.riskAmount   = this.positionSize * slPct;
    this.rewardAmount = this.positionSize * tpPct;
    this.rrRatio      = this.riskAmount > 0
      ? parseFloat((this.rewardAmount / this.riskAmount).toFixed(2))
      : null;
  }

  // Net P&L percent from tradeAmount (not positionSize) for meaningful comparison
  if (this.netPnl != null && this.tradeAmount > 0) {
    this.netPnlPercent = parseFloat(
      ((this.netPnl / this.tradeAmount) * 100).toFixed(2)
    );
  }

  next();
});

export default mongoose.models.Trade || mongoose.model("Trade", TradeSchema);
