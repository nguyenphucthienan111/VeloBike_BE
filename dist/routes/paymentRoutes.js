"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRoutes = void 0;
const express_1 = require("express");
const PaymentController_1 = require("../controllers/PaymentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
exports.paymentRoutes = (0, express_1.Router)();
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
exports.paymentRoutes.post("/create-link", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.BUYER), // ONLY BUYER CAN PAY
PaymentController_1.PaymentController.createPaymentLink);
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
exports.paymentRoutes.post("/webhook", PaymentController_1.PaymentController.handleWebhook);
/**
 * @swagger
 * /api/payment/info/{orderCode}:
 *   get:
 *     summary: Get payment information
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 */
exports.paymentRoutes.get("/info/:orderCode", authMiddleware_1.protect, PaymentController_1.PaymentController.getPaymentInfo);
/**
 * @swagger
 * /api/payment/refund/{orderId}:
 *   post:
 *     summary: Refund payment (Admin only)
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 */
exports.paymentRoutes.post("/refund/:orderId", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.ADMIN), PaymentController_1.PaymentController.refund);
//# sourceMappingURL=paymentRoutes.js.map