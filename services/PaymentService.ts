import { Order, OrderStatus } from "../models/Order";
import { User, UserRole } from "../models/User";
import { Transaction } from "../models/Transaction";
import crypto from "crypto";
import { OrderService } from "./OrderService";

// Import PayOS SDK
import { PayOS } from "@payos/node";

// Initialize PayOS with SDK
const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || "",
  apiKey: process.env.PAYOS_API_KEY || "",
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || ""
});

// Payment link expiration time (in minutes)
const PAYMENT_LINK_EXPIRATION_MINUTES = 30;

export class PaymentService {
  /**
   * Create payment link using PayOS SDK
   */
  static async createPaymentLink(
    orderId: string,
    returnUrl: string,
    cancelUrl: string
  ): Promise<{ paymentLink: string; orderCode: number }> {
    try {
      const order = await Order.findById(orderId).populate(
        "buyerId",
        "fullName email phone address"
      );
      if (!order) throw new Error("Order not found");

      const buyer = order.buyerId as any;
      const orderCode = Number(String(Date.now()).slice(-6));

      // Set expiration time (default: 30 minutes from now)
      const expiredAt = Math.floor(Date.now() / 1000) + (PAYMENT_LINK_EXPIRATION_MINUTES * 60);

      const paymentData = {
        orderCode,
        amount: order.financials.totalAmount,
        description: `VeloBike #${orderCode}`,
        buyerName: buyer.fullName || "Buyer",
        buyerEmail: buyer.email || "",
        buyerPhone: buyer.phone || "",
        buyerAddress: buyer.address?.street || "",
        items: [
          {
            name: "Bike Purchase",
            quantity: 1,
            price: order.financials.itemPrice,
          },
        ],
        expiredAt, // Payment link expires after configured minutes
        returnUrl,
        cancelUrl,
      };

      // Use PayOS SDK - paymentRequests.create()
      const paymentLinkResponse = await payOS.paymentRequests.create(paymentData);

      if (!paymentLinkResponse?.checkoutUrl) {
        throw new Error("Failed to create payment link");
      }

      // Save orderCode to timeline for webhook lookup
      order.timeline.push({
        status: order.status,
        timestamp: new Date(),
        actorId: order.buyerId,
        note: `Payment link created with orderCode: ${orderCode}`,
      } as any);
      await order.save();

      return { 
        paymentLink: paymentLinkResponse.checkoutUrl, 
        orderCode 
      };
    } catch (err: any) {
      console.error("PayOS create link error:", err.message);
      throw new Error(`Payment link creation failed: ${err.message}`);
    }
  }

  /**
   * Verify webhook signature from PayOS
   */
  static verifyWebhookSignature(body: any, signature: string): boolean {
    try {
      const checksumKey = process.env.PAYOS_CHECKSUM_KEY || "";
      const dataToVerify = JSON.stringify(body);
      const computedSignature = crypto
        .createHmac("sha256", checksumKey)
        .update(dataToVerify)
        .digest("hex");

      return computedSignature === signature;
    } catch (error) {
      console.error("Signature verification failed:", error);
      return false;
    }
  }

