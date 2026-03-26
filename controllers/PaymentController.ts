import { Request, Response } from "express";
import { Order, OrderStatus } from "../models/Order";
import { OrderService } from "../services/OrderService";
import { UserRole } from "../models/User";
import { PaymentService } from "../services/PaymentService";

export class PaymentController {
  // POST /api/payment/create-link
  // Creates a checkout link (e.g., PayOS, Stripe)
  static async createPaymentLink(req: any, res: any) {
    try {
      const { orderId } = req.body;
      const order = await Order.findById(orderId).populate('listingId');

      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.status !== OrderStatus.CREATED)
        return res
          .status(400)
          .json({ message: "Order is not eligible for payment" });

      // Get listing ID for cancel redirect
      const listingId = (order.listingId as any)?._id || order.listingId;

      // Define return and cancel URLs
      const returnUrl =
        process.env.PAYMENT_RETURN_URL ||
        `https://velo-bike-fe.vercel.app/payment/success`;
      const cancelUrl =
        process.env.PAYMENT_CANCEL_URL ||
        `https://velo-bike-fe.vercel.app/payment/cancel`;

      // Call Real Payment Service
      const { paymentLink, orderCode } = await PaymentService.createPaymentLink(
        orderId,
        returnUrl,
        cancelUrl
      );

      res.json({
        success: true,
        paymentLink,
        orderCode,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/payment/webhook
  // Receives notification from Payment Gateway when buyer pays
  static async handleWebhook(req: Request, res: Response) {
    try {
      // Validate signature header if provided
      const signatureHeader = (req.headers["x-payos-signature"] ||
        req.headers["x-signature"] ||
        req.headers["signature"]) as string | undefined;

      if (signatureHeader) {
        const valid = PaymentService.verifyWebhookSignature(
          req.body,
          signatureHeader
        );
        if (!valid) {
          console.warn("Invalid webhook signature");
          return res
            .status(403)
            .json({ success: false, message: "Invalid signature" });
        }
      }

      // Delegate processing to PaymentService which understands PayOS payloads
      await PaymentService.handlePaymentWebhook(req.body);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Webhook Error:", error);
      res
        .status(500)
        .json({ success: false, message: (error as Error).message });
    }
  }

  // GET /api/payment/info/:orderCode
  // Get payment information
  static async getPaymentInfo(req: Request, res: Response) {
    try {
      const { orderCode } = req.params;
      const orderCodeNum = parseInt(orderCode);

      if (isNaN(orderCodeNum)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid order code" });
      }

      const paymentInfo = await PaymentService.getPaymentInfo(orderCodeNum);

      res.json({ success: true, data: paymentInfo });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/payment/refund/:orderId
  // Refund payment (Admin only)
  static async refund(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const userRole = (req as any).user?.role;

      if (userRole !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Admin only" });
      }

      await PaymentService.refundPayment(orderId);

      // Update order status
      await OrderService.refundOrder(
        orderId,
        (req as any).user.id,
        "Refunded by admin"
      );

      res.json({ success: true, message: "Refund processed" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/payment/simulate-payment
  // [DEV ONLY] Simulate payment for testing without PayOS
  static async simulatePayment(req: any, res: any) {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ 
          success: false, 
          message: "Simulate payment không khả dụng trong production" 
        });
      }

      const { orderId } = req.body;
      const userId = req.user?.id;

      if (!orderId) {
        return res.status(400).json({ success: false, message: "orderId is required" });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      if (order.status !== OrderStatus.CREATED) {
        return res.status(400).json({ 
          success: false, 
          message: `Order đang ở trạng thái ${order.status}, không thể thanh toán` 
        });
      }

      // Check if user is the buyer
      if (order.buyerId.toString() !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: "Chỉ buyer của order này mới có thể thanh toán" 
        });
      }

      // Import Transaction model
      const { Transaction } = await import("../models/Transaction");

      // Create PAYMENT_HOLD transaction (simulate escrow) — guard against duplicate
      const existingHold = await Transaction.findOne({ relatedOrderId: order._id, type: "PAYMENT_HOLD" });
      if (!existingHold) {
        await Transaction.create({
          userId: order.buyerId,
          type: "PAYMENT_HOLD",
          amount: order.financials.totalAmount,
          status: "COMPLETED",
          relatedOrderId: order._id,
          description: `[SIMULATED] Escrow locked for order #${order._id}`,
          paymentGatewayRef: `sim_${Date.now()}`,
          metadata: {
            simulated: true,
            escrowStatus: "LOCKED",
            lockedAt: new Date(),
          },
        });
      }

      // Update order status to ESCROW_LOCKED
      await OrderService.lockEscrow(orderId, `sim_tx_${Date.now()}`);

      // Add timeline entry
      order.status = OrderStatus.ESCROW_LOCKED;
      order.timeline.push({
        status: OrderStatus.ESCROW_LOCKED,
        timestamp: new Date(),
        actorId: order.buyerId,
        note: "[SIMULATED] Payment confirmed - Escrow locked",
      } as any);
      await order.save();

      // Update listing status to RESERVED
      const { Listing, ListingStatus } = await import("../models/Listing");
      const updatedOrder = await Order.findById(orderId).populate("listingId");
      if (updatedOrder) {
        const listing = updatedOrder.listingId as any;
        if (listing) {
          // Update listing status to RESERVED
          await Listing.findByIdAndUpdate(listing._id, {
            status: ListingStatus.RESERVED,
          });
          console.log(`[SIMULATED] Listing ${listing._id} status updated to RESERVED`);
        }

        // Auto-trigger inspection if required (same as real webhook)
        if (listing && listing.inspectionRequired) {
          // Find available inspector
          const { User } = await import("../models/User");
          const inspector = await User.findOne({
            role: UserRole.INSPECTOR,
            isActive: true,
          });

          if (inspector) {
            // Assign inspector and start inspection
            updatedOrder.inspectorId = inspector._id;
            await updatedOrder.save();
            await OrderService.startInspection(orderId, inspector._id.toString());
            
            console.log(`[SIMULATED] Inspection auto-started for order ${orderId} with inspector ${inspector._id}`);
          } else {
            console.warn(`[SIMULATED] No available inspector found for order ${orderId}`);
          }
        } else {
          console.log(`[SIMULATED] Order ${orderId} does not require inspection`);
        }
      }

      // Fetch final order status
      const finalOrder = await Order.findById(orderId);

      res.json({
        success: true,
        message: "Thanh toán đã được simulate thành công",
        data: {
          orderId: finalOrder?._id,
          status: finalOrder?.status,
          inspectorId: finalOrder?.inspectorId,
          escrowStatus: "LOCKED",
          amount: order.financials.totalAmount,
          inspectionTriggered: finalOrder?.status === OrderStatus.IN_INSPECTION,
          note: "Đây là thanh toán giả lập cho môi trường dev. Trong production, dùng PayOS thật."
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
