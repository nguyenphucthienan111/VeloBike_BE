import { Router } from "express";
import multer from "multer";
import { UploadController } from "../controllers/UploadController";
import { protect } from "../middleware/authMiddleware";

// Configure local storage temporary (or memory storage)
const upload = multer({ dest: "uploads/" });

export const uploadRoutes = Router();

/**
 * @swagger
 * /api/upload/my-images:
 *   get:
 *     summary: Get list of uploaded images from Cloudinary
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *           enum: [velobike_listings, velobike_360, velobike_kyc]
 *           default: velobike_listings
 *         description: Folder to list images from
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *         description: Max number of images to return
 *     responses:
 *       200:
 *         description: List of images
 */
uploadRoutes.get("/my-images", protect as any, UploadController.getMyImages as any);

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

/**
 * @swagger
 * /api/upload/360:
 *   post:
 *     summary: Upload 36 images for 360 view
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images uploaded, returns array of URLs
 */
uploadRoutes.post(
  "/360",
  protect as any,
  upload.array("images", 72) as any, // Allow up to 72 frames
  UploadController.upload360 as any
);

/**
 * @swagger
 * /api/upload/{publicId}:
 *   delete:
 *     summary: Delete an uploaded image
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: publicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Public ID of the image (URL encoded, e.g., velobike_listings%2Fabc123)
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       404:
 *         description: Image not found
 */
uploadRoutes.delete("/:publicId", protect as any, UploadController.deleteImage as any);
