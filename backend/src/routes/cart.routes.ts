import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import User from "../models/user.model";
import Product from "../models/product.model";
import { objectIdSchema, quantitySchema } from "../security/validation";
const router = express.Router();
router.use(authMiddleware);
const itemSchema = z
  .object({ productId: objectIdSchema, quantity: quantitySchema })
  .strict();
router.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await User.findById(req.user!.id).select("cart");
    res.json({ success: true, cart: user?.cart || [] });
  } catch (err) {
    next(err);
  }
});
async function change(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction,
  operation: "add" | "set" | "remove" | "clear",
) {
  try {
    let id = "",
      quantity = 0;
    if (operation === "add") {
      const value = itemSchema.safeParse(req.body);
      if (!value.success) {
        res.status(400).json({ message: "Invalid cart item" });
        return;
      }
      id = value.data.productId;
      quantity = value.data.quantity;
    } else if (operation !== "clear") {
      const value = objectIdSchema.safeParse(req.params.productId);
      if (!value.success) {
        res.status(400).json({ message: "Invalid product" });
        return;
      }
      id = value.data;
      if (operation === "set") {
        const value = z
          .object({ quantity: quantitySchema })
          .strict()
          .safeParse(req.body);
        if (!value.success) {
          res.status(400).json({ message: "Invalid quantity" });
          return;
        }
        quantity = value.data.quantity;
      }
    }
    let cart: unknown = [];
    await mongoose.connection.transaction(async (session) => {
      const user = await User.findById(req.user!.id).session(session);
      if (!user) throw new Error("Account unavailable");
      if (operation === "clear") user.cart = [];
      else if (operation === "remove")
        user.cart = user.cart.filter((i) => i.productId !== id);
      else {
        if (!(await Product.exists({ _id: id }).session(session)))
          throw Object.assign(new Error("Product unavailable"), {
            status: 400,
          });
        const item = user.cart.find((i) => i.productId === id);
        const updated =
          operation === "add" ? (item?.quantity || 0) + quantity : quantity;
        if (
          !Number.isSafeInteger(updated) ||
          updated > 1000 ||
          (!item && user.cart.length >= 100)
        )
          throw Object.assign(new Error("Cart limit exceeded"), {
            status: 400,
          });
        if (item) item.quantity = updated;
        else user.cart.push({ productId: id, quantity: updated });
      }
      await user.save({ session });
      cart = user.cart;
    });
    res.json({ success: true, cart });
  } catch (err) {
    if ((err as { status?: number }).status === 400) {
      res.status(400).json({ message: (err as Error).message });
      return;
    }
    next(err);
  }
}
router.post("/items", (req, res, next) => change(req, res, next, "add"));
router.put("/items/:productId", (req, res, next) =>
  change(req, res, next, "set"),
);
router.delete("/items/:productId", (req, res, next) =>
  change(req, res, next, "remove"),
);
router.delete("/", (req, res, next) => change(req, res, next, "clear"));
export default router;
