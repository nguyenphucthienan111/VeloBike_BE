import { Router } from "express";
import { FraudController } from "../controllers/FraudController";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

export const fraudRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Fraud Detection
 *   description: AI-powered fraud detection and risk analysis
 */

/**
 * @swagger
 * /api/fraud/analyze/user/{userId}:
 *   get:
 *     summary: Analyze user for fraud indicators (Admin only)
 *     tags: [Fraud Detection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fraud analysis results
 */
fraudRoutes.get("/analyze/user/:userId", protect, authorize(UserRole.ADMIN, UserRole.INSPECTOR), FraudController.analyzeUser as any);

/**
 * @swagger
 * /api/fraud/analyze/listing/{listingId}:
 *   get:
 *     summary: Analyze listing for fraud indicators (Admin only)
 *     tags: [Fraud Detection]
 *     security:
 *       - bearerAuth: []
 */
fraudRoutes.get("/analyze/listing/:listingId", protect, authorize(UserRole.ADMIN, UserRole.INSPECTOR), FraudController.analyzeListing as any);

/**
 * @swagger
 * /api/fraud/analyze/order/{orderId}:
 *   get:
 *     summary: Analyze order for fraud indicators (Admin only)
 *     tags: [Fraud Detection]
 *     security:
 *       - bearerAuth: []
 */
fraudRoutes.get("/analyze/order/:orderId", protect, authorize(UserRole.ADMIN, UserRole.INSPECTOR), FraudController.analyzeOrder as any);

/**
 * @swagger
 * /api/fraud/stats:
 *   get:
 *     summary: Get fraud detection statistics (Admin only)
 *     tags: [Fraud Detection]
 *     security:
 *       - bearerAuth: []
 */
fraudRoutes.get("/stats", protect, authorize(UserRole.ADMIN), FraudController.getFraudStats as any);