import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(Object.assign(new Error("Only image files are allowed"), { status: 400 }));
  },
});

router.post("/", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "safesight", format: "jpg" },
      (error, r) => (error ? reject(error) : resolve(r))
    );
    stream.end(req.file.buffer);
  });

  res.json({ url: result.secure_url });
});

export default router;
