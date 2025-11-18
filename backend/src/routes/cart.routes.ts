import express from "express";
import { Response } from "express";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import User from "../models/user.model";

const router = express.Router();

// Get user's cart
router.get(
  "/",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        return void res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const user = await User.findById(req.user.id).select("cart");
      if (!user) {
        return void res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      return void res.status(200).json({
        success: true,
        cart: user.cart,
      });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

// Add item to cart
router.post(
  "/items",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        return void res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }
      const { productId, quantity } = req.body;
      if (!productId || !quantity) {
        return void res
          .status(400)
          .json({ success: false, message: "Missing productId or quantity" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return void res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const existingItemIndex = user.cart.findIndex(
        (item) => item.productId === productId
      );
      if (existingItemIndex >= 0) {
        user.cart[existingItemIndex].quantity += quantity;
      } else {
        user.cart.push({ productId, quantity });
      }

      await user.save();

      return void res.status(200).json({ success: true, cart: user.cart });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

// Update cart item quantity
router.put(
  "/items/:productId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        return void res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { productId } = req.params;
      const { quantity } = req.body;

      if (!quantity) {
        return void res
          .status(400)
          .json({ success: false, message: "Missing quantity" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return void res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const item = user.cart.find((item) => item.productId === productId);
      if (!item) {
        return void res
          .status(404)
          .json({ success: false, message: "Product not in cart" });
      }

      item.quantity = quantity;
      await user.save();

      return void res.status(200).json({ success: true, cart: user.cart });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

// Remove item from cart
router.delete(
  "/items/:productId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        return void res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { productId } = req.params;
      const user = await User.findById(req.user.id);
      if (!user) {
        return void res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      user.cart = user.cart.filter((item) => item.productId !== productId);
      await user.save();

      return void res.status(200).json({ success: true, cart: user.cart });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

// Clear cart
router.delete(
  "/",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        return void res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return void res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      user.cart = [];
      await user.save();

      return void res.status(200).json({ success: true, cart: user.cart });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
);

export default router;
