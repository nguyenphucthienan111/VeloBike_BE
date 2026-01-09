import { Router } from "express";
import { ReviewController } from "../controllers/ReviewController";
import { protect } from "../middleware/authMiddleware";

export const reviewRoutes = Router();

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
reviewRoutes.post("/", ReviewController.createReview as any);

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
reviewRoutes.get("/user/:userId", ReviewController.getUserReviews as any);

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
reviewRoutes.get("/seller/:sellerId/summary", ReviewController.getSellerSummary as any);

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
reviewRoutes.get("/order/:orderId", ReviewController.getOrderReviews as any);

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
reviewRoutes.delete("/:reviewId", protect, ReviewController.deleteReview as any);

/**
 * @swagger
 * /api/reviews/my-reviews:
 *   get:
 *     summary: Get my reviews (reviews I wrote)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 */
reviewRoutes.get("/my-reviews", protect, ReviewController.getMyReviews as any);
