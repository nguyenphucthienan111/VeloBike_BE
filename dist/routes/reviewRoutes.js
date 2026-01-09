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
 *               - type
 *             properties:
 *               orderId:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *               categories:
 *                 type: object
 *                 properties:
 *                   itemAccuracy:
 *                     type: number
 *                   communication:
 *                     type: number
 *                   shipping:
 *                     type: number
 *                   packaging:
 *                     type: number
 *               type:
 *                 type: string
 *                 enum: [SELLER, BUYER]
 *     responses:
 *       201:
 *         description: Review created successfully
 */
exports.reviewRoutes.post("/", ReviewController_1.ReviewController.createReview);
/**
 * @swagger
 * /api/reviews/user/{userId}:
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [SELLER, BUYER]
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
exports.reviewRoutes.get("/user/:userId", ReviewController_1.ReviewController.getUserReviews);
/**
 * @swagger
 * /api/reviews/seller/{sellerId}/summary:
 *   get:
 *     summary: Get seller review summary
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Seller review summary
 */
exports.reviewRoutes.get("/seller/:sellerId/summary", ReviewController_1.ReviewController.getSellerSummary);
/**
 * @swagger
 * /api/reviews/order/{orderId}:
 *   get:
 *     summary: Get reviews for an order
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order reviews
 */
exports.reviewRoutes.get("/order/:orderId", ReviewController_1.ReviewController.getOrderReviews);
/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   delete:
 *     summary: Delete review (owner only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted
 */
exports.reviewRoutes.delete("/:reviewId", authMiddleware_1.protect, ReviewController_1.ReviewController.deleteReview);
/**
 * @swagger
 * /api/reviews/my-reviews:
 *   get:
 *     summary: Get my reviews (reviews I wrote)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 */
exports.reviewRoutes.get("/my-reviews", authMiddleware_1.protect, ReviewController_1.ReviewController.getMyReviews);
//# sourceMappingURL=reviewRoutes.js.map