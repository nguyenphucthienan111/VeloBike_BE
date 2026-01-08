import { Router, Request, Response } from "express";
import { OrderService } from "../services/OrderService";
import { UserRole } from "../models/User";
import { OrderStatus } from "../models/Order";
import { protect, AuthRequest } from "../middleware/authMiddleware";

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

orderRoutes.post("/:id/transition", protect, transitionHandler as any);
