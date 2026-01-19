import { Router } from "express";
import { ReviewController } from "../controllers/ReviewController";
import { protect } from "../middleware/authMiddleware";

export const reviewRoutes = Router();

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a review after order completion
 *     description: Buyer đánh giá seller sau khi order hoàn thành. Chỉ buyer của order mới có thể review.
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
 *                 description: Order ID đã hoàn thành
 *                 example: "696cba63ad1e5d95a2bcde45"
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Đánh giá từ 1-5 sao
 *                 example: 5
 *               comment:
 *                 type: string
 *                 description: Nhận xét chi tiết
 *                 example: "Xe đẹp, đúng mô tả, seller nhiệt tình"
 *               categories:
 *                 type: object
 *                 description: Đánh giá chi tiết theo từng tiêu chí (optional)
 *                 properties:
 *                   itemAccuracy:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                     example: 5
 *                   communication:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                     example: 5
 *                   shipping:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                     example: 4
 *                   packaging:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                     example: 5
 *           example:
 *             orderId: "696cba63ad1e5d95a2bcde45"
 *             rating: 5
 *             comment: "Xe đẹp, đúng mô tả, seller nhiệt tình"
 *             categories:
 *               itemAccuracy: 5
 *               communication: 5
 *               shipping: 4
 *               packaging: 5
 *     responses:
 *       201:
 *         description: Review created successfully
 *       400:
 *         description: Invalid input or order not completed
 *       403:
 *         description: Only buyer can review
 *       404:
 *         description: Order not found
 */
reviewRoutes.post("/", protect, ReviewController.createReview as any);

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
reviewRoutes.get("/:userId", ReviewController.getUserReviews as any);