  /**
   * Handle webhook from PayOS and progress order through FSM
   */
  static async handlePaymentWebhook(webhookData: any): Promise<void> {
    try {
      const { orderCode, code, data } = webhookData;

      // PayOS success code assumption
      if (code === "00000" && data?.status === "PAID") {
        // Find order by timeline note containing orderCode
        const order = await Order.findOne({
          "timeline.note": new RegExp(orderCode, "i"),
        });
        if (!order) {
          console.warn("Order not found for orderCode", orderCode);
          return;
        }

        // Create PAYMENT_HOLD transaction record (tiền đang treo trên PayOS)
        await Transaction.create({
          userId: order.buyerId,
          type: "PAYMENT_HOLD",
          amount: order.financials.totalAmount,
          status: "COMPLETED",
          relatedOrderId: order._id,
          description: `Escrow locked for order #${order._id}`,
          paymentGatewayRef: data.transactionId || `payos_${orderCode}`,
          metadata: {
            orderCode,
            payosTransactionId: data.transactionId,
            escrowStatus: "LOCKED",
            lockedAt: new Date(),
          },
        });

        // Use OrderService to lock escrow (enforces FSM rules)
        await OrderService.lockEscrow(
          order._id.toString(),
          data.transactionId || "payos_tx"
        );

        // Persist timeline note
        order.timeline.push({
          status: OrderStatus.ESCROW_LOCKED,
          timestamp: new Date(),
          actorId: order.buyerId,
          note: `Payment confirmed via PayOS (Order Code: ${orderCode})`,
        } as any);
        await order.save();

        console.log(`Order ${order._id} payment confirmed via PayOS`);

        // Auto-trigger inspection if required
        await this.autoTriggerInspection(order._id.toString());
      } else {
        console.log(
          `PayOS webhook: payment not successful or unknown code for orderCode ${webhookData.orderCode}`
        );
      }
    } catch (err) {
      console.error("Webhook processing error:", err);
      throw err;
    }
  }

  /**
   * Get payment info from PayOS using SDK
   */
  static async getPaymentInfo(orderCode: number): Promise<any> {
    try {
      const paymentInfo = await payOS.paymentRequests.get(orderCode);
      return paymentInfo;
    } catch (err: any) {
      console.error("Get payment info error:", err.message);
      throw err;
    }
  }

  /**
   * Cancel payment link using SDK
   */
  static async cancelPaymentLink(orderCode: number, reason?: string): Promise<any> {
    try {
      const result = await payOS.paymentRequests.cancel(orderCode, reason);
      return result;
    } catch (err: any) {
      console.error("Cancel payment link error:", err.message);
      throw err;
    }
  }

  /**
   * Verify webhook data using SDK
   */
  static verifyPaymentWebhookData(webhookBody: any): any {
    try {
      // PayOS SDK doesn't have verifyData method, use manual verification
      return this.verifyWebhookSignature(webhookBody, webhookBody.signature || "");
    } catch (err: any) {
      console.error("Verify webhook error:", err.message);
      return null;
    }
  }

  /**
   * Release payment to seller (split payout)
   * Note: PayOS doesn't support split payout directly, so we track in our system
   */
  static async releasePayment(
    orderId: string,
    sellerId: string
  ): Promise<void> {
    try {
      const order = await Order.findById(orderId);
      if (!order) throw new Error("Order not found");

      const seller = await User.findById(sellerId);
      if (!seller || !seller.bankAccount)
        throw new Error("Seller bank account not found");

      const sellerAmount =
        order.financials.itemPrice - order.financials.platformFee;
      const platformAmount = order.financials.platformFee;

      // Create PAYMENT_RELEASE transaction for seller
      await Transaction.create({
        userId: sellerId,
        type: "PAYMENT_RELEASE",
        amount: sellerAmount,
        status: "COMPLETED",
        relatedOrderId: order._id,
        description: `Payment released for order #${order._id}`,
        metadata: {
          escrowStatus: "RELEASED",
          releasedAt: new Date(),
          breakdown: {
            itemPrice: order.financials.itemPrice,
            platformFee: order.financials.platformFee,
            sellerReceived: sellerAmount,
          },
        },
      });

      // Create PLATFORM_FEE transaction
      await Transaction.create({
        userId: sellerId,
        type: "PLATFORM_FEE",
        amount: platformAmount,
        status: "COMPLETED",
        relatedOrderId: order._id,
        description: `Platform fee for order #${order._id}`,
      });

      // Update seller wallet
      seller.wallet.balance += sellerAmount;
      await seller.save();

      console.log(
        `Payment released for order ${orderId}: seller ${sellerAmount}, platform ${platformAmount}`
      );
    } catch (err: any) {
      console.error("Payment release error:", err.message);
      throw err;
    }
  }

