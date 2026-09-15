import mongoose, { Schema } from "mongoose";
const schema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    purpose: { type: String, enum: ["reset", "email"], required: true },
    email: { type: String },
    authVersion: { type: Number, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { _id: false },
);
schema.index({ userId: 1, purpose: 1 }, { unique: true });
export default mongoose.model("AccountToken", schema);
