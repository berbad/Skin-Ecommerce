import { v2 as cloudinary } from "cloudinary";
import { StorageEngine } from "multer";
import { pipeline } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use the maintained SDK directly; the old Multer adapter pins Cloudinary 1.x.
export const storage: StorageEngine = {
  _handleFile(req, file, callback) {
    let settled = false;
    const finish: typeof callback = (error, info) => {
      if (settled) return;
      settled = true;
      callback(error, info);
    };
    const upload = cloudinary.uploader.upload_stream({
      folder: "eternalbotanic",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 1000, height: 1000, crop: "limit" }],
    }, (error, result) => {
      if (error || !result) return finish(error || new Error("Image upload failed"));
      finish(null, { path: result.secure_url, filename: result.public_id, size: result.bytes });
    });
    pipeline(file.stream, upload, error => { if (error) finish(error); });
  },
  _removeFile(req, file, callback) {
    cloudinary.uploader.destroy(file.filename, { resource_type: "image" })
      .then(() => callback(null)).catch(callback);
  },
};
export default cloudinary;
