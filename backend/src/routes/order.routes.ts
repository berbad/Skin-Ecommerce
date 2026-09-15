import express, { Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdminMiddleware } from "../middleware/isAdmin.middleware";
import Order from "../models/Order";
import { Checkout, PaymentEvent, Notification } from "../models/payment.models";
const router = express.Router();
interface AuthedRequest extends Request {
  user?: { id: string; email: string };
}

router.get("/", authMiddleware, async (req: AuthedRequest, res: Response) => {
  const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    res.status(400).json({ message: "Invalid page limit" });
    return;
  }
  const query: any = { userId: req.user!.id };
  if (req.query.cursor !== undefined) {
    try {
      if (typeof req.query.cursor !== "string" || req.query.cursor.length > 512)
        throw new Error();
      const [date, id] = JSON.parse(
        Buffer.from(req.query.cursor, "base64url").toString("utf8"),
      );
      if (
        typeof date !== "string" ||
        new Date(date).toISOString() !== date ||
        typeof id !== "string" ||
        !id ||
        id.length > 255
      )
        throw new Error();
      query.$or = [
        { createdAt: { $lt: new Date(date) } },
        { createdAt: new Date(date), _id: { $lt: id } },
      ];
    } catch {
      res.status(400).json({ message: "Invalid page cursor" });
      return;
    }
  }
  try {
    const orders = await Order.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit);
    const last = orders[orders.length - 1];
    const nextCursor =
      orders.length === limit
        ? Buffer.from(
            JSON.stringify([last.createdAt.toISOString(), last._id]),
          ).toString("base64url")
        : null;
    res
      .set("Cache-Control", "no-store")
      .json({ success: true, orders, nextCursor });
  } catch {
    res.status(500).json({ message: "Could not retrieve orders" });
  }
});

// Admin-only, bounded queue visibility. No customer addresses or mail payloads.
router.get(
  "/reconciliation",
  authMiddleware,
  isAdminMiddleware,
  async (_req, res) => {
    try {
      const [checkouts, events, notificationBacklog] = await Promise.all([
        Checkout.find({
          $or: [
            { state: "manual" },
            {
              state: { $in: ["open", "reserved"] },
              expiresAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          ],
        })
          .select("_id sessionId state reason expiresAt")
          .sort({ createdAt: 1 })
          .limit(100),
        PaymentEvent.find({ state: "manual" })
          .select(
            "_id sessionId checkoutId reason amountTotal currency createdAt",
          )
          .sort({ createdAt: 1 })
          .limit(100),
        Notification.countDocuments({ state: { $ne: "sent" } }),
      ]);
      res
        .set("Cache-Control", "no-store")
        .json({ checkouts, events, notificationBacklog });
    } catch {
      res
        .status(500)
        .json({ message: "Could not retrieve reconciliation queue" });
    }
  },
);
router.get(
  "/:id",
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    try {
      const order = await Order.findOne({
        _id: { $eq: String(req.params.id) },
        userId: req.user!.id,
      });
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }
      res.set("Cache-Control", "no-store").json({ success: true, order });
    } catch {
      res.status(500).json({ message: "Could not retrieve order" });
    }
  },
);
router.post("/", authMiddleware, (_req, res) => {
  res
    .status(409)
    .json({ message: "Create orders through verified Stripe checkout" });
});
const transitions: Record<string, string[]> = {
  pending: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
router.patch(
  "/:id/status",
  authMiddleware,
  isAdminMiddleware,
  async (req: AuthedRequest, res: Response) => {
    const target = req.body?.fulfillmentStatus ?? req.body?.status;
    if (
      typeof target !== "string" ||
      !Object.prototype.hasOwnProperty.call(transitions, target)
    ) {
      res.status(400).json({ message: "Invalid fulfillment status" });
      return;
    }
    try {
      const order = await Order.findById(String(req.params.id));
      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }
      const current = order.fulfillmentStatus || "pending";
      if (
        (["processing", "shipped", "delivered"].includes(target) &&
          order.paymentStatus !== "paid") ||
        (current !== target && !transitions[current]?.includes(target))
      ) {
        res
          .status(409)
          .json({
            message: "Invalid fulfillment transition or payment is unverified",
          });
        return;
      }
      if (current === target) {
        res.json({ success: true, order });
        return;
      }
      const query: any = {
        _id: order._id,
        $or: [
          { fulfillmentStatus: current },
          ...(current === "pending"
            ? [{ fulfillmentStatus: { $exists: false } }]
            : []),
        ],
      };
      if (["processing", "shipped", "delivered"].includes(target))
        query.paymentStatus = "paid";
      const updated = await Order.findOneAndUpdate(
        query,
        {
          $set: {
            fulfillmentStatus: target,
            ...(["pending", "processing"].includes(target)
              ? { status: target }
              : {}),
          },
          $push: { statusHistory: { status: target, timestamp: new Date() } },
        },
        { new: true },
      );
      if (!updated) {
        res
          .status(409)
          .json({ message: "Order changed; reload before retrying" });
        return;
      }
      res.json({ success: true, order: updated });
    } catch {
      res.status(500).json({ message: "Could not update order" });
    }
  },
);
export default router;
