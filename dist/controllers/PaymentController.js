"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const Order_1 = require("../models/Order");
const OrderService_1 = require("../services/OrderService");
const PaymentService_1 = require("../services/PaymentService");
class PaymentController {
    // POST /api/payment/create-link
    // Creates a checkout link (e.g., PayOS, Stripe)
    static createPaymentLink(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.body;
                const order = yield Order_1.Order.findById(orderId);
                if (!order)
                    return res.status(404).json({ message: "Order not found" });
                if (order.status !== Order_1.OrderStatus.CREATED)
                    return res
                        .status(400)
                        .json({ message: "Order is not eligible for payment" });
                // Define return and cancel URLs (should be configured in .env or passed from frontend)
                const returnUrl = process.env.PAYMENT_RETURN_URL ||
                    "http://localhost:3000/payment/success";
                const cancelUrl = process.env.PAYMENT_CANCEL_URL ||
                    "http://localhost:3000/payment/cancel";
                // Call Real Payment Service
                const { paymentLink, orderCode } = yield PaymentService_1.PaymentService.createPaymentLink(orderId, returnUrl, cancelUrl);
                res.json({
                    success: true,
                    paymentLink,
                    orderCode,
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // POST /api/payment/webhook
    // Receives notification from Payment Gateway when buyer pays
    static handleWebhook(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate signature header if provided
                const signatureHeader = (req.headers["x-payos-signature"] ||
                    req.headers["x-signature"] ||
                    req.headers["signature"]);
                if (signatureHeader) {
                    const valid = PaymentService_1.PaymentService.verifyWebhookSignature(req.body, signatureHeader);
                    if (!valid) {
                        console.warn("Invalid webhook signature");
                        return res
                            .status(403)
                            .json({ success: false, message: "Invalid signature" });
                    }
                }
                // Delegate processing to PaymentService which understands PayOS payloads
                yield PaymentService_1.PaymentService.handlePaymentWebhook(req.body);
                res.json({ success: true });
            }
            catch (error) {
                console.error("Webhook Error:", error);
                res
                    .status(500)
                    .json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/payment/info/:orderCode
    // Get payment information
    static getPaymentInfo(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderCode } = req.params;
                const orderCodeNum = parseInt(orderCode);
                if (isNaN(orderCodeNum)) {
                    return res
                        .status(400)
                        .json({ success: false, message: "Invalid order code" });
                }
                const paymentInfo = yield PaymentService_1.PaymentService.getPaymentInfo(orderCodeNum);
                res.json({ success: true, data: paymentInfo });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // POST /api/payment/refund/:orderId
    // Refund payment (Admin only)
    static refund(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { orderId } = req.params;
                const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
                if (userRole !== "ADMIN") {
                    return res.status(403).json({ success: false, message: "Admin only" });
                }
                yield PaymentService_1.PaymentService.refundPayment(orderId);
                // Update order status
                yield OrderService_1.OrderService.refundOrder(orderId, req.user.id, "Refunded by admin");
                res.json({ success: true, message: "Refund processed" });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
}
exports.PaymentController = PaymentController;
//# sourceMappingURL=PaymentController.js.map