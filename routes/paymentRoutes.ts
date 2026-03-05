import { Router } from "express";
import { PaymentController } from "../controllers/PaymentController";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

export const paymentRoutes = Router();

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
paymentRoutes.post(
  "/create-link",
  protect,
  authorize(UserRole.BUYER, UserRole.SELLER), // Allow both BUYER and SELLER
  PaymentController.createPaymentLink as any
);

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
paymentRoutes.post("/webhook", PaymentController.handleWebhook as any);

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
paymentRoutes.get("/info/:orderCode", protect, PaymentController.getPaymentInfo as any);

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
paymentRoutes.post("/refund/:orderId", protect, authorize(UserRole.ADMIN), PaymentController.refund as any);

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
paymentRoutes.post("/simulate-payment", protect, PaymentController.simulatePayment as any);