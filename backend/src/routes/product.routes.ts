import express from "express";
import multer from "multer";
import ProductController from "../controllers/product.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdminMiddleware } from "../middleware/isAdmin.middleware";
import { storage } from "../config/cloudinary";

const router = express.Router();

const upload = multer({ storage });

router.get("/", ProductController.getAllProducts);
router.get("/:id", ProductController.getProductById);

router.post(
  "/",
  authMiddleware,
  isAdminMiddleware,
  upload.single("image"),
  ProductController.createProduct
);
router.put(
  "/:id",
  authMiddleware,
  isAdminMiddleware,
  upload.single("image"),
  ProductController.updateProduct
);
router.patch(
  "/rearrange",
  authMiddleware,
  isAdminMiddleware,
  ProductController.rearrangeProducts
);
router.delete(
  "/:id",
  authMiddleware,
  isAdminMiddleware,
  ProductController.deleteProduct
);

export default router;
