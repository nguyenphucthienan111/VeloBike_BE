import { Order, OrderStatus, IOrder } from "../models/Order";
import { Listing } from "../models/Listing";
import { User } from "../models/User";
import mongoose, { Types } from "mongoose";

import { NotificationService } from "./NotificationService";

export class OrderService {
  /**
   * Finite State Machine - Define valid transitions
   */
  private static readonly VALID_TRANSITIONS: Record<
    OrderStatus,
    OrderStatus[]
  > = {
    [OrderStatus.CREATED]: [
      OrderStatus.ESCROW_LOCKED,
      OrderStatus.REFUNDED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.ESCROW_LOCKED]: [
      OrderStatus.IN_INSPECTION,
      OrderStatus.REFUNDED,
    ],
    [OrderStatus.IN_INSPECTION]: [
      OrderStatus.INSPECTION_PASSED,
      OrderStatus.INSPECTION_FAILED,
      OrderStatus.DISPUTED,
    ],
    [OrderStatus.INSPECTION_PASSED]: [
      OrderStatus.SHIPPING,
      OrderStatus.DISPUTED,
    ],
    [OrderStatus.INSPECTION_FAILED]: [
      OrderStatus.REFUNDED,
      OrderStatus.DISPUTED,
    ],
    [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED, OrderStatus.DISPUTED],
    [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.DISPUTED],
    [OrderStatus.COMPLETED]: [OrderStatus.DISPUTED],
    [OrderStatus.DISPUTED]: [OrderStatus.REFUNDED, OrderStatus.COMPLETED],
    [OrderStatus.REFUNDED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  /**
   * Validate and transition order status
   */
  static async transitionStatus(
    orderId: string,
    newStatus: OrderStatus,
    actorId: string,
    actorRole?: string,
    note?: string
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Validate transition
    const validTransitions = this.VALID_TRANSITIONS[order.status];
    if (!validTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid transition from ${order.status} to ${newStatus}`
      );
    }

    // Update order status
    order.status = newStatus;
    order.timeline.push({
      status: newStatus,
      timestamp: new Date(),
      actorId: new Types.ObjectId(actorId),
      note,
    });

    await order.save();

    // Emit event for listeners (email, notification, etc.)
    this.emitOrderStatusChanged(order);

    return order;
  }

  // Instance method compatibility for existing code using new OrderService().transitionState(...)
  async transitionState(
    orderId: string,
    newStatus: OrderStatus,
    actorId: string,
    actorRole?: string,
    note?: string
  ): Promise<IOrder> {
    return OrderService.transitionStatus(
      orderId,
      newStatus,
      actorId,
      actorRole,
      note
    );
  }

  /**
   * Create new order from listing
   */
  static async createOrder(
    listingId: string,
    buyerId: string,
    inspectionRequired: boolean = true,
    inspectionFee: number = 500000
  ): Promise<IOrder> {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    if (listing.status === "SOLD") {
      throw new Error("This item is already sold");
    }

    const shippingFee = 150000; // Example: VND
    const platformFee = Math.ceil(listing.pricing.amount * 0.1); // 10%

    const order = new Order({
      listingId: new Types.ObjectId(listingId),
      buyerId: new Types.ObjectId(buyerId),
      sellerId: listing.sellerId,
      status: OrderStatus.CREATED,
      financials: {
        itemPrice: listing.pricing.amount,
        inspectionFee: inspectionRequired ? inspectionFee : 0,
        shippingFee,
        platformFee,
        totalAmount:
          listing.pricing.amount +
          (inspectionRequired ? inspectionFee : 0) +
          shippingFee,
      },
      timeline: [
        {
          status: OrderStatus.CREATED,
          timestamp: new Date(),
          actorId: new Types.ObjectId(buyerId),
          note: "Order created",
        },
      ],
    });

    await order.save();
    return order;
  }

  /**
   * Lock escrow (buyer paid)
   */
  static async lockEscrow(
    orderId: string,
    paymentGatewayId: string
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    return this.transitionStatus(
      orderId,
      OrderStatus.ESCROW_LOCKED,
      order.buyerId.toString(),
      undefined,
      `Payment received: ${paymentGatewayId}`
    );
  }

  /**
   * Start inspection
   */
  static async startInspection(
    orderId: string,
    inspectorId: string
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    order.inspectorId = new Types.ObjectId(inspectorId);
    await order.save();

    return this.transitionStatus(
      orderId,
      OrderStatus.IN_INSPECTION,
      inspectorId,
      undefined,
      "Inspection started"
    );
  }

  /**
   * Complete inspection - PASS
   */
  static async inspectionPassed(
    orderId: string,
    inspectorId: string
  ): Promise<IOrder> {
    return this.transitionStatus(
      orderId,
      OrderStatus.INSPECTION_PASSED,
      inspectorId,
      undefined,
      "Inspection passed"
    );
  }

  /**
   * Complete inspection - FAIL
   */
  static async inspectionFailed(
    orderId: string,
    inspectorId: string
  ): Promise<IOrder> {
    return this.transitionStatus(
      orderId,
      OrderStatus.INSPECTION_FAILED,
      inspectorId,
      undefined,
      "Inspection failed"
    );
  }

  /**
   * Mark order as shipped
   */
  static async markShipped(orderId: string, sellerId: string): Promise<IOrder> {
    return this.transitionStatus(
      orderId,
      OrderStatus.SHIPPING,
      sellerId,
      undefined,
      "Item shipped"
    );
  }

  /**
   * Mark order as delivered
   */
  static async markDelivered(
    orderId: string,
    buyerId: string
  ): Promise<IOrder> {
    return this.transitionStatus(
      orderId,
      OrderStatus.DELIVERED,
      buyerId,
      undefined,
      "Item received"
    );
  }

  /**
   * Complete order and release payment
   */
  static async completeOrder(
    orderId: string,
    adminId: string
  ): Promise<IOrder> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // 1. Transition Status
    await this.transitionStatus(
      orderId,
      OrderStatus.COMPLETED,
      adminId,
      undefined,
      "Payment released to seller"
    );

    // 2. Distribute Funds (Split Payment)
    const { itemPrice, platformFee, inspectionFee } = order.financials;
    const sellerPayout = itemPrice - platformFee;

    // Credit Seller
    await User.findByIdAndUpdate(order.sellerId, {
      $inc: { "wallet.balance": sellerPayout },
    });

    // Credit Inspector (if applicable)
    if (order.inspectorId && inspectionFee > 0) {
      await User.findByIdAndUpdate(order.inspectorId, {
        $inc: { "wallet.balance": inspectionFee },
      });
    }

    // Note: Platform Fee and Shipping Fee are retained by the Platform (Company Account)

    // 3. Mark listing as SOLD
    await Listing.findByIdAndUpdate(order.listingId, { status: "SOLD" });

    return order;
  }

  /**
   * Refund order
   */
  static async refundOrder(
    orderId: string,
    adminId: string,
    reason: string
  ): Promise<IOrder> {
    return this.transitionStatus(
      orderId,
      OrderStatus.REFUNDED,
      adminId,
      undefined,
      `Refunded: ${reason}`
    );
  }

  /**
   * Open dispute
   */
  static async openDispute(
    orderId: string,
    claimantId: string
  ): Promise<IOrder> {
    return this.transitionStatus(
      orderId,
      OrderStatus.DISPUTED,
      claimantId,
      undefined,
      "Dispute opened"
    );
  }

  /**
   * Get order timeline
   */
  static async getOrderTimeline(orderId: string) {
    const order = await Order.findById(orderId)
      .populate("timeline.actorId", "fullName role")
      .exec();

    if (!order) {
      throw new Error("Order not found");
    }

    return order.timeline;
  }

  /**
   * Emit order status changed event
   * In production, this would trigger email/push notifications
   */
  private static async emitOrderStatusChanged(order: IOrder) {
    // Notify Buyer
    await NotificationService.sendNotification(
      order.buyerId.toString(),
      "Order Update",
      `Your order #${order._id} status is now ${order.status}`,
      { orderId: order._id.toString(), status: order.status }
    );

    // Notify Seller
    await NotificationService.sendNotification(
      order.sellerId.toString(),
      "Order Update",
      `Order #${order._id} status is now ${order.status}`,
      { orderId: order._id.toString(), status: order.status }
    );

    console.log(
      `[ORDER EVENT] Order ${order._id} status changed to ${order.status}`
    );
  }
}
