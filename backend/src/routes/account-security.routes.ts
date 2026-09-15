import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import User from "../models/user.model";
import AccountToken from "../models/AccountToken";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import {
  emailSchema,
  loginPasswordSchema,
  passwordSchema,
} from "../security/validation";
import { consumeMfa } from "../security/mfa";
import {
  issueAccountToken,
  applyAccountToken,
} from "../services/account-tokens";
import { tokenHash, cookieOptions } from "../services/sessions";
import { sendReceiptEmail } from "../utils/mailer";
const router = express.Router();
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
function link(page: string, token: string) {
  const origin = process.env.CLIENT_URL || "https://www.eternalbotanic.com";
  const parsed = new URL(origin);
  if (
    ![
      "https://eternalbotanic.com",
      "https://www.eternalbotanic.com",
      ...(process.env.NODE_ENV !== "production"
        ? ["http://localhost:3000", "http://localhost:3001"]
        : []),
    ].includes(parsed.origin)
  )
    throw new Error("Untrusted CLIENT_URL");
  return `${parsed.origin}/${page}#token=${token}`;
}
router.post("/forgot-password", async (req, res, next) => {
  try {
    const parsed = z
      .object({ email: emailSchema })
      .strict()
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid email" });
      return;
    }
    const user = await User.findOne({
      email: { $eq: parsed.data.email },
      disabled: { $ne: true },
    });
    if (user) {
      const token = await issueAccountToken(user, "reset");
      const url = link("reset-password", token);
      try {
        await sendReceiptEmail(
          user.email,
          "Reset your password",
          `<p>Use this link within 30 minutes: <a href="${url}">Reset password</a>. If you did not request this, ignore it.</p>`,
          `Reset your password within 30 minutes: ${url}. If you did not request this, ignore it.`,
        );
      } catch {
        console.error(
          JSON.stringify({
            event: "account_email_failed",
            userId: String(user._id),
          }),
        );
      }
    }
    res.json({
      message: "If this account exists, a recovery email has been sent",
    });
  } catch (err) {
    next(err);
  }
});
router.post("/reset-password", async (req, res, next) => {
  try {
    const parsed = z
      .object({
        token: tokenSchema,
        password: passwordSchema,
        code: z.string().max(64).optional(),
      })
      .strict()
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid reset request" });
      return;
    }
    const token = await AccountToken.findOne({
      _id: tokenHash(parsed.data.token),
      purpose: "reset",
      expiresAt: { $gt: new Date() },
    });
    const user = token && (await User.findById(token.userId));
    if (
      !user ||
      user.disabled ||
      (user.authVersion || 0) !== token!.authVersion
    ) {
      res.status(400).json({ message: "Invalid or expired link" });
      return;
    }
    if (
      (user.role === "admin" || user.mfaSecret) &&
      !(await consumeMfa(user, parsed.data.code))
    ) {
      res
        .status(403)
        .json({ message: "Authenticator or recovery code required" });
      return;
    }
    const password = await bcrypt.hash(parsed.data.password, 12);
    if (!(await applyAccountToken(parsed.data.token, "reset", password))) {
      res.status(400).json({ message: "Invalid or expired link" });
      return;
    }
    res.clearCookie("token", cookieOptions);
    res.json({ message: "Password updated. Sign in again." });
  } catch (err) {
    next(err);
  }
});
router.post(
  "/email-change",
  authMiddleware,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const parsed = z
        .object({
          email: emailSchema,
          password: loginPasswordSchema,
          code: z.string().max(64).optional(),
        })
        .strict()
        .safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid email change" });
        return;
      }
      const user = await User.findById(req.user!.id);
      if (
        !user ||
        !(await bcrypt.compare(parsed.data.password, user.password))
      ) {
        res.status(401).json({ message: "Current password required" });
        return;
      }
      if (
        (user.role === "admin" || user.mfaSecret) &&
        !(await consumeMfa(user, parsed.data.code))
      ) {
        res
          .status(403)
          .json({ message: "Authenticator or recovery code required" });
        return;
      }
      if (await User.exists({ email: parsed.data.email })) {
        res.status(400).json({ message: "Unable to use this email" });
        return;
      }
      const token = await issueAccountToken(user, "email", parsed.data.email);
      const url = link("confirm-email", token);
      await sendReceiptEmail(
        parsed.data.email,
        "Verify your new email",
        `<p>Use this link within 30 minutes: <a href="${url}">Verify email</a>.</p>`,
        `Verify your new email within 30 minutes: ${url}`,
      );
      res.json({ message: "Check your new email to confirm the change" });
    } catch (err) {
      next(err);
    }
  },
);
router.post("/confirm-email", async (req, res, next) => {
  try {
    const parsed = z
      .object({ token: tokenSchema })
      .strict()
      .safeParse(req.body);
    if (
      !parsed.success ||
      !(await applyAccountToken(parsed.data.token, "email"))
    ) {
      res.status(400).json({ message: "Invalid or expired link" });
      return;
    }
    res.clearCookie("token", cookieOptions);
    res.json({ message: "Email verified. Sign in again." });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      res.status(400).json({ message: "Unable to use this email" });
      return;
    }
    next(err);
  }
});
export default router;
