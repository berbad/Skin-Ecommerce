import { randomBytes } from "crypto";
import mongoose from "mongoose";
import User, { IUser } from "../models/user.model";
import AccountToken from "../models/AccountToken";
import Session from "../models/Session";
import { tokenHash } from "./sessions";
export async function issueAccountToken(
  user: IUser,
  purpose: "reset" | "email",
  email?: string,
) {
  const token = randomBytes(32).toString("hex");
  // Reissuing invalidates the previous link. Transaction prevents concurrent duplicates.
  await mongoose.connection.transaction(async (session) => {
    await AccountToken.deleteMany(
      { userId: String(user._id), purpose },
      { session },
    );
    await AccountToken.create(
      [
        {
          _id: tokenHash(token),
          userId: String(user._id),
          purpose,
          email,
          authVersion: user.authVersion || 0,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      ],
      { session },
    );
  });
  return token;
}
export async function applyAccountToken(
  raw: string,
  purpose: "reset" | "email",
  password?: string,
) {
  let applied = false;
  await mongoose.connection.transaction(async (session) => {
    applied = false;
    const token = await AccountToken.findOne({
      _id: tokenHash(raw),
      purpose,
      expiresAt: { $gt: new Date() },
    }).session(session);
    if (!token) return;
    const version = token.authVersion;
    const user = await User.findById(token.userId).session(session);
    if (!user || user.disabled || (user.authVersion || 0) !== version) return;
    const result = await User.updateOne(
      {
        _id: user._id,
        $or: [
          { authVersion: version },
          ...(version === 0 ? [{ authVersion: { $exists: false } }] : []),
        ],
      },
      {
        $set: purpose === "reset" ? { password } : { email: token.email },
        $inc: { authVersion: 1 },
      },
      { session, runValidators: true },
    );
    if (!result.modifiedCount) return;
    await AccountToken.deleteMany({ userId: token.userId }, { session });
    await Session.deleteMany({ userId: token.userId }, { session });
    applied = true;
  });
  return applied;
}
