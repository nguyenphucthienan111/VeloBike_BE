import axios from "axios";
import { Order, OrderStatus } from "../models/Order";
import { User } from "../models/User";
import crypto from "crypto";

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
   * Create payment link
   */
  static async createPaymentLink(
    orderId: string,
    returnUrl: string,
    cancelUrl: string
  ): Promise<{ paymentLink: string; orderCode: number }> {
    try {
      const order = await Order.findById(orderId).populate(
        "buyerId",
        "fullName email phone"
      );
      if (!order) {
        throw new Error("Order not found");
      }

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

      // Make API request to PayOS
      const response = await axios.post(
        `${this.PAYOS_API_BASE}/payment-links`,
        paymentData,
        {
          headers: {
            "x-client-id": this.PAYOS_CLIENT_ID,
            "x-api-key": this.PAYOS_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.data?.checkoutUrl) {
        throw new Error("Failed to create payment link");
      }

      // Save orderCode to order for webhook verification
      order.timeline.push({
        status: order.status,
        timestamp: new Date(),
        actorId: order.buyerId,
        note: `Payment link created with orderCode: ${orderCode}`,
      });
      await order.save();

      return {
        paymentLink: response.data.data.checkoutUrl,
        orderCode,
      };
    } catch (error: any) {
      console.error("PayOS Error:", error.response?.data || error.message);
      throw new Error(`Payment link creation failed: ${error.message}`);
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
   * Handle webhook from PayOS
   */
  static async handlePaymentWebhook(webhookData: any): Promise<void> {
    try {
      const { orderCode, code, data } = webhookData;

      // code: "00000" means success
      if (code === "00000" && data?.status === "PAID") {
        // Find order by webhook data
        const order = await Order.findOne({
          "timeline.note": new RegExp(orderCode, "i"),
        });

        if (order) {
          // Update order status to ESCROW_LOCKED
          order.status = OrderStatus.ESCROW_LOCKED;
          order.timeline.push({
            status: OrderStatus.ESCROW_LOCKED,
            timestamp: new Date(),
            actorId: order.buyerId,
            note: `Payment confirmed via PayOS (Order Code: ${orderCode})`,
          });
          await order.save();

          console.log(`Order ${order._id} payment confirmed`);
        }
      } else {
        console.log(`Payment failed for orderCode: ${orderCode}`);
      }
    } catch (error) {
      console.error("Webhook processing error:", error);
      throw error;
    }
  }

  /**
   * Get payment info
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

      return response.data.data;
    } catch (error: any) {
      console.error("Get payment info error:", error.message);
      throw error;
    }
  }

  /**
   * Release payment to seller
   * In real scenario, integrate with PayOS Connect for split payments
   */
  static async releasePayment(
    orderId: string,
    sellerId: string
  ): Promise<void> {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      const seller = await User.findById(sellerId);
      if (!seller || !seller.bankAccount) {
        throw new Error("Seller bank account not found");
      }

      // Calculate amounts
      const sellerAmount =
        order.financials.itemPrice - order.financials.platformFee;
      const platformAmount = order.financials.platformFee;

      // TODO: In production, use PayOS Split Payment API
      // or integrate with banking API to transfer funds

      // For now, just update wallet
      console.log(`Payment Release:`);
      console.log(`- Seller (${seller.fullName}): ${sellerAmount} VND`);
      console.log(`- Platform Fee: ${platformAmount} VND`);

      // Update seller wallet
      seller.wallet.balance += sellerAmount;
      await seller.save();

      console.log(`Payment released for order ${orderId}`);
    } catch (error: any) {
      console.error("Payment release error:", error.message);
      throw error;
    }
  }

  /**
   * Refund payment to buyer
   */
  static async refundPayment(orderId: string): Promise<void> {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      // TODO: Call PayOS refund API
      const buyer = await User.findById(order.buyerId);
      if (buyer) {
        buyer.wallet.balance += order.financials.totalAmount;
        await buyer.save();
      }

      console.log(
        `Refund processed for order ${orderId}: ${order.financials.totalAmount} VND`
      );
    } catch (error: any) {
      console.error("Refund error:", error.message);
      throw error;
    }
  }

  /**
   * Create signature for PayOS request
   */
  private static createSignature(data: any): string {
    const dataToSign = JSON.stringify(data);
    return crypto
      .createHmac("sha256", this.PAYOS_CHECKSUM_KEY)
      .update(dataToSign)
      .digest("hex");
  }
}
