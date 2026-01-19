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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const Order_1 = require("../models/Order");
const User_1 = require("../models/User");
const Transaction_1 = require("../models/Transaction");
const crypto_1 = __importDefault(require("crypto"));
const OrderService_1 = require("./OrderService");
// Import PayOS SDK
const node_1 = require("@payos/node");
// Initialize PayOS with SDK
const payOS = new node_1.PayOS({
    clientId: process.env.PAYOS_CLIENT_ID || "",
    apiKey: process.env.PAYOS_API_KEY || "",
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || ""
});
// Payment link expiration time (in minutes)
const PAYMENT_LINK_EXPIRATION_MINUTES = 30;
class PaymentService {
    /**
     * Create payment link using PayOS SDK
     */
    static createPaymentLink(orderId, returnUrl, cancelUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const order = yield Order_1.Order.findById(orderId).populate("buyerId", "fullName email phone address");
                if (!order)
                    throw new Error("Order not found");
                const buyer = order.buyerId;
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
                    buyerAddress: ((_a = buyer.address) === null || _a === void 0 ? void 0 : _a.street) || "",
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
                const paymentLinkResponse = yield payOS.paymentRequests.create(paymentData);
                if (!(paymentLinkResponse === null || paymentLinkResponse === void 0 ? void 0 : paymentLinkResponse.checkoutUrl)) {
                    throw new Error("Failed to create payment link");
                }
                // Save orderCode to timeline for webhook lookup
                order.timeline.push({
                    status: order.status,
                    timestamp: new Date(),
                    actorId: order.buyerId,
                    note: `Payment link created with orderCode: ${orderCode}`,
                });
                yield order.save();
                return {
                    paymentLink: paymentLinkResponse.checkoutUrl,
                    orderCode
                };
            }
            catch (err) {
                console.error("PayOS create link error:", err.message);
                throw new Error(`Payment link creation failed: ${err.message}`);
            }
        });
    }
    /**
     * Verify webhook signature from PayOS
     */
    static verifyWebhookSignature(body, signature) {
        try {
            const checksumKey = process.env.PAYOS_CHECKSUM_KEY || "";
            const dataToVerify = JSON.stringify(body);
            const computedSignature = crypto_1.default
                .createHmac("sha256", checksumKey)
                .update(dataToVerify)
                .digest("hex");
            return computedSignature === signature;
        }
        catch (error) {
            console.error("Signature verification failed:", error);
            return false;
        }
    }
    /**
     * Handle webhook from PayOS and progress order through FSM
     */
    static handlePaymentWebhook(webhookData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderCode, code, data } = webhookData;
                // PayOS success code assumption
                if (code === "00000" && (data === null || data === void 0 ? void 0 : data.status) === "PAID") {
                    // Find order by timeline note containing orderCode
                    const order = yield Order_1.Order.findOne({
                        "timeline.note": new RegExp(orderCode, "i"),
                    });
                    if (!order) {
                        console.warn("Order not found for orderCode", orderCode);
                        return;
                    }
                    // Create PAYMENT_HOLD transaction record (tiền đang treo trên PayOS)
                    yield Transaction_1.Transaction.create({
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
                    yield OrderService_1.OrderService.lockEscrow(order._id.toString(), data.transactionId || "payos_tx");
                    // Persist timeline note
                    order.timeline.push({
                        status: Order_1.OrderStatus.ESCROW_LOCKED,
                        timestamp: new Date(),
                        actorId: order.buyerId,
                        note: `Payment confirmed via PayOS (Order Code: ${orderCode})`,
                    });
                    yield order.save();
                    console.log(`Order ${order._id} payment confirmed via PayOS`);
                    // Auto-trigger inspection if required
                    yield this.autoTriggerInspection(order._id.toString());
                }
                else {
                    console.log(`PayOS webhook: payment not successful or unknown code for orderCode ${webhookData.orderCode}`);
                }
            }
            catch (err) {
                console.error("Webhook processing error:", err);
                throw err;
            }
        });
    }
    /**
     * Get payment info from PayOS using SDK
     */
    static getPaymentInfo(orderCode) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const paymentInfo = yield payOS.paymentRequests.get(orderCode);
                return paymentInfo;
            }
            catch (err) {
                console.error("Get payment info error:", err.message);
                throw err;
            }
        });
    }
    /**
     * Cancel payment link using SDK
     */
    static cancelPaymentLink(orderCode, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield payOS.paymentRequests.cancel(orderCode, reason);
                return result;
            }
            catch (err) {
                console.error("Cancel payment link error:", err.message);
                throw err;
            }
        });
    }
    /**
     * Verify webhook data using SDK
     */
    static verifyPaymentWebhookData(webhookBody) {
        try {
            // PayOS SDK doesn't have verifyData method, use manual verification
            return this.verifyWebhookSignature(webhookBody, webhookBody.signature || "");
        }
        catch (err) {
            console.error("Verify webhook error:", err.message);
            return null;
        }
    }
    /**
     * Release payment to seller (split payout)
     * Note: PayOS doesn't support split payout directly, so we track in our system
     */
    static releasePayment(orderId, sellerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const order = yield Order_1.Order.findById(orderId);
                if (!order)
                    throw new Error("Order not found");
                const seller = yield User_1.User.findById(sellerId);
                if (!seller || !seller.bankAccount)
                    throw new Error("Seller bank account not found");
                const sellerAmount = order.financials.itemPrice - order.financials.platformFee;
                const platformAmount = order.financials.platformFee;
                // Create PAYMENT_RELEASE transaction for seller
                yield Transaction_1.Transaction.create({
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
                yield Transaction_1.Transaction.create({
                    userId: sellerId,
                    type: "PLATFORM_FEE",
                    amount: platformAmount,
                    status: "COMPLETED",
                    relatedOrderId: order._id,
                    description: `Platform fee for order #${order._id}`,
                });
                // Update seller wallet
                seller.wallet.balance += sellerAmount;
                yield seller.save();
                console.log(`Payment released for order ${orderId}: seller ${sellerAmount}, platform ${platformAmount}`);
            }
            catch (err) {
                console.error("Payment release error:", err.message);
                throw err;
            }
        });
    }
    /**
     * Refund payment to buyer
     */
    static refundPayment(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const order = yield Order_1.Order.findById(orderId);
                if (!order)
                    throw new Error("Order not found");
                const buyer = yield User_1.User.findById(order.buyerId);
                if (!buyer)
                    throw new Error("Buyer not found");
                // Find the original PAYMENT_HOLD transaction
                const holdTransaction = yield Transaction_1.Transaction.findOne({
                    relatedOrderId: order._id,
                    type: "PAYMENT_HOLD",
                    status: "COMPLETED",
                });
                // Try to cancel payment link on PayOS (if not yet paid out)
                if ((holdTransaction === null || holdTransaction === void 0 ? void 0 : holdTransaction.metadata) && holdTransaction.metadata.orderCode) {
                    try {
                        yield payOS.paymentRequests.cancel(holdTransaction.metadata.orderCode, "Order refunded");
                        console.log(`PayOS payment link cancelled for order ${orderId}`);
                    }
                    catch (err) {
                        console.warn("PayOS cancel failed:", err.message);
                    }
                }
                // Create REFUND transaction record
                yield Transaction_1.Transaction.create({
                    userId: order.buyerId,
                    type: "REFUND",
                    amount: order.financials.totalAmount,
                    status: "COMPLETED",
                    relatedOrderId: order._id,
                    description: `Refund for order #${order._id}`,
                    paymentGatewayRef: holdTransaction === null || holdTransaction === void 0 ? void 0 : holdTransaction.paymentGatewayRef,
                    metadata: {
                        escrowStatus: "REFUNDED",
                        refundedAt: new Date(),
                        refundMethod: "WALLET_CREDIT",
                        originalPaymentRef: holdTransaction === null || holdTransaction === void 0 ? void 0 : holdTransaction.paymentGatewayRef,
                    },
                });
                // Update original PAYMENT_HOLD transaction metadata
                if (holdTransaction) {
                    holdTransaction.metadata = Object.assign(Object.assign({}, holdTransaction.metadata), { escrowStatus: "REFUNDED", refundedAt: new Date() });
                    yield holdTransaction.save();
                }
                // Credit buyer wallet
                buyer.wallet.balance += order.financials.totalAmount;
                yield buyer.save();
                console.log(`Refund processed for order ${orderId}: ${order.financials.totalAmount} VND`);
            }
            catch (err) {
                console.error("Refund error:", err.message);
                throw err;
            }
        });
    }
    /**
     * Auto-trigger inspection after payment is locked
     * Assigns nearest available inspector and starts inspection
     */
    static autoTriggerInspection(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const order = yield Order_1.Order.findById(orderId).populate("listingId");
                if (!order) {
                    console.warn(`Order ${orderId} not found for auto-inspection`);
                    return;
                }
                // Check if inspection is required
                const listing = order.listingId;
                if (!listing || !listing.inspectionRequired) {
                    console.log(`Order ${orderId} does not require inspection`);
                    return;
                }
                // Find nearest available inspector
                const inspector = yield this.findNearestInspector(order);
                if (!inspector) {
                    console.warn(`No available inspector found for order ${orderId}`);
                    // Keep order in ESCROW_LOCKED, admin can manually assign later
                    return;
                }
                // Assign inspector and start inspection
                order.inspectorId = inspector._id;
                yield order.save();
                yield OrderService_1.OrderService.startInspection(orderId, inspector._id.toString());
                console.log(`Inspection auto-started for order ${orderId} with inspector ${inspector._id}`);
            }
            catch (error) {
                console.error(`Error auto-triggering inspection for order ${orderId}:`, error);
                // Don't throw - payment is already locked, inspection can be assigned manually
            }
        });
    }
    /**
     * Find nearest available inspector
     * For now, returns first available inspector. In production, use geolocation matching.
     */
    static findNearestInspector(order) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Find available inspectors (active, not banned)
                const inspectors = yield User_1.User.find({
                    role: User_1.UserRole.INSPECTOR,
                    isActive: true,
                }).limit(1);
                return inspectors.length > 0 ? inspectors[0] : null;
            }
            catch (error) {
                console.error("Error finding inspector:", error);
                return null;
            }
        });
    }
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=PaymentService.js.map