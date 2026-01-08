import { Router, Request, Response } from 'express';
import { OrderService } from '../services/OrderService';
import { UserRole } from '../models/User';
import { OrderStatus } from '../models/Order';

export const orderRoutes = Router();

// POST /api/orders/:id/transition
const transitionHandler = async (req: Request, res: Response) => {
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

orderRoutes.post('/:id/transition', transitionHandler as any);