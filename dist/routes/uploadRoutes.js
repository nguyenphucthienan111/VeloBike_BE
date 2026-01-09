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
//# sourceMappingURL=uploadRoutes.js.map