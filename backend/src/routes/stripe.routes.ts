import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import Stripe from "stripe";
import { authMiddleware } from "../middleware/auth.middleware";
import Order from "../models/Order";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

interface AuthedRequest extends Request {
  user?: { id?: string; email?: string };
}

router.post(
  "/create-checkout-session",
  authMiddleware,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const { items } = req.body;

      const line_items = (items || []).map((item: any) => ({
        price_data: {
          currency: "usd",
          product_data: { name: String(item.name) },
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: Number(item.quantity) || 1,
      }));

      const total = (items || []).reduce(
        (acc: number, it: any) =>
          acc + Number(it.price) * Number(it.quantity || 1),
        0
      );

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items,
        customer_email: req.user?.email,
        shipping_address_collection: {
          allowed_countries: ["US"],
        },
        shipping_options: [
          {
            shipping_rate: "shr_1SUdndPX0hvOLt0hhov3Mi1X",
          },
        ],

        metadata: {
          userId: req.user?.id || "guest",
          items: JSON.stringify(items || []),
          total: total.toFixed(2),
        },
        success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/cart?canceled=true`,
      });

      if (!session.url) {
        res
          .status(500)
          .json({ success: false, message: "No session url from Stripe" });
        return;
      }

      res.status(200).json({ url: session.url });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

router.get(
  "/session/:sessionId",
  authMiddleware,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        req.params.sessionId,
        {
          expand: ["line_items"],
        }
      );

      const metaItems = session.metadata?.items
        ? JSON.parse(session.metadata.items)
        : [];
      const userId = session.metadata?.userId || req.user?.id || "guest";
      const total = parseFloat(session.metadata?.total || "0");

      const existing = await Order.findById(session.id);
      if (!existing && Array.isArray(metaItems) && metaItems.length) {
        await Order.create({
          _id: session.id,
          userId,
          items: metaItems.map((i: any) => ({
            productId: String(i.id || i.productId || "unknown"),
            name: String(i.name),
            quantity: Number(i.quantity) || 1,
            price: Number(i.price),
          })),
          total,
          status: "paid",
        });
        console.log("✅ Order saved:", session.id);
      }

      res.status(200).json({ session });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

export default router;
