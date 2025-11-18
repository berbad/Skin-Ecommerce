import { Request, Response } from "express";
import Product from "../models/product.model";

class ProductController {
  static async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      const products = await Product.find({}).sort({ order: 1 });
      res.json({ products });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }

  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }
      res.json({ product });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }

  static async createProduct(
    req: Request & { file?: Express.Multer.File },
    res: Response
  ): Promise<void> {
    console.log("createProduct body:", req.body);
    console.log("createProduct file:", req.file);

    try {
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
      } = req.body;

      let imagePath = "";
      if (req.file) {
        imagePath = "/images/" + req.file.filename;
      }

      const newProduct = new Product({
        name,
        description,
        price: Number(price),
        category,
        stock: Number(stock),
        featured: featured === "true" || featured === true,
        ingredients,
        benefits,
        howToUse,
        image: imagePath,
      });

      await newProduct.save();
      res.status(201).json({ product: newProduct });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }

  static async updateProduct(
    req: Request & { file?: Express.Multer.File },
    res: Response
  ): Promise<void> {
    try {
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
      } = req.body;

      const product = await Product.findById(req.params.id);
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      product.name = name;
      product.description = description;
      product.price = Number(price);
      product.category = category;
      product.stock = Number(stock);
      product.featured = featured === "true" || featured === true;
      product.ingredients = ingredients;
      product.benefits = benefits;
      product.howToUse = howToUse;

      if (req.file) {
        product.image = "/images/" + req.file.filename;
      }

      await product.save();
      res.json({ product });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }

  static async rearrangeProducts(req: Request, res: Response): Promise<void> {
    try {
      const { productIds } = req.body;
      if (!Array.isArray(productIds)) {
        res.status(400).json({ message: "Invalid productIds array" });
        return;
      }

      for (let i = 0; i < productIds.length; i++) {
        await Product.findByIdAndUpdate(productIds[i], { order: i });
      }

      res.json({ message: "Products reordered" });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }

  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      await Product.findByIdAndDelete(req.params.id);
      res.json({ message: "Product deleted" });
    } catch (error) {
      console.error("Internal error:", error);
      res.status(500).json({ success: false, message: "Something went wrong" });
    }
  }
}

export default ProductController;
