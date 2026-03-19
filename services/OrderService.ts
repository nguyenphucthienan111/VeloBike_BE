import { Order, OrderStatus, IOrder } from "../models/Order";
import { Listing } from "../models/Listing";
import { User } from "../models/User";
import { Transaction } from "../models/Transaction";
import mongoose, { Types } from "mongoose";

import { NotificationService } from "./NotificationService";
import { SubscriptionService } from "./SubscriptionService";
import { ShippingService } from "./ShippingService";

// Platform account ID - should be set in .env or created during system setup
const PLATFORM_ACCOUNT_ID = process.env.PLATFORM_ACCOUNT_ID || null;

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
      OrderStatus.DISPUTED, // Allow dispute from created state
    ],
    [OrderStatus.ESCROW_LOCKED]: [
      OrderStatus.IN_INSPECTION,
      OrderStatus.INSPECTION_PASSED,
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
      actorId: actorId && Types.ObjectId.isValid(actorId) ? new Types.ObjectId(actorId) : undefined,
      note,
    } as any);

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
    inspectionFee: number = 500000,
    buyerCity: string = ""
  ): Promise<IOrder> {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error("Listing not found");
    }

    if (listing.status === "SOLD") {
      throw new Error("This item is already sold");
    }

    // Get seller's commission rate from subscription
    const commissionRate = await SubscriptionService.getCommissionRate(listing.sellerId.toString());
    
    // Check if seller has free inspection quota
    let finalInspectionFee = inspectionFee;
    if (inspectionRequired) {
      const hasFreeInspection = await SubscriptionService.canUseFreeInspection(listing.sellerId.toString());
      if (hasFreeInspection) {
        finalInspectionFee = 0; // Free inspection for this seller
        // Increment immediately so quota is consumed at order creation
        await SubscriptionService.incrementInspectionCount(listing.sellerId.toString());
        console.log(`Free inspection applied and quota decremented for seller ${listing.sellerId}`);
      }
    }
    
    const weightKg = (listing as any).specs?.weight ?? 10;
    const seller = await User.findById(listing.sellerId).select("address").lean();
    const sellerCity = (seller as any)?.address?.city || (seller as any)?.address?.province || "Hà Nội";
    const shippingBreakdown = await ShippingService.calculate(sellerCity, buyerCity || sellerCity, weightKg);
    const shippingFee = shippingBreakdown.total;
    const platformFee = Math.ceil(listing.pricing.amount * commissionRate); // Dynamic based on subscription

    const order = new Order({
      listingId: new Types.ObjectId(listingId),
      buyerId: new Types.ObjectId(buyerId),
      sellerId: listing.sellerId,
      status: OrderStatus.CREATED,
      inspectionRequired: inspectionRequired,
      financials: {
        itemPrice: listing.pricing.amount,
        inspectionFee: inspectionRequired ? finalInspectionFee : 0,
        shippingFee,
        platformFee,
        totalAmount:
          listing.pricing.amount +
          (inspectionRequired ? finalInspectionFee : 0) +
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
    const order = await this.transitionStatus(
      orderId,
      OrderStatus.INSPECTION_PASSED,
      inspectorId,
      undefined,
      "Inspection passed"
    );

    return order;
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

    // Get commission rate info for description
    const commissionRate = itemPrice > 0 ? platformFee / itemPrice : 0;
    const commissionPercent = Math.round(commissionRate * 100);

    // Get seller's subscription plan name for description
    let planName = "FREE";
    try {
      const { SubscriptionService } = await import("./SubscriptionService");
      const sub = await SubscriptionService.getSellerSubscription(order.sellerId.toString());
      if (sub) planName = sub.planType;
    } catch (_) {}

    // Create PAYMENT_RELEASE transaction for seller
    await Transaction.create({
      userId: order.sellerId,
      type: "PAYMENT_RELEASE",
      amount: sellerPayout,
      status: "COMPLETED",
      relatedOrderId: order._id,
      description: `Giải ngân đơn hàng #${order._id} | Giá bán: ${itemPrice.toLocaleString("vi-VN")}đ | Phí hoa hồng (${commissionPercent}% - gói ${planName}): -${platformFee.toLocaleString("vi-VN")}đ | Thực nhận: ${sellerPayout.toLocaleString("vi-VN")}đ`,
      metadata: {
        escrowStatus: "RELEASED",
        releasedAt: new Date(),
        breakdown: {
          itemPrice,
          platformFee,
          commissionRate,
          commissionPercent,
          planName,
          sellerReceived: sellerPayout,
        },
      },
    });

    // Credit Seller
    await User.findByIdAndUpdate(order.sellerId, {
      $inc: { "wallet.balance": sellerPayout },
    });

    // Credit Inspector (if applicable)
    if (order.inspectorId) {
      const INSPECTOR_BASE_FEE = 500000; // Standard inspector fee
      const inspectorPayout = inspectionFee > 0 ? inspectionFee : INSPECTOR_BASE_FEE;
      const paidByPlatform = inspectionFee === 0; // Free inspection — platform covers it

      await Transaction.create({
        userId: order.inspectorId,
        type: "INSPECTION_FEE",
        amount: inspectorPayout,
        status: "COMPLETED",
        relatedOrderId: order._id,
        description: `Inspection fee for order #${order._id}${paidByPlatform ? " (covered by seller's Premium subscription)" : ""}`,
        metadata: { paidByPlatform },
      });

      await User.findByIdAndUpdate(order.inspectorId, {
        $inc: { "wallet.balance": inspectorPayout },
      });
    }

    // Create COMMISSION_DEBIT transaction (tracking deduction from seller's perspective)
    await Transaction.create({
      userId: order.sellerId,
      type: "COMMISSION_DEBIT",
      amount: platformFee,
      status: "COMPLETED",
      relatedOrderId: order._id,
      description: `Phí hoa hồng ${commissionPercent}% (gói ${planName}) cho đơn hàng #${order._id}`,
      metadata: {
        commissionRate,
        commissionPercent,
        planName,
        itemPrice,
      },
    });

    // Record platform commission revenue (always, regardless of PLATFORM_ACCOUNT_ID)
    await Transaction.create({
      userId: order.sellerId, // linked to seller's order for traceability
      type: "PLATFORM_FEE",
      amount: platformFee,
      status: "COMPLETED",
      relatedOrderId: order._id,
      description: `Phí hoa hồng nền tảng ${commissionPercent}% (gói ${planName}) cho đơn hàng #${order._id}`,
      metadata: {
        breakdown: {
          platformFee,
          commissionRate,
          commissionPercent,
          planName,
          itemPrice,
        },
      },
    });

    // Credit Platform Account wallet (if configured)
    if (PLATFORM_ACCOUNT_ID) {
      const platformRevenue = platformFee + order.financials.shippingFee;
      await User.findByIdAndUpdate(PLATFORM_ACCOUNT_ID, {
        $inc: { "wallet.balance": platformRevenue },
      });
    }

    // Update original PAYMENT_HOLD transaction metadata
    await Transaction.findOneAndUpdate(
      { relatedOrderId: order._id, type: "PAYMENT_HOLD" },
      {
        $set: {
          "metadata.escrowStatus": "RELEASED",
          "metadata.releasedAt": new Date(),
        },
      }
    );

    // Note: Platform Fee and Shipping Fee are retained by the Platform (Company Account)

    // 3. Mark listing as SOLD
    await Listing.findByIdAndUpdate(order.listingId, { status: "SOLD" });

    // Return updated order
    return await Order.findById(orderId) as IOrder;
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
