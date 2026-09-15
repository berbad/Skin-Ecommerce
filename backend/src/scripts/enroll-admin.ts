import "dotenv/config";
import mongoose from "mongoose";
import { Secret, TOTP } from "otpauth";
import { randomBytes } from "crypto";
import { createInterface } from "readline/promises";
import User from "../models/user.model";
import { encryptMfaSecret } from "../security/mfa";
import { tokenHash } from "../services/sessions";

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error(
      "Run in a private interactive terminal; enrollment secrets must not enter CI logs",
    );
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email)
    throw new Error(
      "Usage: npm run security:enroll-admin -- admin@example.com",
    );
  await mongoose.connect(process.env.MONGODB_URI || "");
  const user = await User.findOne({
    email,
    role: "admin",
    disabled: { $ne: true },
  });
  if (!user || user.mfaSecret)
    throw new Error("An active, unenrolled administrator is required");
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({ secret, issuer: "Eternal Botanic", label: email });
  const encrypted = encryptMfaSecret(secret.base32); // Validate encryption configuration before disclosure.
  console.log(
    "Add this account to your authenticator in this private terminal.",
  );
  console.log(totp.toString());
  console.log("Manual setup key:", secret.base32);
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  let code;
  try {
    code = await prompt.question(
      "Enter the six-digit code to confirm enrollment: ",
    );
  } finally {
    prompt.close();
  }
  const now = Date.now();
  const delta = totp.validate({
    token: code.trim(),
    timestamp: now,
    window: 1,
  });
  if (delta === null) throw new Error("Invalid code; no account changes made");
  const recovery = Array.from({ length: 10 }, () =>
    randomBytes(16).toString("hex"),
  );
  const result = await User.updateOne(
    { _id: user._id, role: "admin", mfaSecret: { $exists: false } },
    {
      $set: {
        mfaSecret: encrypted,
        mfaLastStep: Math.floor(now / 30000) + delta,
        recoveryCodes: recovery.map(tokenHash),
      },
      $inc: { authVersion: 1 },
    },
  );
  if (result.modifiedCount !== 1)
    throw new Error("Account changed; enrollment cancelled");
  console.info(
    JSON.stringify({ event: "admin_mfa_enrolled", userId: String(user._id) }),
  );
  console.log(
    "Store these single-use recovery codes offline. They will not be shown again:",
  );
  recovery.forEach((code) => console.log(code));
}
main()
  .catch(() => {
    console.error(
      "Enrollment failed; verify the account, code and configuration.",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
