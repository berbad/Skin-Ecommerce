import express from "express";
import multer from "multer";
import ProductController from "../controllers/product.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdminMiddleware } from "../middleware/isAdmin.middleware";
import { storage } from "../config/cloudinary";
import { authenticatedRateLimit } from "../security/authenticated-rate-limit";

const router = express.Router();
const uploadRateLimit = authenticatedRateLimit("product-upload", 20);

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 10,
    parts: 11,
    fieldSize: 16 * 1024,
    fieldNameSize: 100,
  },
  fileFilter: (req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype))
      return callback(new Error("Unsupported image type"));
    callback(null, true);
  },
});

router.get("/", ProductController.getAllProducts);
router.get("/:id", ProductController.getProductById);

router.post(
  "/",
  authMiddleware,
  isAdminMiddleware,
  uploadRateLimit,
  upload.single("image"),
  ProductController.createProduct,
);
router.put(
  "/:id",
  authMiddleware,
  isAdminMiddleware,
  uploadRateLimit,
  upload.single("image"),
  ProductController.updateProduct,
);
router.patch(
  "/rearrange",
  authMiddleware,
  isAdminMiddleware,
  ProductController.rearrangeProducts,
);
router.delete(
  "/:id",
  authMiddleware,
  isAdminMiddleware,
  ProductController.deleteProduct,
);

export default router;
