import { Router } from "express";
import { InspectorReviewController } from "../controllers/InspectorReviewController";
import { protect } from "../middleware/authMiddleware";

export const inspectorReviewRoutes = Router();

/**
 * @swagger
 * /api/inspector-reviews:
 *   post:
 *     summary: Rate an inspector after inspection
 *     description: Buyer hoặc Seller đánh giá inspector sau khi inspection hoàn thành.
 *     tags: [InspectorReviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inspectionId
 *               - rating
 *               - comment
 *             properties:
 *               inspectionId:
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
 *                   professionalism:
 *                     type: number
 *                   accuracy:
 *                     type: number
 *                   communication:
 *                     type: number
 *                   timeliness:
 *                     type: number
 *     responses:
 *       201:
 *         description: Review created
 *       400:
 *         description: Invalid input or already reviewed
 *       403:
 *         description: Not authorized
 */
inspectorReviewRoutes.post("/", protect, InspectorReviewController.createReview as any);

/**
 * @swagger
 * /api/inspector-reviews/inspector/{inspectorId}:
 *   get:
 *     summary: Get all reviews for an inspector
 *     tags: [InspectorReviews]
 *     parameters:
 *       - in: path
 *         name: inspectorId
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
 *         description: Inspector reviews with stats
 */
inspectorReviewRoutes.get("/inspector/:inspectorId", InspectorReviewController.getInspectorReviews as any);

/**
 * @swagger
 * /api/inspector-reviews/check/{inspectionId}:
 *   get:
 *     summary: Check if current user already reviewed this inspection
 *     tags: [InspectorReviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inspectionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review status
 */
inspectorReviewRoutes.get("/check/:inspectionId", protect, InspectorReviewController.checkReviewed as any);
