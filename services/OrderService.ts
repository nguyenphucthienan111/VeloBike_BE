import mongoose from 'mongoose';
import { Order, OrderStatus, IOrder } from '../models/Order';
import { UserRole } from '../models/User';

interface StateTransitionRule {
  from: OrderStatus[];
  to: OrderStatus;
  allowedRoles: UserRole[];
}

export class OrderService {
  
  // Define strict rules for state transitions (The "Machine")
  private static rules: StateTransitionRule[] = [
    { 
      from: [OrderStatus.CREATED], 
      to: OrderStatus.ESCROW_LOCKED, 
      allowedRoles: [UserRole.BUYER] // Only Buyer can pay
    },
    { 
      from: [OrderStatus.ESCROW_LOCKED], 
      to: OrderStatus.IN_INSPECTION, 
      allowedRoles: [UserRole.ADMIN, UserRole.INSPECTOR] 
    },
    { 
      from: [OrderStatus.IN_INSPECTION], 
      to: OrderStatus.INSPECTION_PASSED, 
      allowedRoles: [UserRole.INSPECTOR] 
    },
    { 
      from: [OrderStatus.IN_INSPECTION], 
      to: OrderStatus.INSPECTION_FAILED, 
      allowedRoles: [UserRole.INSPECTOR] 
    },
    { 
      from: [OrderStatus.INSPECTION_PASSED], 
      to: OrderStatus.SHIPPING, 
      allowedRoles: [UserRole.SELLER, UserRole.ADMIN] 
    },
    { 
      from: [OrderStatus.SHIPPING], 
      to: OrderStatus.DELIVERED, 
      allowedRoles: [UserRole.ADMIN] // Integration with Shipping Provider webhook
    },
    { 
      from: [OrderStatus.DELIVERED], 
      to: OrderStatus.COMPLETED, 
      allowedRoles: [UserRole.BUYER, UserRole.ADMIN] // Buyer confirms or Admin auto-confirms after 48h
    },
    { 
      from: [OrderStatus.INSPECTION_FAILED], 
      to: OrderStatus.REFUNDED, 
      allowedRoles: [UserRole.ADMIN] 
    }
  ];

  /**
   * Core function to transition order state safely.
   */
  async transitionState(
    orderId: string, 
    newState: OrderStatus, 
    actorId: string, 
    actorRole: UserRole,
    note?: string
  ): Promise<IOrder> {
    
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    // 1. Validate Transition
    const rule = OrderService.rules.find(r => r.to === newState);
    if (!rule) throw new Error(`Transition to ${newState} is not defined`);

    if (!rule.from.includes(order.status)) {
      throw new Error(`Cannot transition from ${order.status} to ${newState}`);
    }

    if (!rule.allowedRoles.includes(actorRole)) {
      throw new Error(`User with role ${actorRole} is not authorized to perform this action`);
    }

    // 2. Perform Business Logic specific to transitions
    if (newState === OrderStatus.COMPLETED) {
        await this.releaseFundsToSeller(order);
    }
    if (newState === OrderStatus.REFUNDED) {
        await this.refundBuyer(order);
    }

    // 3. Update State & Audit Log
    order.status = newState;
    order.timeline.push({
      status: newState,
      timestamp: new Date(),
      actorId: new mongoose.Types.ObjectId(actorId),
      note: note
    });

    await order.save();
    
    // 4. Emit Event (Pseudo-code)
    // eventBus.emit('ORDER_UPDATED', { orderId, newState });

    return order;
  }

  private async releaseFundsToSeller(order: IOrder) {
    console.log(`[PAYMENT_GATEWAY] Releasing ${order.financials.itemPrice} minus fees to Seller ${order.sellerId}`);
    // Call PayOS or Stripe Payout API here
  }

  private async refundBuyer(order: IOrder) {
    console.log(`[PAYMENT_GATEWAY] Refunding ${order.financials.totalAmount} to Buyer ${order.buyerId}`);
    // Call Refund API here
  }
}