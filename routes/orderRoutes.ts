import { Router, Request, Response } from "express";
import { OrderService } from "../services/OrderService";
import { OrderController, OrderEscrowController } from "../controllers/OrderController";
import { UserRole } from "../models/User";
import { OrderStatus } from "../models/Order";
import { protect, AuthRequest } from "../middleware/authMiddleware";
import { validationRules, validate } from "../middleware/validationMiddleware";

export const orderRoutes = Router();

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
const transitionHandler = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { newState, note } = req.body;

    // SECURITY FIX: User ID and Role must come from the authenticated token
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const orderService = new OrderService();
    const updatedOrder = await orderService.transitionState(
      id,
      newState as OrderStatus,
      user.id, // Actor ID from Token
      user.role, // Actor Role from Token
      note
    );

    res.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

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
orderRoutes.post("/", protect, validationRules.createOrder, validate, OrderController.create as any);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
orderRoutes.get("/", protect, OrderController.getMyOrders as any);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order details
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
orderRoutes.get("/:id", protect, OrderController.getById as any);

/**
 * @swagger
 * /api/orders/{id}/timeline:
 *   get:
 *     summary: Get order timeline
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
orderRoutes.get("/:id/timeline", protect, OrderController.getTimeline as any);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (Seller/Buyer)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
orderRoutes.put("/:id/status", protect, OrderController.updateStatus as any);

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
orderRoutes.get("/:id/escrow-status", protect, OrderEscrowController.getEscrowStatus as any);

// Generic transition endpoint (for advanced use)
orderRoutes.post("/:id/transition", protect, transitionHandler as any);
