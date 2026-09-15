import express from "express";
import Stripe from "stripe";
import { fulfillSession, paymentProvider } from "../../services/payments";
const router = express.Router();
router.post(
  "/",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") {
      res.status(400).send("Missing stripe-signature header");
      return;
    }
    let event: Stripe.Event;
    try {
      event = paymentProvider().webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string,
      );
    } catch {
      res.status(400).type("text/plain").send("Invalid webhook signature");
      return;
    }
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      try {
        await fulfillSession(
          event.data.object as Stripe.Checkout.Session,
          event.id,
        );
      } catch {
        console.error("Payment fulfillment failed; event will retry");
        res.status(500).json({ received: false });
        return;
      }
    }
    // Expiry and async failure are handled by provider-verified reconciliation.
    res.status(200).json({ received: true });
  },
);
export default router;
