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
 * tags:
 *   name: Payment
 *   description: Payment processing with PayOS
 */
/**
 * @swagger
 * /api/payment/create-link:
 *   post:
 *     summary: Tạo link thanh toán PayOS (Buyer only)
 *     description: Tạo link thanh toán cho đơn hàng. Buyer mở link để thanh toán qua PayOS.
 *     tags: [Payment]
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
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: ID của đơn hàng cần thanh toán
 *                 example: "6969db87ecf2d0f6e982f793"
 *     responses:
 *       200:
 *         description: Payment link generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 paymentLink:
 *                   type: string
 *                   description: URL để thanh toán
 *                 orderCode:
 *                   type: number
 *                   description: Mã đơn hàng trên PayOS
 *       400:
 *         description: Order không hợp lệ hoặc đã thanh toán
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Lỗi kết nối PayOS
 */
exports.paymentRoutes.post("/create-link", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.BUYER), PaymentController_1.PaymentController.createPaymentLink);
/**
 * @swagger
 * /api/payment/webhook:
 *   post:
 *     summary: Webhook nhận thông báo từ PayOS
 *     description: |
 *       PayOS gọi endpoint này khi có cập nhật thanh toán.
 *       Không cần gọi thủ công - PayOS tự động gọi.
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderCode:
 *                 type: number
 *                 description: Mã đơn hàng PayOS
 *               code:
 *                 type: string
 *                 description: Mã trạng thái (00000 = thành công)
 *               data:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     enum: [PAID, CANCELLED, EXPIRED]
 *                   transactionId:
 *                     type: string
 *     responses:
 *       200:
 *         description: Webhook processed
 */
exports.paymentRoutes.post("/webhook", PaymentController_1.PaymentController.handleWebhook);
/**
 * @swagger
 * /api/payment/info/{orderCode}:
 *   get:
 *     summary: Xem thông tin thanh toán
 *     description: Lấy thông tin thanh toán từ PayOS theo orderCode
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã đơn hàng PayOS (số)
 *         example: "123456"
 *     responses:
 *       200:
 *         description: Payment info retrieved
 *       400:
 *         description: Invalid order code
 *       500:
 *         description: Lỗi kết nối PayOS
 */
exports.paymentRoutes.get("/info/:orderCode", authMiddleware_1.protect, PaymentController_1.PaymentController.getPaymentInfo);
/**
 * @swagger
 * /api/payment/refund/{orderId}:
 *   post:
 *     summary: Hoàn tiền cho Buyer (Admin only)
 *     description: Admin hoàn tiền cho buyer khi có tranh chấp hoặc inspection failed
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID đơn hàng cần hoàn tiền
 *         example: "6969db87ecf2d0f6e982f793"
 *     responses:
 *       200:
 *         description: Refund processed
 *       403:
 *         description: Admin only
 *       404:
 *         description: Order not found
 *       500:
 *         description: Refund failed
 */
exports.paymentRoutes.post("/refund/:orderId", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.ADMIN), PaymentController_1.PaymentController.refund);
/**
 * @swagger
 * /api/payment/simulate-payment:
 *   post:
 *     summary: "[DEV ONLY] Giả lập thanh toán thành công"
 *     description: |
 *       Chỉ dùng trong môi trường development khi không kết nối được PayOS.
 *       Simulate buyer đã thanh toán → Order chuyển sang ESCROW_LOCKED.
 *     tags: [Payment]
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
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: ID đơn hàng cần simulate thanh toán
 *                 example: "6969db87ecf2d0f6e982f793"
 *     responses:
 *       200:
 *         description: Payment simulated successfully
 *       400:
 *         description: Order không hợp lệ
 *       403:
 *         description: Chỉ dùng trong development mode
 */
exports.paymentRoutes.post("/simulate-payment", authMiddleware_1.protect, PaymentController_1.PaymentController.simulatePayment);
//# sourceMappingURL=paymentRoutes.js.map