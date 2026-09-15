import { createHash, randomBytes } from "crypto";
import { Request, Response } from "express";
import Session from "../models/Session";
import User, { IUser } from "../models/user.model";
export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  path: "/",
};
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function requestToken(req: Request): string | undefined {
  const token =
    req.cookies?.token ??
    (req.get("authorization")?.startsWith("Bearer ")
      ? req.get("authorization")!.slice(7)
      : undefined);
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token)
    ? token
    : undefined;
}
export async function createSession(
  user: IUser,
  res: Response,
  mfaVerified = false,
) {
  const token = randomBytes(32).toString("hex");
  const maxAge = user.role === "admin" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  await Session.create({
    _id: tokenHash(token),
    userId: String(user._id),
    role: user.role,
    authVersion: user.authVersion || 0,
    mfaVerified,
    authenticatedAt: new Date(),
    expiresAt: new Date(Date.now() + maxAge),
  });
  res.cookie("token", token, { ...cookieOptions, maxAge });
}
export async function resolveSession(req: Request) {
  const token = requestToken(req);
  if (!token) return null;
  const session = await Session.findOne({
    _id: tokenHash(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const user = await User.findById(session.userId);
  if (
    !user ||
    user.disabled ||
    user.role !== session.role ||
    (user.authVersion || 0) !== session.authVersion ||
    (user.role === "admin" && (!user.mfaSecret || !session.mfaVerified))
  ) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }
  return {
    id: String(user._id),
    email: user.email,
    role: user.role,
    name: user.name,
    sessionId: session.id as string,
    authenticatedAt: session.authenticatedAt,
    mfaVerified: session.mfaVerified,
  };
}
export async function revokeSession(req: Request, res: Response) {
  const token = requestToken(req);
  if (token) await Session.deleteOne({ _id: tokenHash(token) });
  res.clearCookie("token", cookieOptions);
  res.clearCookie("__Host-csrf-token", cookieOptions);
  res.clearCookie("__Host-csrf-session", cookieOptions);
}
