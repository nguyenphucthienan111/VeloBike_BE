import { Router, Request, Response } from "express";
import { OrderService } from "../services/OrderService";
import { UserRole } from "../models/User";
import { OrderStatus } from "../models/Order";

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
 *               - userId
 *               - role
 *             properties:
 *               newState:
 *                 type: string
 *                 enum: [ESCROW_LOCKED, IN_INSPECTION, INSPECTION_PASSED, INSPECTION_FAILED, SHIPPING, DELIVERED, COMPLETED]
 *                 description: The target status to transition to
 *               userId:
 *                 type: string
 *                 description: ID of the user performing the action (simulated auth)
 *               role:
 *                 type: string
 *                 enum: [BUYER, SELLER, INSPECTOR, ADMIN]
 *                 description: Role of the user (simulated auth)
 *               note:
 *                 type: string
 *                 description: Optional note for the audit log
 *     responses:
 *       200:
 *         description: State transition successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 order:
 *                   type: object
 *       400:
 *         description: Invalid transition rule or missing parameters
 */
const transitionHandler = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { newState, note, userId, role } = req.body;

    // NOTE: In production, 'userId' and 'role' should come from Auth Middleware (req.user), not req.body!

    const orderService = new OrderService();
    const updatedOrder = await orderService.transitionState(
      id,
      newState as OrderStatus,
      userId, // Actor ID
      role as UserRole, // Actor Role
      note
    );

    res.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

orderRoutes.post("/:id/transition", transitionHandler as any);
