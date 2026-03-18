/**
 * lib/mongodb.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton MongoDB connection using Mongoose.
 * Re-uses the connection across hot-reloads in Next.js dev mode and across
 * serverless function invocations in production (via global cache).
 *
 * Usage:
 *   import dbConnect from '@/lib/mongodb';
 *   await dbConnect();
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "❌ Please define MONGODB_URI in your .env.local file.\n" +
    "   See .env.example for the required format."
  );
}

/**
 * Global cache: prevents re-connecting on every serverless invocation.
 * `global._mongooseCache` persists across hot reloads in dev.
 */
let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

async function dbConnect() {
  // Return existing connection if already established
  if (cached.conn) return cached.conn;

  // Initiate connection if not already in progress
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,    // Fail fast instead of buffering when disconnected
      dbName: process.env.MONGODB_DB || "trading_dashboard",
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log("✅ MongoDB connected");
        return mongooseInstance;
      });
  }

  // Await the pending promise
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
