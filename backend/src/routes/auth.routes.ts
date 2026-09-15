import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import User from "../models/user.model";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { getProfile, updateProfile } from "../controllers/auth.controller";
import {
  emailSchema,
  loginPasswordSchema,
  passwordSchema,
} from "../security/validation";
import { createSession, revokeSession } from "../services/sessions";
import { consumeMfa } from "../security/mfa";
import accountSecurityRoutes from "./account-security.routes";
const router = express.Router();
router.use(accountSecurityRoutes);
const loginSchema = z
  .object({
    email: emailSchema,
    password: loginPasswordSchema,
    code: z.string().max(64).optional(),
  })
  .strict();
const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    name: z.string().trim().min(1).max(100),
  })
  .strict();
// A real bcrypt hash makes unknown-user attempts perform the same password work.
const dummyHash = bcrypt.hashSync("unused-dummy-password", 12);
router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }
    const user = await User.findOne({ email: { $eq: input.data.email } });
    const valid = await bcrypt.compare(
      input.data.password,
      user?.password || dummyHash,
    );
    if (!user || !valid || user.disabled) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    const needsMfa = user.role === "admin" || !!user.mfaSecret;
    if (needsMfa && !(await consumeMfa(user, input.data.code))) {
      res
        .status(403)
        .json({
          code: "MFA_REQUIRED",
          message:
            "Enter a valid authenticator or recovery code. Unenrolled administrators must complete secure enrollment.",
        });
      return;
    }
    await createSession(user, res, needsMfa);
    res
      .status(200)
      .json({
        success: true,
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
          cart: user.cart,
        },
      });
  } catch (err) {
    next(err);
  }
});
router.post("/logout", async (req, res, next) => {
  try {
    await revokeSession(req, res);
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    next(err);
  }
});
router.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.safeParse(req.body);
    if (!input.success) {
      res
        .status(400)
        .json({
          message:
            "Use a valid email, name, and password of at least 12 characters (maximum 72 bytes)",
        });
      return;
    }
    const { email, name, password } = input.data;
    if (await User.exists({ email })) {
      res
        .status(400)
        .json({ message: "Unable to register with these details" });
      return;
    }
    const user = await User.create({
      email,
      name,
      password: await bcrypt.hash(password, 12),
      role: "user",
    });
    res
      .status(201)
      .json({ success: true, user: { id: String(user._id), email, name } });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      res
        .status(400)
        .json({ message: "Unable to register with these details" });
      return;
    }
    next(err);
  }
});
router.get("/test-auth", authMiddleware, (req: AuthenticatedRequest, res) =>
  res.json({
    success: true,
    user: {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
      name: req.user!.name,
    },
  }),
);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
export default router;
