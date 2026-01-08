import { Request, Response } from "express";
import { Order, OrderStatus } from "../models/Order";
import { OrderService } from "../services/OrderService";
import { UserRole } from "../models/User";

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

      // --- MOCK PAYMENT GATEWAY LOGIC ---
      // In reality, call PayOS.createPaymentLink() here
      const amount = order.financials.totalAmount;
      const paymentLink = `https://mock-payment-gateway.com/checkout?orderId=${orderId}&amount=${amount}`;
      // ----------------------------------

      res.json({
        success: true,
        paymentLink,
        orderId,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // POST /api/payment/webhook
  // Receives notification from Payment Gateway when buyer pays
  static async handleWebhook(req: any, res: any) {
    try {
      // 1. Validate Webhook Signature (Crucial for security in real app)
      // const signature = req.headers['x-payos-signature'];
      // if (!isValid(signature)) return res.status(403).send();

      // 2. Extract Data
      const { orderId, paymentStatus } = req.body;

      // 3. Process
      if (paymentStatus === "SUCCESS") {
        console.log(`Webhook: Payment received for Order ${orderId}`);

        const orderService = new OrderService();
        // Transition order to ESCROW_LOCKED (Money held by platform)
        await orderService.transitionState(
          orderId,
          OrderStatus.ESCROW_LOCKED,
          "system_webhook", // Actor
          UserRole.ADMIN, // System acts as admin
          "Payment received via Webhook"
        );
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Webhook Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
