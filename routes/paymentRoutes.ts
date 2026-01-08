import { Router } from "express";
import { PaymentController } from "../controllers/PaymentController";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

export const paymentRoutes = Router();

/**
 * @swagger
 * /api/payment/create-link:
 *   post:
 *     summary: Create a payment link for an order (Buyer only)
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId: { type: string }
 *     responses:
 *       200:
 *         description: Payment link generated
 */
paymentRoutes.post(
  "/create-link",
  protect,
  authorize(UserRole.BUYER), // ONLY BUYER CAN PAY
  PaymentController.createPaymentLink as any
);

/**
 * @swagger
 * /api/payment/webhook:
 *   post:
 *     summary: Receive payment notifications (System/Gateway only)
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Webhook processed
 */
paymentRoutes.post("/webhook", PaymentController.handleWebhook as any);
