import { Router } from "express";
import multer from "multer";
import { UploadController } from "../controllers/UploadController";
import { protect } from "../middleware/authMiddleware";

// Configure local storage temporary (or memory storage)
const upload = multer({ dest: "uploads/" });

export const uploadRoutes = Router();

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload an image (Returns URL)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 */
uploadRoutes.post(
  "/",
  protect as any, // Any logged in user (Seller/Inspector) can upload
  upload.single("image") as any,
  UploadController.uploadImage as any
);
