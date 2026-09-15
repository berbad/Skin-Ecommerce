import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { createHash } from "crypto";
import path from "path";
import {
  csrfSession,
  generateCsrfToken,
  doubleCsrfProtection,
  isStripeWebhook,
} from "./middleware/csrf";
import { MongoRateStore } from "./security/rate-store";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";
import cartRoutes from "./routes/cart.routes";
import stripeRoutes from "./routes/stripe.routes";
import webhookRoutes from "./routes/stripe/webhook";
function limiter(
  namespace: string,
  limit: number,
  windowMs = 15 * 60 * 1000,
  account = false,
) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store:
      process.env.NODE_ENV === "test"
        ? undefined
        : new MongoRateStore(namespace, windowMs),
    ...(account
      ? {
          keyGenerator: (req: Request) =>
            createHash("sha256")
              .update(
                typeof req.body?.email === "string"
                  ? req.body.email.trim().toLowerCase()
                  : ipKeyGenerator(req.ip || "unknown"),
              )
              .digest("hex"),
        }
      : {}),
    message: { message: "Too many requests. Please wait and try again." },
  });
}
export function createApp() {
  const app = express();
  // Configure exact trusted proxy IPs/subnets; never trust an arbitrary hop count.
  app.set(
    "trust proxy",
    process.env.TRUST_PROXY
      ? process.env.TRUST_PROXY.split(",").map((v) => v.trim())
      : false,
  );
  app.disable("x-powered-by");
  const origins = new Set([
    "https://eternalbotanic.com",
    "https://www.eternalbotanic.com",
    ...(process.env.NODE_ENV !== "production"
      ? ["http://localhost:3000", "http://localhost:3001"]
      : []),
  ]);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use((req, res, next) => {
    if (
      ["GET", "HEAD", "OPTIONS"].includes(req.method) ||
      isStripeWebhook(req)
    ) {
      next();
      return;
    }
    if (!origins.has(req.get("origin") || "")) {
      res.status(403).json({ message: "Untrusted request origin" });
      return;
    }
    next();
  });
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !!origin && origins.has(origin)),
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-CSRF-Token",
        "Idempotency-Key",
      ],
    }),
  );
  const apiLimiter = limiter("api", 600);
  app.use((req, res, next) =>
    req.path.startsWith("/api/") && !isStripeWebhook(req)
      ? apiLimiter(req, res, next)
      : next(),
  );
  app.use(cookieParser(), csrfSession);
  app.get("/api/csrf-token", limiter("csrf", 100), (req, res) => {
    let source = req.get("origin");
    if (!source && req.get("referer")) {
      try {
        source = new URL(req.get("referer")!).origin;
      } catch {
        /* rejected below */
      }
    }
    if (!source || !origins.has(source)) {
      res.status(403).json({ message: "Untrusted request origin" });
      return;
    }
    res
      .set("Cache-Control", "no-store")
      .json({ csrfToken: generateCsrfToken(req, res) });
  });
  app.use(doubleCsrfProtection);
  app.use(
    "/api/stripe/webhook",
    limiter("webhook", 1000, 60000),
    webhookRoutes,
  );
  app.use(
    express.json({ limit: "32kb" }),
    express.urlencoded({ extended: false, limit: "32kb", parameterLimit: 100 }),
  );
  app.use("/api/auth", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  for (const route of [
    "login",
    "register",
    "forgot-password",
    "reset-password",
    "email-change",
    "confirm-email",
  ]) {
    app.use(
      "/api/auth/" + route,
      limiter("auth-ip:" + route, 20),
      limiter("auth-account:" + route, 10, 15 * 60 * 1000, true),
    );
  }
  app.use("/api/admin", adminRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/stripe", stripeRoutes);
  app.use(
    "/images",
    express.static(path.join(__dirname, "../public/images"), {
      dotfiles: "deny",
      index: false,
    }),
  );
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use(
    (
      err: Error & { code?: string; status?: number; type?: string },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      if (err.code === "EBADCSRFTOKEN") {
        res
          .status(403)
          .json({ code: "EBADCSRFTOKEN", message: "Invalid CSRF token" });
        return;
      }
      if (err.status === 413) {
        res.status(413).json({ message: "Request too large" });
        return;
      }
      if (err.type === "entity.parse.failed") {
        res.status(400).json({ message: "Invalid JSON" });
        return;
      }
      if (
        err.code?.startsWith("LIMIT_") ||
        err.message === "Unsupported image type"
      ) {
        res
          .status(400)
          .json({
            message:
              "Upload must be one JPEG, PNG or WebP image within the upload limits",
          });
        return;
      }
      console.error(JSON.stringify({ event: "request_failed" }));
      res
        .status(503)
        .json({ message: "Service unavailable. Please try again." });
    },
  );
  return app;
}
