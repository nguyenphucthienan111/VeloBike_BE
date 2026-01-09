import { Router } from "express";
import { LogisticsController } from "../controllers/LogisticsController";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

export const logisticsRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Logistics
 *   description: Shipping and delivery management
 */

/**
 * @swagger
 * /api/logistics/calculate-fee:
 *   post:
 *     summary: Calculate shipping fees
 *     tags: [Logistics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               origin:
 *                 type: object
 *               destination:
 *                 type: object
 *               weight:
 *                 type: number
 *     responses:
 *       200:
 *         description: List of shipping rates
 */
logisticsRoutes.post("/calculate-fee", LogisticsController.calculateFee);

/**
 * @swagger
 * /api/logistics/create-shipment:
 *   post:
 *     summary: Create a shipment (Seller only)
 *     tags: [Logistics]
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
 *               - serviceId
 *             properties:
 *               orderId:
 *                 type: string
 *               serviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shipment created
 */
logisticsRoutes.post(
  "/create-shipment",
  protect,
  authorize(UserRole.SELLER, UserRole.ADMIN),
  LogisticsController.createShipment
);

/**
 * @swagger
 * /api/logistics/tracking/{trackingNumber}:
 *   get:
 *     summary: Track a shipment
 *     tags: [Logistics]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tracking info
 */
logisticsRoutes.get("/tracking/:trackingNumber", LogisticsController.trackShipment);
