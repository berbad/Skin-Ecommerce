import { Request, Response } from "express";
import Product from "../models/product.model";
import mongoose from "mongoose";
import { Checkout } from "../models/payment.models";
import {
  productSchema,
  productUpdateSchema,
  objectIdSchema,
} from "../security/validation";

class ProductController {
  static async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      const rawLimit =
        req.query.limit === undefined ? 100 : Number(req.query.limit);
      const page = req.query.page === undefined ? 1 : Number(req.query.page);
      if (
        !Number.isInteger(rawLimit) ||
        rawLimit < 1 ||
        rawLimit > 100 ||
        !Number.isInteger(page) ||
        page < 1 ||
        page > 1000
      ) {
        res.status(400).json({ message: "Invalid pagination" });
        return;
      }
      const products = await Product.find({})
        .sort({ order: 1, _id: 1 })
        .skip((page - 1) * rawLimit)
        .limit(rawLimit);
      res.json({ products });
    } catch (error) {
      console.error("Internal error:");
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }

  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const id = objectIdSchema.safeParse(req.params.id);
      if (!id.success) {
        res.status(400).json({ message: "Invalid product ID" });
        return;
      }
      const product = await Product.findById(id.data);
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }
      res.json({ product });
    } catch (error) {
      console.error("Internal error:");
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }

  static async createProduct(
    req: Request & { file?: Express.Multer.File },
    res: Response,
  ): Promise<void> {
    try {
      const parsed = productSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid product details" });
        return;
      }
      const {
        name,
        description,
        price,
        category,
        stock,
        featured,
        ingredients,
        benefits,
        howToUse,
      } = parsed.data;

      let imagePath = "";
      if (req.file) {
        imagePath = (req.file as any).path || "";
        console.log("📸 Cloudinary URL:", imagePath);
      }

      if (!req.file) {
        res.status(400).json({ message: "A product image is required" });
        return;
      }
      const newProduct = new Product({
        name,
        description,
        price: Number(price),
        category,
        stock: Number(stock),
        featured: featured,
        ingredients,
        benefits,
        howToUse,
        image: imagePath,
      });

      await newProduct.save();
      res.status(201).json({ product: newProduct });
    } catch (error) {
      console.error("Internal error:");
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }

  static async updateProduct(
    req: Request & { file?: Express.Multer.File },
    res: Response,
  ): Promise<void> {
    try {
      const parsed = productUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid product details" });
        return;
      }
      const id = objectIdSchema.safeParse(req.params.id);
      if (!id.success) {
        res.status(400).json({ message: "Invalid product ID" });
        return;
      }
      const { expectedStock, ...details } = parsed.data;
      // Checkout and release use atomic $inc without changing __v. Match the
      // original stock itself so a stale editor cannot put reserved units back.
      const product = await Product.findOneAndUpdate(
        { _id: id.data, stock: expectedStock },
        {
          $set: {
            ...details,
            ...(req.file ? { image: (req.file as any).path || "" } : {}),
          },
        },
        { new: true, runValidators: true },
      );
      if (!product) {
        if (!(await Product.exists({ _id: id.data }))) {
          res.status(404).json({ message: "Product not found" });
          return;
        }
        res
          .status(409)
          .json({
            message:
              "Inventory changed while you were editing. Close and reopen the editor to reload stock before saving.",
          });
        return;
      }
      res.json({ product });
    } catch (error) {
      console.error("Internal error:");
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }

  static async rearrangeProducts(req: Request, res: Response): Promise<void> {
    try {
      const { productIds } = req.body;
      if (
        !Array.isArray(productIds) ||
        productIds.length > 1000 ||
        !productIds.every(
          (id: unknown) =>
            typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id),
        )
      ) {
        res.status(400).json({ message: "Invalid productIds array" });
        return;
      }

      for (let i = 0; i < productIds.length; i++) {
        await Product.findByIdAndUpdate(String(productIds[i]), { order: i });
      }

      res.json({ message: "Products reordered" });
    } catch (error) {
      console.error("Internal error:");
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }

  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const id = objectIdSchema.safeParse(req.params.id);
      if (!id.success) {
        res.status(400).json({ message: "Invalid product ID" });
        return;
      }
      await mongoose.connection.transaction(async (session) => {
        // Acquire a product write conflict with concurrent checkout reservation
        // before checking its references. A rejected deletion rolls back fully.
        await Product.deleteOne({ _id: id.data }, { session });
        if (
          await Checkout.exists({
            "items.productId": id.data,
            state: { $in: ["reserved", "open", "manual"] },
          }).session(session)
        ) {
          throw Object.assign(new Error("Reserved product"), {
            code: "INVENTORY_RESERVED",
          });
        }
      });
      res.json({ message: "Product deleted" });
    } catch (error) {
      if ((error as { code?: string }).code === "INVENTORY_RESERVED") {
        res
          .status(409)
          .json({
            message:
              "This product has active checkout reservations. Complete or reconcile them before deleting it.",
          });
        return;
      }
      console.error("Internal error:");
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
}

export default ProductController;
