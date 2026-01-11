import { Router } from "express";
import { DashboardController } from "../controllers/DashboardController";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

export const dashboardRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: User dashboard endpoints for sellers and buyers
 */

// Seller Dashboard
/**
 * @swagger
 * /api/dashboard/seller/analytics:
 *   get:
 *     summary: Get seller analytics (sales, revenue, trends)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seller analytics data
 */
dashboardRoutes.get("/seller/analytics", protect, authorize(UserRole.SELLER), DashboardController.getSellerAnalytics as any);

/**
 * @swagger
 * /api/dashboard/seller/performance:
 *   get:
 *     summary: Get seller performance metrics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
dashboardRoutes.get("/seller/performance", protect, authorize(UserRole.SELLER), DashboardController.getSellerPerformance as any);

/**
 * @swagger
 * /api/dashboard/seller/inventory:
 *   get:
 *     summary: Get seller inventory management data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
dashboardRoutes.get("/seller/inventory", protect, authorize(UserRole.SELLER), DashboardController.getSellerInventory as any);

// Buyer Dashboard
/**
 * @swagger
 * /api/dashboard/buyer/history:
 *   get:
 *     summary: Get buyer purchase history
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
dashboardRoutes.get("/buyer/history", protect, authorize(UserRole.BUYER), DashboardController.getBuyerHistory as any);

/**
 * @swagger
 * /api/dashboard/buyer/saved-searches:
 *   get:
 *     summary: Get buyer saved searches
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
dashboardRoutes.get("/buyer/saved-searches", protect, authorize(UserRole.BUYER), DashboardController.getBuyerSavedSearches as any);

/**
 * @swagger
 * /api/dashboard/buyer/price-alerts:
 *   get:
 *     summary: Get buyer price alerts
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
dashboardRoutes.get("/buyer/price-alerts", protect, authorize(UserRole.BUYER), DashboardController.getBuyerPriceAlerts as any);

/**
 * @swagger
 * /api/dashboard/buyer/recommendations:
 *   get:
 *     summary: Get personalized bike recommendations
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
dashboardRoutes.get("/buyer/recommendations", protect, authorize(UserRole.BUYER), DashboardController.getBuyerRecommendations as any);

// Inspector Dashboard
/**
 * @swagger
 * /api/dashboard/inspector/stats:
 *   get:
 *     summary: Get inspector statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
dashboardRoutes.get("/inspector/stats", protect, authorize(UserRole.INSPECTOR), DashboardController.getInspectorStats as any);

/**
 * @swagger
 * /api/dashboard/inspector/earnings:
 *   get:
 *     summary: Get inspector earnings
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
dashboardRoutes.get("/inspector/earnings", protect, authorize(UserRole.INSPECTOR), DashboardController.getInspectorEarnings as any);