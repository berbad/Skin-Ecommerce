import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import { getProfile, updateProfile } from "../controllers/auth.controller";
import { body, validationResult } from "express-validator";

const router = express.Router();

if (!process.env.JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not set in .env");
}
const JWT_SECRET = process.env.JWT_SECRET;

// Register
router.post(
  "/register",
  body("email").isEmail().normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),
  body("name").trim().isLength({ min: 1, max: 100 }),

  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
      return;
    }

    try {
      const { email, password, name } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res
          .status(400)
          .json({ success: false, message: "Email already in use" });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        email,
        name,
        password: hashedPassword,
        role: "user",
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: { id: newUser._id, email: newUser.email, name: newUser.name },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Error registering user",
      });
    }
  }
);

// Login
router.post(
  "/login",
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),

  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
      return;
    }

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      const isMatch = user && (await bcrypt.compare(password, user.password));
      if (!user || !isMatch) {
        res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
        return;
      }

      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: "Logged in successfully",
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          cart: user.cart,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Error logging in",
      });
    }
  }
);

// Logout
router.post(
  "/logout",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cart } = req.body;

      if (req.user?.id && cart) {
        await User.findByIdAndUpdate(req.user.id, { cart });
      }

      res.clearCookie("token");

      res
        .status(200)
        .json({ success: true, message: "Logged out and cart saved" });
    } catch (err) {
      console.error("Logout error:", err);
      res.status(500).json({ success: false, message: "Logout failed" });
    }
  }
);

// Profile routes
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

export default router;
