import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

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
}

// Stripe Webhook route
import webhookRoute from "./routes/stripe/webhook";
app.use("/api/stripe/webhook", webhookRoute);

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    origin: req.headers.origin,
    cookie: req.headers.cookie ? "present" : "missing",
    credentials: req.headers.cookie
      ? req.headers.cookie.substring(0, 50)
      : "none",
  });
  next();
});

app.use("/images", express.static(path.join(__dirname, "../public/images")));

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

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Global error handler caught error:", err);
  res.status(500).json({ message: "Internal server error" });
});

mongoose
  .connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });
