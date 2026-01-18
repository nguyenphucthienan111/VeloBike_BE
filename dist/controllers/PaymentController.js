"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
    // POST /api/payment/simulate-payment
    // [DEV ONLY] Simulate payment for testing without PayOS
    static simulatePayment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Only allow in development
                if (process.env.NODE_ENV === "production") {
                    return res.status(403).json({
                        success: false,
                        message: "Simulate payment không khả dụng trong production"
                    });
                }
                const { orderId } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!orderId) {
                    return res.status(400).json({ success: false, message: "orderId is required" });
                }
                const order = yield Order_1.Order.findById(orderId);
                if (!order) {
                    return res.status(404).json({ success: false, message: "Order not found" });
                }
                if (order.status !== Order_1.OrderStatus.CREATED) {
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
                const { Transaction } = yield Promise.resolve().then(() => __importStar(require("../models/Transaction")));
                // Create PAYMENT_HOLD transaction (simulate escrow)
                yield Transaction.create({
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
                // Update order status to ESCROW_LOCKED
                yield OrderService_1.OrderService.lockEscrow(orderId, `sim_tx_${Date.now()}`);
                // Add timeline entry
                order.status = Order_1.OrderStatus.ESCROW_LOCKED;
                order.timeline.push({
                    status: Order_1.OrderStatus.ESCROW_LOCKED,
                    timestamp: new Date(),
                    actorId: order.buyerId,
                    note: "[SIMULATED] Payment confirmed - Escrow locked",
                });
                yield order.save();
                res.json({
                    success: true,
                    message: "Thanh toán đã được simulate thành công",
                    data: {
                        orderId: order._id,
                        status: order.status,
                        escrowStatus: "LOCKED",
                        amount: order.financials.totalAmount,
                        note: "Đây là thanh toán giả lập cho môi trường dev. Trong production, dùng PayOS thật."
                    }
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
}
exports.PaymentController = PaymentController;
//# sourceMappingURL=PaymentController.js.map