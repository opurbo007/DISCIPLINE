/**
 * lib/models/Holding.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Represents a single crypto holding in a user's portfolio.
 *
 * A user can have multiple "lots" of the same coin (e.g. two BTC purchases at
 * different prices). The portfolio page aggregates lots per coin to show the
 * blended average price.
 *
 * Fields:
 *  userId       : Reference to the User who owns this holding
 *  coinId       : CoinGecko coin ID (e.g. "bitcoin", "ethereum", "solana")
 *  symbol       : Ticker symbol (e.g. "BTC")
 *  name         : Display name (e.g. "Bitcoin")
 *  icon         : Single character icon (e.g. "₿")
 *  units        : Number of coins purchased
 *  purchasePrice: Price per coin at time of purchase (USD)
 *  purchaseDate : Optional date of purchase for record keeping
 *  notes        : Optional note (e.g. "Bought the dip")
 */

import mongoose from "mongoose";

const HoldingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for fast per-user queries
    },
    coinId: {
      type: String,
      required: [true, "Coin ID is required"],
      trim: true,
      lowercase: true,
    },
    symbol: {
      type: String,
      required: [true, "Symbol is required"],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Coin name is required"],
      trim: true,
    },
    icon: {
      type: String,
      default: "◎",
    },
    units: {
      type: Number,
      required: [true, "Units purchased is required"],
      min: [0.00000001, "Units must be greater than 0"],
    },
    purchasePrice: {
      type: Number,
      required: [true, "Purchase price is required"],
      min: [0, "Purchase price cannot be negative"],
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [200, "Notes max 200 characters"],
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Holding ||
  mongoose.model("Holding", HoldingSchema);
