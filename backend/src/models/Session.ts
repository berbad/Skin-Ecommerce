import mongoose, { Schema } from "mongoose";
const schema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    authVersion: { type: Number, required: true },
    role: { type: String, required: true },
    mfaVerified: { type: Boolean, required: true },
    authenticatedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { _id: false },
);
export default mongoose.model("Session", schema);
