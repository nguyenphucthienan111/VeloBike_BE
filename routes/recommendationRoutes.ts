import { Router } from "express";
import { RecommendationController } from "../controllers/RecommendationController";
import { protect } from "../middleware/authMiddleware";

export const recommendationRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Recommendations
 *   description: AI-powered recommendation engine
 */

/**
 * @swagger
 * /api/recommendations/bikes:
 *   get:
 *     summary: Get personalized bike recommendations
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recommendations
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ROAD, MTB, GRAVEL, TRIATHLON, E_BIKE]
 *         description: Filter by bike type
 *     responses:
 *       200:
 *         description: Personalized recommendations
 */
recommendationRoutes.get("/bikes", protect, RecommendationController.getBikeRecommendations as any);

/**
 * @swagger
 * /api/recommendations/similar/{listingId}:
 *   get:
 *     summary: Get similar bikes to a specific listing
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Similar bikes
 */
recommendationRoutes.get("/similar/:listingId", RecommendationController.getSimilarBikes as any);

/**
 * @swagger
 * /api/recommendations/trending:
 *   get:
 *     summary: Get trending bikes
 *     tags: [Recommendations]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 7d
 *         description: Trending period
 *     responses:
 *       200:
 *         description: Trending bikes
 */
recommendationRoutes.get("/trending", RecommendationController.getTrendingBikes as any);

/**
 * @swagger
 * /api/recommendations/price-prediction/{listingId}:
 *   get:
 *     summary: Get AI price prediction for a bike
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Price prediction analysis
 */
recommendationRoutes.get("/price-prediction/:listingId", RecommendationController.getPricePrediction as any);