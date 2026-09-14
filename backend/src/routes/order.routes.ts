import express, { Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import Order from "../models/Order";
import { isAdminMiddleware } from "../middleware/isAdmin.middleware";

const router = express.Router();

interface AuthedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

router.get(
  "/",
  authMiddleware,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const orders = await Order.find({ userId }).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        message: "Orders retrieved successfully",
        orders,
      });
    } catch (error) {
      console.error("Internal error:");
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

// Get a single order by ID
router.get(
  "/:id",
  authMiddleware,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const orderId = req.params.id;
      const order = await Order.findById(orderId);

      if (!order || order.userId !== req.user?.id) {
        res.status(404).json({ success: false, message: "Order not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Order retrieved successfully",
        order,
      });
    } catch (error) {
      console.error("Internal error:");
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

// The storefront creates orders through Stripe checkout. Direct submissions
// cannot prove payment and previously decremented stock before failing to save.
router.post("/", authMiddleware, (req, res) => {
  res.status(409).json({ message: "Create orders through verified Stripe checkout" });
});

// Update an order's status
router.patch(
  "/:id/status",
  authMiddleware,
  isAdminMiddleware,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const orderId = req.params.id;
      const { status } = req.body || {};
      if (!["paid", "processing", "pending", "failed"].includes(status)) { res.status(400).json({message: "Invalid order status"}); return; }

      const order = await Order.findById(orderId);
      if (!order) {
        res.status(404).json({ success: false, message: "Order not found" });
        return;
      }

      order.status = status;
      await order.save();

      res.status(200).json({
        success: true,
        message: "Order status updated successfully",
        order,
      });
    } catch (error) {
      console.error("Internal error:");
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

export default router;
