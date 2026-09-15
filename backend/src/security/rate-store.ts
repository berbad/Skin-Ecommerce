import mongoose, { Schema } from "mongoose";
import { createHash } from "crypto";
import type { Store } from "express-rate-limit";
const schema = new Schema(
  {
    _id: { type: String, required: true },
    hits: { type: Number, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { _id: false },
);
export const RateBucket = mongoose.model("RateBucket", schema);
export class MongoRateStore implements Store {
  localKeys = false;
  constructor(
    private namespace: string,
    private windowMs: number,
  ) {}
  private id(key: string) {
    return createHash("sha256")
      .update(
        `${this.namespace}:${Math.floor(Date.now() / this.windowMs)}:${key}`,
      )
      .digest("hex");
  }
  async increment(key: string) {
    const expiresAt = new Date(
      (Math.floor(Date.now() / this.windowMs) + 1) * this.windowMs,
    );
    let entry;
    try {
      entry = await RateBucket.findOneAndUpdate(
        { _id: this.id(key) },
        { $inc: { hits: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true, new: true },
      );
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
      entry = await RateBucket.findOneAndUpdate(
        { _id: this.id(key) },
        { $inc: { hits: 1 } },
        { new: true },
      );
    }
    if (!entry) throw new Error("Rate limit store unavailable");
    return { totalHits: entry.hits, resetTime: entry.expiresAt };
  }
  async decrement(key: string) {
    await RateBucket.updateOne(
      { _id: this.id(key), hits: { $gt: 0 } },
      { $inc: { hits: -1 } },
    );
  }
  async resetKey(key: string) {
    await RateBucket.deleteOne({ _id: this.id(key) });
  }
}
