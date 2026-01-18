"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const UploadController_1 = require("../controllers/UploadController");
const authMiddleware_1 = require("../middleware/authMiddleware");
// Configure local storage temporary (or memory storage)
const upload = (0, multer_1.default)({ dest: "uploads/" });
exports.uploadRoutes = (0, express_1.Router)();
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
exports.uploadRoutes.get("/my-images", authMiddleware_1.protect, UploadController_1.UploadController.getMyImages);
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
exports.uploadRoutes.post("/", authMiddleware_1.protect, // Any logged in user (Seller/Inspector) can upload
upload.single("image"), UploadController_1.UploadController.uploadImage);
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
exports.uploadRoutes.post("/360", authMiddleware_1.protect, upload.array("images", 72), // Allow up to 72 frames
UploadController_1.UploadController.upload360);
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
exports.uploadRoutes.delete("/:publicId", authMiddleware_1.protect, UploadController_1.UploadController.deleteImage);
//# sourceMappingURL=uploadRoutes.js.map