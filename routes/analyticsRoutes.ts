import { Router } from "express";
import { AnalyticsController } from "../controllers/AnalyticsController";
import { protect } from "../middleware/authMiddleware";

export const analyticsRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Seller analytics and performance metrics
 */

/**
 * @swagger
 * /api/analytics/seller/dashboard:
 *   get:
 *     summary: Get seller analytics dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seller analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalListings:
 *                           type: number
 *                         totalViews:
 *                           type: number
 *                         totalSales:
 *                           type: number
 *                         totalRevenue:
 *                           type: number
 *                         averageOrderValue:
 *                           type: number
 *                         conversionRate:
 *                           type: number
 *                     listingsByStatus:
 *                       type: object
 *                     topListings:
 *                       type: array
 *                     recentTransactions:
 *                       type: array
 */
analyticsRoutes.get("/seller/dashboard", protect, AnalyticsController.getSellerDashboard as any);

/**
 * @swagger
 * /api/analytics/seller/performance:
 *   get:
 *     summary: Get seller performance over time
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *         description: Time period for performance data
 *     responses:
 *       200:
 *         description: Performance data over time
 */
analyticsRoutes.get("/seller/performance", protect, AnalyticsController.getSellerPerformance as any);

/**
 * @swagger
 * /api/analytics/listing/{id}:
 *   get:
 *     summary: Get analytics for a specific listing
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Listing analytics data
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Listing not found
 */
analyticsRoutes.get("/listing/:id", protect, AnalyticsController.getListingAnalytics as any);
