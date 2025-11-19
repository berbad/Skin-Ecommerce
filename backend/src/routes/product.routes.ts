import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import ProductController from "../controllers/product.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdminMiddleware } from "../middleware/isAdmin.middleware";

const router = express.Router();

const imageDir = path.join(__dirname, "../../public/images");
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
  console.log("✅ Created images directory:", imageDir);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, imageDir);
  },
  filename: (_req, file, cb) => {
    const originalName = file.originalname || "image.jpg";
    let ext = path.extname(originalName);

    if (!ext || ext === "") {
      ext = ".jpg";
    }

    const baseName = path.basename(originalName, ext).replace(/\s/g, "");
    const uniqueName = `${Date.now()}-${baseName}${ext}`;
    // logging
    console.log("📸 Saving image as:", uniqueName);
    cb(null, uniqueName);
  },
});
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
