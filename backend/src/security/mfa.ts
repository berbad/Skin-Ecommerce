import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { TOTP } from "otpauth";
import User, { IUser } from "../models/user.model";
import { tokenHash } from "../services/sessions";
function key(): Buffer {
  const raw = process.env.MFA_ENCRYPTION_KEY || "";
  const value = Buffer.from(raw, "base64");
  if (value.length !== 32 || value.toString("base64") !== raw)
    throw new Error("MFA_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return value;
}
export function encryptMfaSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((b) => b.toString("base64"))
    .join(".");
}
function decryptMfaSecret(encrypted: string): string {
  const [iv, tag, ciphertext] = encrypted
    .split(".")
    .map((v) => Buffer.from(v, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
export async function consumeMfa(
  user: IUser,
  code?: string,
  allowRecovery = true,
): Promise<boolean> {
  if (!user.mfaSecret || typeof code !== "string") return false;
  if (allowRecovery && /^[a-f0-9]{32}$/.test(code)) {
    const result = await User.updateOne(
      {
        _id: user._id,
        mfaSecret: user.mfaSecret,
        recoveryCodes: tokenHash(code),
      },
      { $pull: { recoveryCodes: tokenHash(code) } },
    );
    if (result.modifiedCount)
      console.info(
        JSON.stringify({
          event: "mfa_recovery_used",
          userId: String(user._id),
        }),
      );
    return result.modifiedCount === 1;
  }
  if (!/^\d{6}$/.test(code)) return false;
  const now = Date.now();
  const totp = new TOTP({ secret: decryptMfaSecret(user.mfaSecret) });
  const delta = totp.validate({ token: code, timestamp: now, window: 1 });
  if (delta === null) return false;
  const step = Math.floor(now / 30000) + delta;
  const result = await User.updateOne(
    {
      _id: user._id,
      mfaSecret: user.mfaSecret,
      $or: [
        { mfaLastStep: { $lt: step } },
        { mfaLastStep: { $exists: false } },
      ],
    },
    { $set: { mfaLastStep: step } },
  );
  return result.modifiedCount === 1;
}