  /**
   * Refund payment to buyer
   */
  static async refundPayment(orderId: string): Promise<void> {
    try {
      const order = await Order.findById(orderId);
      if (!order) throw new Error("Order not found");

      const buyer = await User.findById(order.buyerId);
      if (!buyer) throw new Error("Buyer not found");

      // Find the original PAYMENT_HOLD transaction
      const holdTransaction = await Transaction.findOne({
        relatedOrderId: order._id,
        type: "PAYMENT_HOLD",
        status: "COMPLETED",
      });

      // Try to cancel payment link on PayOS (if not yet paid out)
      if (holdTransaction?.metadata && (holdTransaction.metadata as any).orderCode) {
        try {
          await payOS.paymentRequests.cancel(
            (holdTransaction.metadata as any).orderCode,
            "Order refunded"
          );
          console.log(`PayOS payment link cancelled for order ${orderId}`);
        } catch (err) {
          console.warn("PayOS cancel failed:", (err as any).message);
        }
      }

      // Create REFUND transaction record
      await Transaction.create({
        userId: order.buyerId,
        type: "REFUND",
        amount: order.financials.totalAmount,
        status: "COMPLETED",
        relatedOrderId: order._id,
        description: `Refund for order #${order._id}`,
        paymentGatewayRef: holdTransaction?.paymentGatewayRef,
        metadata: {
          escrowStatus: "REFUNDED",
          refundedAt: new Date(),
          refundMethod: "WALLET_CREDIT",
          originalPaymentRef: holdTransaction?.paymentGatewayRef,
        },
      });

      // Update original PAYMENT_HOLD transaction metadata
      if (holdTransaction) {
        holdTransaction.metadata = {
          ...holdTransaction.metadata,
          escrowStatus: "REFUNDED",
          refundedAt: new Date(),
        };
        await holdTransaction.save();
      }

      // Credit buyer wallet
      buyer.wallet.balance += order.financials.totalAmount;
      await buyer.save();

      console.log(
        `Refund processed for order ${orderId}: ${order.financials.totalAmount} VND`
      );
    } catch (err: any) {
      console.error("Refund error:", err.message);
      throw err;
    }
  }

  /**
   * Auto-trigger inspection after payment is locked
   * Assigns nearest available inspector and starts inspection
   */
  private static async autoTriggerInspection(orderId: string): Promise<void> {
    try {
      const order = await Order.findById(orderId).populate("listingId");
      if (!order) {
        console.warn(`Order ${orderId} not found for auto-inspection`);
        return;
      }

      // Check if inspection is required
      const listing = order.listingId as any;
      if (!listing || !listing.inspectionRequired) {
        console.log(`Order ${orderId} does not require inspection`);
        return;
      }

      // Find nearest available inspector
      const inspector = await this.findNearestInspector(order);
      if (!inspector) {
        console.warn(`No available inspector found for order ${orderId}`);
        // Keep order in ESCROW_LOCKED, admin can manually assign later
        return;
      }

      // Assign inspector and start inspection
      order.inspectorId = inspector._id;
      await order.save();

      await OrderService.startInspection(orderId, inspector._id.toString());

      console.log(`Inspection auto-started for order ${orderId} with inspector ${inspector._id}`);
    } catch (error) {
      console.error(`Error auto-triggering inspection for order ${orderId}:`, error);
      // Don't throw - payment is already locked, inspection can be assigned manually
    }
  }

  /**
   * Find nearest available inspector
   * For now, returns first available inspector. In production, use geolocation matching.
   */
  private static async findNearestInspector(order: any): Promise<any> {
    try {
      // Find available inspectors (active, not banned)
      const inspectors = await User.find({
        role: UserRole.INSPECTOR,
        isActive: true,
      }).limit(1);

      return inspectors.length > 0 ? inspectors[0] : null;
    } catch (error) {
      console.error("Error finding inspector:", error);
      return null;
    }
  }
}
