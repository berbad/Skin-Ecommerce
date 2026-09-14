import { createHmac, randomBytes } from "crypto";
import { doubleCsrf } from "csrf-csrf";
import { Request, Response, NextFunction } from "express";

const cookieOptions = { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" };
const sessionCookie = "__Host-csrf-session";
export const isStripeWebhook = (req: Request) => /^\/api\/stripe\/webhook\/?$/.test(req.path);

// An anonymous browser identity binds pre-login tokens; after login the JWT
// binds them instead. Host cookies cannot be injected by sibling subdomains.
export function csrfSession(req: Request, res: Response, next: NextFunction) {
  if (!isStripeWebhook(req) && typeof req.cookies?.token !== "string" &&
      (typeof req.cookies?.[sessionCookie] !== "string" || !/^[a-f0-9]{64}$/.test(req.cookies[sessionCookie]))) {
    const sessionId = randomBytes(32).toString("hex");
    req.cookies[sessionCookie] = sessionId;
    res.cookie("__Host-csrf-session", sessionId, cookieOptions);
  }
  next();
}
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
    return createHmac("sha256", process.env.JWT_SECRET).update("skin-ecommerce/csrf/v1").digest("hex");
  },
  getSessionIdentifier: req => typeof req.cookies?.token === "string" ? req.cookies.token : req.cookies?.[sessionCookie] || "",
  cookieName: "__Host-csrf-token",
  cookieOptions,
  getCsrfTokenFromRequest: req => req.get("x-csrf-token"),
  skipCsrfProtection: isStripeWebhook,
});
export { generateCsrfToken, doubleCsrfProtection };
