"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRoutes = void 0;
const express_1 = require("express");
const ReviewController_1 = require("../controllers/ReviewController");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.reviewRoutes = (0, express_1.Router)();
/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a review after order completion
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - rating
 *               - comment
 *             properties:
 *               orderId:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review created successfully
 */
exports.reviewRoutes.post("/", authMiddleware_1.protect, ReviewController_1.ReviewController.createReview);
/**
 * @swagger
 * /api/reviews/{userId}:
 *   get:
 *     summary: Get reviews for a user
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Reviews list
 */
exports.reviewRoutes.get("/:userId", ReviewController_1.ReviewController.getUserReviews);
//# sourceMappingURL=reviewRoutes.js.map