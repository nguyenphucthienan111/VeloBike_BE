import axios from "axios";
import { Order, OrderStatus } from "../models/Order";
import { User, UserRole } from "../models/User";
import crypto from "crypto";
import { OrderService } from "./OrderService";

interface PayOSPaymentLinkData {
  orderCode: number;
  amount: number;
  description: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerAddress: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  cancelUrl: string;
  returnUrl: string;
}

export class PaymentService {
  private static readonly PAYOS_API_BASE = "https://api.payos.vn/v1";
  private static readonly PAYOS_API_KEY = process.env.PAYOS_API_KEY || "";
  private static readonly PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || "";
  private static readonly PAYOS_CHECKSUM_KEY =
    process.env.PAYOS_CHECKSUM_KEY || "";

  /**
   * Create payment link on PayOS
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
      const orderCode = Math.floor(Math.random() * 1000000);

      const paymentData: PayOSPaymentLinkData = {
        orderCode,
        amount: order.financials.totalAmount,
        description: `VeloBike Order #${orderId}`,
        buyerName: buyer.fullName,
        buyerEmail: buyer.email,
        buyerPhone: buyer.phone || "",
        buyerAddress: `${buyer.address?.street || ""}, ${
          buyer.address?.city || ""
        }`,
        items: [
          {
            name: "Bike Purchase",
            quantity: 1,
            price: order.financials.itemPrice,
          },
          ...(order.financials.inspectionFee > 0
            ? [
                {
                  name: "Inspection Fee",
                  quantity: 1,
                  price: order.financials.inspectionFee,
                },
              ]
            : []),
          {
            name: "Shipping",
            quantity: 1,
            price: order.financials.shippingFee,
          },
        ],
        cancelUrl,
        returnUrl,
      };

      // Sign payload
      const signature = this.createSignature(paymentData);

      const response = await axios.post(
        `${this.PAYOS_API_BASE}/payment-links`,
        paymentData,
        {
          headers: {
            "x-client-id": this.PAYOS_CLIENT_ID,
            "x-api-key": this.PAYOS_API_KEY,
            "x-signature": signature,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data?.data?.checkoutUrl) {
        throw new Error("Failed to create payment link");
      }

      // Persist trace to order timeline for webhook lookup
      order.timeline.push({
        status: order.status,
        timestamp: new Date(),
        actorId: order.buyerId,
        note: `Payment link created with orderCode: ${orderCode}`,
      } as any);
      await order.save();

      return { paymentLink: response.data.data.checkoutUrl, orderCode };
    } catch (err: any) {
      console.error(
        "PayOS create link error:",
        err.response?.data || err.message
      );
      throw new Error(`Payment link creation failed: ${err.message}`);
    }
  }

  /**
   * Verify webhook signature from PayOS
   */
  static verifyWebhookSignature(body: any, signature: string): boolean {
    try {
      const dataToVerify = JSON.stringify(body);
      const computedSignature = crypto
        .createHmac("sha256", this.PAYOS_CHECKSUM_KEY)
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
   * Get payment info from PayOS
   */
  static async getPaymentInfo(orderCode: number): Promise<any> {
    try {
      const response = await axios.get(
        `${this.PAYOS_API_BASE}/payment-links/${orderCode}`,
        {
          headers: {
            "x-client-id": this.PAYOS_CLIENT_ID,
            "x-api-key": this.PAYOS_API_KEY,
          },
        }
      );
      return response.data?.data;
    } catch (err: any) {
      console.error("Get payment info error:", err.message);
      throw err;
    }
  }

  /**
   * Release payment to seller (split payout)
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

      // Attempt PayOS split payout (simulated if not available)
      try {
        const payload = {
          orderId,
          sellerId,
          amounts: { seller: sellerAmount, platform: platformAmount },
        };
        const sig = this.createSignature(payload);
        await axios.post(`${this.PAYOS_API_BASE}/payouts/split`, payload, {
          headers: {
            "x-client-id": this.PAYOS_CLIENT_ID,
            "x-api-key": this.PAYOS_API_KEY,
            "x-signature": sig,
            "Content-Type": "application/json",
          },
        });
      } catch (err) {
        console.warn(
          "PayOS split payout failed or simulated:",
          (err as any).message
        );
      }

      // Update seller wallet as fallback
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
   * Refund payment to buyer (simulated)
   */
  static async refundPayment(orderId: string): Promise<void> {
    try {
      const order = await Order.findById(orderId);
      if (!order) throw new Error("Order not found");

      const buyer = await User.findById(order.buyerId);
      if (buyer) {
        buyer.wallet.balance += order.financials.totalAmount;
        await buyer.save();
      }

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

      // TODO: In production, implement geolocation matching:
      // 1. Get order location from listing
      // 2. Find inspectors within radius using 2dsphere index
      // 3. Filter by availability (not currently inspecting too many orders)
      // 4. Return nearest available inspector
    } catch (error) {
      console.error("Error finding inspector:", error);
      return null;
    }
  }

  /**
   * Create signature for PayOS requests
   */
  private static createSignature(data: any): string {
    const dataToSign = JSON.stringify(data);
    return crypto
      .createHmac("sha256", this.PAYOS_CHECKSUM_KEY)
      .update(dataToSign)
      .digest("hex");
  }
}
