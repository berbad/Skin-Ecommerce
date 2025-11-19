import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import adminRoutes from "./routes/admin.routes";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (
        origin === "https://eternalbotanic.com" ||
        origin === "https://www.eternalbotanic.com"
      ) {
        return callback(null, true);
      }

      if (origin.startsWith("https://skin-ecommerce.onrender.com")) {
        return callback(null, true);
      }

      if (origin.startsWith("http://localhost")) {
        return callback(null, true);
      }

      console.warn("⚠️ CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(cookieParser());

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use("/api/admin", adminRoutes);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many request, please try again later",
});

app.use("/api/", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, please try again later",
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

const imagesPath = path.join(__dirname, "../public/images");
if (!fs.existsSync(imagesPath)) {
  fs.mkdirSync(imagesPath, { recursive: true });
  console.log("✅ Created images directory:", imagesPath);
} else {
  console.log("✅ Images directory exists:", imagesPath);
}

import webhookRoute from "./routes/stripe/webhook";
app.use("/api/stripe/webhook", webhookRoute);

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    origin: req.headers.origin,
    cookie: req.headers.cookie ? "present" : "missing",
  });
  next();
});

app.use(
  "/images",
  (req, res, next) => {
    console.log("📸 Image request:", req.path);
    next();
  },
  express.static(path.join(__dirname, "../public/images"))
);

// API routes
import productRoutes from "./routes/product.routes";
import authRoutes from "./routes/auth.routes";
import orderRoutes from "./routes/order.routes";
import cartRoutes from "./routes/cart.routes";
import stripeRoutes from "./routes/stripe.routes";

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/stripe", stripeRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Global error handler caught error:", err);
  res.status(500).json({ message: "Internal server error" });
});

mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    console.log(
      "🔐 JWT_SECRET:",
      process.env.JWT_SECRET ? "Set" : "❌ MISSING"
    );
    console.log(
      "💳 STRIPE_SECRET_KEY:",
      process.env.STRIPE_SECRET_KEY ? "Set" : "❌ MISSING"
    );
    console.log(
      "📧 SENDGRID_API_KEY:",
      process.env.SENDGRID_API_KEY ? "Set" : "❌ MISSING"
    );
    console.log("📧 ADMIN_EMAIL:", process.env.ADMIN_EMAIL || "❌ MISSING");
    console.log("🌐 CLIENT_URL:", process.env.CLIENT_URL || "❌ MISSING");

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });
