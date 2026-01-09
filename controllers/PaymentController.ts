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
      const order = await Order.findById(orderId);

      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.status !== OrderStatus.CREATED)
        return res
          .status(400)
          .json({ message: "Order is not eligible for payment" });

      // Define return and cancel URLs (should be configured in .env or passed from frontend)
      const returnUrl =
        process.env.PAYMENT_RETURN_URL ||
        "http://localhost:3000/payment/success";
      const cancelUrl =
        process.env.PAYMENT_CANCEL_URL ||
        "http://localhost:3000/payment/cancel";

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
}
