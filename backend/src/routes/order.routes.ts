import express, { Request, Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import Order from "../models/Order";
import Product from "../models/product.model";

const router = express.Router();

interface AuthedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

router.get("/", authMiddleware, async (req: AuthedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      orders,
    });
  } catch (error) {
    console.error("Internal error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

// Get a single order by ID
router.get(
  "/:id",
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
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
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

// Create a new order and update product stock
router.post("/", authMiddleware, async (req: AuthedRequest, res: Response) => {
  try {
    const { items } = req.body;

    const total = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    // Update product stock
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.stock -= item.quantity;
        if (product.stock < 0) product.stock = 0;
        await product.save();
      }
    }

    const newOrder = await Order.create({
      userId: req.user?.id,
      items,
      total,
      status: "processing",
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Internal error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

// Update an order's status
router.patch(
  "/:id/status",
  authMiddleware,
  async (req: AuthedRequest, res: Response) => {
    try {
      const orderId = req.params.id;
      const { status } = req.body;

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
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

export default router;
