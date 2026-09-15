import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app";
import Session from "./models/Session";
import AccountToken from "./models/AccountToken";
import User from "./models/user.model";
import { RateBucket } from "./security/rate-store";
import {
  initializePaymentStorage,
  startPaymentWorkers,
} from "./services/payments";
async function start() {
  for (const name of [
    "MONGODB_URI",
    "JWT_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_SHIPPING_RATE_ID",
    "CLIENT_URL",
    "ADMIN_EMAIL",
    "SENDGRID_API_KEY",
  ]) {
    if (!process.env[name]) throw new Error("Required configuration missing");
  }
  if (process.env.NODE_ENV === "production") {
    const key = process.env.MFA_ENCRYPTION_KEY || "";
    if (
      !process.env.TRUST_PROXY ||
      ["true", "1", "2"].includes(process.env.TRUST_PROXY) ||
      Buffer.from(key, "base64").length !== 32 ||
      key !== Buffer.from(key, "base64").toString("base64") ||
      process.env.JWT_SECRET!.length < 32
    )
      throw new Error("Invalid production security configuration");
    if (
      ![
        "https://eternalbotanic.com",
        "https://www.eternalbotanic.com",
      ].includes(process.env.CLIENT_URL!)
    )
      throw new Error("Invalid production frontend origin");
  }
  await mongoose.connect(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 10000,
  });
  await Promise.all([
    User.createIndexes(),
    Session.createIndexes(),
    AccountToken.createIndexes(),
    RateBucket.createIndexes(),
  ]);
  await initializePaymentStorage();
  const stopWorkers = startPaymentWorkers();
  const server = createApp().listen(Number(process.env.PORT) || 5000, () =>
    console.info("API ready"),
  );
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  const shutdown = () => {
    stopWorkers();
    server.close(() => {
      void mongoose.disconnect();
    });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
start().catch(() => {
  console.error(
    "Startup failed: verify security configuration, database and indexes",
  );
  process.exitCode = 1;
  void mongoose.disconnect();
});
