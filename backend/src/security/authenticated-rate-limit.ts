import type { RequestHandler } from "express";
import rateLimit, { Store } from "express-rate-limit";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { MongoRateStore } from "./rate-store";

// Account identity is set by authMiddleware. New sessions and forwarded IPs
// must not reset quotas for expensive authenticated operations.
export function authenticatedRateLimit(
  namespace: string,
  limit: number,
  store?: Store,
): RequestHandler {
  const windowMs = 15 * 60 * 1000;
  const limiter = rateLimit({
    windowMs,
    limit,
    store:
      store ??
      (process.env.NODE_ENV === "test"
        ? undefined
        : new MongoRateStore(`account:${namespace}`, windowMs)),
    keyGenerator: (req: AuthenticatedRequest) => req.user!.id,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    passOnStoreError: false,
    message: { message: "Too many requests. Please wait and try again." },
  });
  return (req: AuthenticatedRequest, res, next) => {
    if (typeof req.user?.id !== "string" || !req.user.id) {
      res.status(401).json({ message: "Please sign in again" });
      return;
    }
    return limiter(req, res, next);
  };
}
