import express, { Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  createCheckout,
  readSession,
  PaymentError,
} from "../services/payments";
import { authenticatedRateLimit } from "../security/authenticated-rate-limit";
const router = express.Router();
interface AuthedRequest extends Request {
  user?: { id: string; email: string };
}
function checkoutError(error: unknown, res: Response) {
  if (error instanceof PaymentError)
    res
      .status(error.status)
      .json({
        message: error.message,
        ...(error.code ? { code: error.code } : {}),
      });
  else {
    console.error("Payment request failed");
    res
      .status(503)
      .json({
        message:
          "Payment service unavailable; retry with the same checkout key",
      });
  }
}
router.post(
  "/create-checkout-session",
  authMiddleware,
  authenticatedRateLimit("checkout", 10),
  async (req: AuthedRequest, res: Response) => {
    try {
      const checkout = await createCheckout(
        req.user!,
        req.body?.items,
        req.headers["idempotency-key"],
      );
      if (checkout.state === "fulfilled") {
        if (!checkout.sessionId)
          throw new PaymentError(
            "This checkout needs reconciliation. Contact support.",
            409,
            "CHECKOUT_RECONCILIATION_REQUIRED",
          );
        res
          .set("Cache-Control", "no-store")
          .json({
            url: `/success?session_id=${encodeURIComponent(checkout.sessionId)}`,
            checkoutId: checkout._id,
            checkoutStatus: "fulfilled",
          });
        return;
      }
      if (!checkout.sessionUrl)
        throw new PaymentError("Checkout is being processed", 409);
      res
        .set("Cache-Control", "no-store")
        .json({ url: checkout.sessionUrl, checkoutId: checkout._id });
    } catch (error) {
      checkoutError(error, res);
    }
  },
);
router.get(
  "/session/:sessionId",
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    try {
      res
        .set("Cache-Control", "no-store")
        .json(await readSession(req.user!.id, String(req.params.sessionId)));
    } catch (error) {
      checkoutError(error, res);
    }
  },
);
export default router;
