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
 */
exports.orderRoutes.get("/:id/timeline", authMiddleware_1.protect, OrderController_1.OrderController.getTimeline);
/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (Seller/Buyer)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
exports.orderRoutes.put("/:id/status", authMiddleware_1.protect, OrderController_1.OrderController.updateStatus);
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