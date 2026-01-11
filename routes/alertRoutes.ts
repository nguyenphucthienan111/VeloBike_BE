import { Router } from "express";
import { AlertController } from "../controllers/AlertController";
import { protect } from "../middleware/authMiddleware";
import { validationRules, validate } from "../middleware/validationMiddleware";

export const alertRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Price alerts and saved search notifications
 */

// Price Alerts
/**
 * @swagger
 * /api/alerts/price:
 *   post:
 *     summary: Create a price alert for a listing
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listingId
 *               - targetPrice
 *             properties:
 *               listingId:
 *                 type: string
 *               targetPrice:
 *                 type: number
 *                 minimum: 0
 */
alertRoutes.post("/price", protect, validationRules.createPriceAlert, validate, AlertController.createPriceAlert as any);

/**
 * @swagger
 * /api/alerts/price:
 *   get:
 *     summary: Get user's price alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
alertRoutes.get("/price", protect, AlertController.getPriceAlerts as any);

/**
 * @swagger
 * /api/alerts/price/{id}:
 *   delete:
 *     summary: Delete a price alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
alertRoutes.delete("/price/:id", protect, AlertController.deletePriceAlert as any);

// Saved Searches
/**
 * @swagger
 * /api/alerts/saved-search:
 *   post:
 *     summary: Save a search query with optional alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
alertRoutes.post("/saved-search", protect, validationRules.createSavedSearch, validate, AlertController.createSavedSearch as any);

/**
 * @swagger
 * /api/alerts/saved-search:
 *   get:
 *     summary: Get user's saved searches
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
alertRoutes.get("/saved-search", protect, AlertController.getSavedSearches as any);

/**
 * @swagger
 * /api/alerts/saved-search/{id}:
 *   put:
 *     summary: Update a saved search
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
alertRoutes.put("/saved-search/:id", protect, AlertController.updateSavedSearch as any);

/**
 * @swagger
 * /api/alerts/saved-search/{id}:
 *   delete:
 *     summary: Delete a saved search
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
alertRoutes.delete("/saved-search/:id", protect, AlertController.deleteSavedSearch as any);