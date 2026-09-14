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
import { csrfSession, generateCsrfToken, doubleCsrfProtection } from "./middleware/csrf";

dotenv.config();
const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;

const allowedOrigins = new Set([
  "https://eternalbotanic.com", "https://www.eternalbotanic.com",
  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://localhost:3001"] : []),
]);
// Cookie auth uses SameSite=None for the separate API host. Reject cross-site
// writes before parsing bodies or executing routes, including login/logout.
// Stripe is authenticated separately using its signed, unmodified raw body.
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.path === "/api/stripe/webhook" || req.path === "/api/stripe/webhook/") return next();
  const origin = req.get("origin");
  if (!origin || !allowedOrigins.has(origin)) {
    res.status(403).json({ message: "Untrusted request origin" });
    return;
  }
  next();
});
app.use(cors({
  origin: (origin, callback) => callback(null, !!origin && allowedOrigins.has(origin)),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
}));

app.use(cookieParser());
app.use(csrfSession);
app.get("/api/csrf-token", (req, res) => {
  let source = req.get("origin");
  if (!source && req.get("referer")) {
    try { source = new URL(req.get("referer")!).origin; } catch { /* reject below */ }
  }
  if (!source || !allowedOrigins.has(source)) { res.status(403).json({ message: "Untrusted request origin" }); return; }
  res.set("Cache-Control", "no-store");
  res.json({ csrfToken: generateCsrfToken(req, res) });
});
app.use(doubleCsrfProtection);
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === "EBADCSRFTOKEN") { res.status(403).json({ code: "EBADCSRFTOKEN", message: "Invalid CSRF token" }); return; }
  next(err);
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many request, please try again later",
});
app.use("/api/", limiter);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/admin", adminRoutes);

const imagesPath = path.join(__dirname, "../public/images");
if (!fs.existsSync(imagesPath)) {
  fs.mkdirSync(imagesPath, { recursive: true });
  console.log("Created images directory:", imagesPath);
} else {
  console.log("Images directory exists:", imagesPath);
}

import webhookRoute from "./routes/stripe/webhook";
app.use("/api/stripe/webhook", webhookRoute);

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

app.use((req, res, next) => {
  console.log("Request", { method: req.method, path: req.path,
    origin: req.headers.origin,
    cookie: req.headers.cookie ? "present" : "missing",
  });
  next();
});

app.use(
  "/images",
  (req, res, next) => {
    console.log("Image request:", req.path);
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
  console.error("Unhandled request failure");
  res.status(500).json({ message: "Internal server error" });
});

mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log("Connected to MongoDB");
    console.log("JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "MISSING");
    console.log(
      "💳 STRIPE_SECRET_KEY:",
      process.env.STRIPE_SECRET_KEY ? "Set" : "MISSING"
    );
    console.log(
      "SENDGRID_API_KEY:",
      process.env.SENDGRID_API_KEY ? "Set" : "MISSING"
    );
    console.log("ADMIN_EMAIL:", process.env.ADMIN_EMAIL || "MISSING");
    console.log("CLIENT_URL:", process.env.CLIENT_URL || "MISSING");

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed");
    process.exit(1);
  });
