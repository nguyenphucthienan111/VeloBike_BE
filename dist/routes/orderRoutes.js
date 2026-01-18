"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRoutes = void 0;
const express_1 = require("express");
const OrderService_1 = require("../services/OrderService");
const OrderController_1 = require("../controllers/OrderController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
exports.orderRoutes = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order processing and State Machine transitions
 */
/**
 * @swagger
 * /api/orders/{id}/transition:
 *   post:
 *     summary: Transition an order to a new state
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newState
 *             properties:
 *               newState:
 *                 type: string
 *                 enum: [ESCROW_LOCKED, IN_INSPECTION, INSPECTION_PASSED, INSPECTION_FAILED, SHIPPING, DELIVERED, COMPLETED]
 *                 description: The target status to transition to
 *               note:
 *                 type: string
 *                 description: Optional note for the audit log
 *     responses:
 *       200:
 *         description: State transition successful
 *       403:
 *         description: Unauthorized role
 */
const transitionHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { newState, note } = req.body;
        // SECURITY FIX: User ID and Role must come from the authenticated token
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const orderService = new OrderService_1.OrderService();
        const updatedOrder = yield orderService.transitionState(id, newState, user.id, // Actor ID from Token
        user.role, // Actor Role from Token
        note);
        res.json({ success: true, order: updatedOrder });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});
// Order CRUD APIs
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order (Buyer)
 *     tags: [Orders]
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
 *             properties:
 *               listingId:
 *                 type: string
 *                 description: ID của listing muốn mua
 *                 example: "6968dc1e784ea62dc2355d96"
 *               inspectionRequired:
 *                 type: boolean
 *                 description: |
 *                   Buyer có muốn kiểm định không (mặc định true).
 *
 *                   **Quy tắc:**
 *                   - Nếu Listing.inspectionRequired = false → Buyer KHÔNG THỂ chọn kiểm định
 *                   - Nếu Listing.inspectionRequired = true → Buyer có thể chọn có/không
 *
 *                   **Chi phí:**
 *                   - Có kiểm định: +500,000 VNĐ
 *                   - Không kiểm định: Tiết kiệm 500k nhưng rủi ro cao hơn
 *                 default: true
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Bad request (listing not found, already sold, inspection conflict, etc.)
 *       401:
 *         description: Unauthorized
 */
exports.orderRoutes.post("/", authMiddleware_1.protect, validationMiddleware_1.validationRules.createOrder, validationMiddleware_1.validate, OrderController_1.OrderController.create);
/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [CREATED, ESCROW_LOCKED, IN_INSPECTION, INSPECTION_PASSED, INSPECTION_FAILED, SHIPPING, DELIVERED, COMPLETED, CANCELLED, REFUNDED]
 *         description: Filter by order status
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [buyer, seller]
 *         description: Filter by role (buyer or seller)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of orders
 *       401:
 *         description: Unauthorized
 */
exports.orderRoutes.get("/", authMiddleware_1.protect, OrderController_1.OrderController.getMyOrders);
/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order details
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 *       403:
 *         description: Not authorized to view this order
 */
exports.orderRoutes.get("/:id", authMiddleware_1.protect, OrderController_1.OrderController.getById);
/**
 * @swagger
 * /api/orders/{id}/timeline:
 *   get:
 *     summary: Get order timeline
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order timeline with status history
 *       404:
 *         description: Order not found
 *       403:
 *         description: Not authorized
 */
exports.orderRoutes.get("/:id/timeline", authMiddleware_1.protect, OrderController_1.OrderController.getTimeline);
/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (Seller/Buyer)
 *     description: |
 *       Cập nhật trạng thái đơn hàng:
 *       - SELLER có thể chuyển sang SHIPPING (khi status = INSPECTION_PASSED)
 *       - BUYER có thể chuyển sang DELIVERED (khi status = SHIPPING)
 *       - BUYER/SELLER có thể CANCEL (khi status = CREATED)
 *       - ADMIN có thể chuyển sang COMPLETED hoặc REFUNDED
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SHIPPING, DELIVERED, CANCELLED, COMPLETED, REFUNDED]
 *                 description: Trạng thái mới
 *               note:
 *                 type: string
 *                 description: Ghi chú (tùy chọn)
 *                 example: "Đã giao hàng cho đơn vị vận chuyển"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status transition
 *       403:
 *         description: Not authorized to change status
 *       404:
 *         description: Order not found
 */
exports.orderRoutes.put("/:id/status", authMiddleware_1.protect, OrderController_1.OrderController.updateStatus);
/**
 * @swagger
 * /api/orders/{id}/shipping-address:
 *   put:
 *     summary: Cập nhật địa chỉ giao hàng (Buyer only)
 *     description: Buyer cập nhật địa chỉ nhận hàng trước khi thanh toán
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shippingAddress
 *             properties:
 *               shippingAddress:
 *                 type: object
 *                 required:
 *                   - fullName
 *                   - phone
 *                   - street
 *                   - district
 *                   - city
 *                 properties:
 *                   fullName:
 *                     type: string
 *                     description: Tên người nhận
 *                     example: "Nguyen Van A"
 *                   phone:
 *                     type: string
 *                     description: Số điện thoại
 *                     example: "0901234567"
 *                   street:
 *                     type: string
 *                     description: Địa chỉ chi tiết
 *                     example: "123 Nguyen Hue"
 *                   district:
 *                     type: string
 *                     description: Quận/Huyện
 *                     example: "Quan 1"
 *                   city:
 *                     type: string
 *                     description: Thành phố
 *                     example: "Ho Chi Minh"
 *                   province:
 *                     type: string
 *                     description: Tỉnh/Thành
 *                     example: "Ho Chi Minh"
 *                   zipCode:
 *                     type: string
 *                     description: Mã bưu điện (tùy chọn)
 *                     example: "700000"
 *     responses:
 *       200:
 *         description: Cập nhật địa chỉ thành công
 *       400:
 *         description: Không thể thay đổi sau khi thanh toán
 *       403:
 *         description: Chỉ buyer mới có thể cập nhật
 *       404:
 *         description: Order not found
 */
exports.orderRoutes.put("/:id/shipping-address", authMiddleware_1.protect, OrderController_1.OrderController.updateShippingAddress);
/**
 * @swagger
 * /api/orders/{id}/escrow-status:
 *   get:
 *     summary: Get escrow status and transaction history for an order
 *     description: Returns detailed information about the escrow status, including whether money is locked, released, or refunded
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Escrow status retrieved successfully
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
 *                     escrowStatus:
 *                       type: string
 *                       enum: [NOT_PAID, LOCKED, RELEASED, REFUNDED]
 *                     financials:
 *                       type: object
 *                     transactions:
 *                       type: array
 */
exports.orderRoutes.get("/:id/escrow-status", authMiddleware_1.protect, OrderController_1.OrderEscrowController.getEscrowStatus);
// Generic transition endpoint (for advanced use)
exports.orderRoutes.post("/:id/transition", authMiddleware_1.protect, transitionHandler);
//# sourceMappingURL=orderRoutes.js.map