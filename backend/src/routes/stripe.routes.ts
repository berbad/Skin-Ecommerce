import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import Stripe from "stripe";
import { authMiddleware } from "../middleware/auth.middleware";
import Order from "../models/Order";
import Product from "../models/product.model";

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
      const submitted = req.body?.items;
      if (!Array.isArray(submitted) || submitted.length === 0 || submitted.length > 100) {
        res.status(400).json({ message: "Invalid cart" }); return;
      }
      const items = [];
      const seen = new Set<string>();
      for (const item of submitted) {
        const id = item?.id ?? item?.productId;
        if (typeof id !== "string" || !/^[a-fA-F0-9]{24}$/.test(id) || seen.has(id) ||
            !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 1000) {
          res.status(400).json({ message: "Invalid cart item" }); return;
        }
        seen.add(id);
        const product = await Product.findById(id);
        if (!product || !Number.isFinite(product.price) || product.price < 0 || product.stock < item.quantity) {
          res.status(400).json({ message: "Product unavailable" }); return;
        }
        items.push({ id, productId: id, name: product.name, price: product.price, quantity: item.quantity });
      }
      const line_items = items.map(item => ({
        price_data: { currency: "usd", product_data: { name: item.name }, unit_amount: Math.round(item.price * 100) },
        quantity: item.quantity,
      }));
      const total = items.reduce((acc, item) => acc + Math.round(item.price * 100) * item.quantity, 0) / 100;

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
      console.error("Internal error:");
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
        String(req.params.sessionId),
        {
          expand: ["line_items"],
        }
      );

      if (session.metadata?.userId !== req.user?.id) {
        res.status(404).json({ message: "Session not found" }); return;
      }
      // Only Stripe-confirmed payments can be recorded as paid.
      if (session.payment_status !== "paid") { res.status(200).json({ session }); return; }

      const metaItems = session.metadata?.items
        ? JSON.parse(session.metadata.items)
        : [];
      const userId = session.metadata?.userId || req.user?.id || "guest";
      const total = (session.amount_total || 0) / 100;

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
      console.error("Internal error:");
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

export default router;
