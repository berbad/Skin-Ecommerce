import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdminMiddleware } from "../middleware/isAdmin.middleware";
import Order from "../models/Order";

const router = express.Router();

// Get all orders (admin only)
router.get("/orders", authMiddleware, isAdminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 }).limit(100);

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Internal error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
});

export default router;
