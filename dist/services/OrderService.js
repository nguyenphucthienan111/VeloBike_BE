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
exports.OrderService = void 0;
const Order_1 = require("../models/Order");
const Listing_1 = require("../models/Listing");
const User_1 = require("../models/User");
const mongoose_1 = require("mongoose");
const NotificationService_1 = require("./NotificationService");
class OrderService {
    /**
     * Validate and transition order status
     */
    static transitionStatus(orderId, newStatus, actorId, actorRole, note) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield Order_1.Order.findById(orderId);
            if (!order) {
                throw new Error("Order not found");
            }
            // Validate transition
            const validTransitions = this.VALID_TRANSITIONS[order.status];
            if (!validTransitions.includes(newStatus)) {
                throw new Error(`Invalid transition from ${order.status} to ${newStatus}`);
            }
            // Update order status
            order.status = newStatus;
            order.timeline.push({
                status: newStatus,
                timestamp: new Date(),
                actorId: actorId && mongoose_1.Types.ObjectId.isValid(actorId) ? new mongoose_1.Types.ObjectId(actorId) : undefined,
                note,
            });
            yield order.save();
            // Emit event for listeners (email, notification, etc.)
            this.emitOrderStatusChanged(order);
            return order;
        });
    }
    // Instance method compatibility for existing code using new OrderService().transitionState(...)
    transitionState(orderId, newStatus, actorId, actorRole, note) {
        return __awaiter(this, void 0, void 0, function* () {
            return OrderService.transitionStatus(orderId, newStatus, actorId, actorRole, note);
        });
    }
    /**
     * Create new order from listing
     */
    static createOrder(listingId_1, buyerId_1) {
        return __awaiter(this, arguments, void 0, function* (listingId, buyerId, inspectionRequired = true, inspectionFee = 500000) {
            const listing = yield Listing_1.Listing.findById(listingId);
            if (!listing) {
                throw new Error("Listing not found");
            }
            if (listing.status === "SOLD") {
                throw new Error("This item is already sold");
            }
            const shippingFee = 150000; // Example: VND
            const platformFee = Math.ceil(listing.pricing.amount * 0.1); // 10%
            const order = new Order_1.Order({
                listingId: new mongoose_1.Types.ObjectId(listingId),
                buyerId: new mongoose_1.Types.ObjectId(buyerId),
                sellerId: listing.sellerId,
                status: Order_1.OrderStatus.CREATED,
                financials: {
                    itemPrice: listing.pricing.amount,
                    inspectionFee: inspectionRequired ? inspectionFee : 0,
                    shippingFee,
                    platformFee,
                    totalAmount: listing.pricing.amount +
                        (inspectionRequired ? inspectionFee : 0) +
                        shippingFee,
                },
                timeline: [
                    {
                        status: Order_1.OrderStatus.CREATED,
                        timestamp: new Date(),
                        actorId: new mongoose_1.Types.ObjectId(buyerId),
                        note: "Order created",
                    },
                ],
            });
            yield order.save();
            return order;
        });
    }
    /**
     * Lock escrow (buyer paid)
     */
    static lockEscrow(orderId, paymentGatewayId) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield Order_1.Order.findById(orderId);
            if (!order) {
                throw new Error("Order not found");
            }
            return this.transitionStatus(orderId, Order_1.OrderStatus.ESCROW_LOCKED, order.buyerId.toString(), undefined, `Payment received: ${paymentGatewayId}`);
        });
    }
    /**
     * Start inspection
     */
    static startInspection(orderId, inspectorId) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield Order_1.Order.findById(orderId);
            if (!order) {
                throw new Error("Order not found");
            }
            order.inspectorId = new mongoose_1.Types.ObjectId(inspectorId);
            yield order.save();
            return this.transitionStatus(orderId, Order_1.OrderStatus.IN_INSPECTION, inspectorId, undefined, "Inspection started");
        });
    }
    /**
     * Complete inspection - PASS
     */
    static inspectionPassed(orderId, inspectorId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.transitionStatus(orderId, Order_1.OrderStatus.INSPECTION_PASSED, inspectorId, undefined, "Inspection passed");
        });
    }
    /**
     * Complete inspection - FAIL
     */
    static inspectionFailed(orderId, inspectorId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.transitionStatus(orderId, Order_1.OrderStatus.INSPECTION_FAILED, inspectorId, undefined, "Inspection failed");
        });
    }
    /**
     * Mark order as shipped
     */
    static markShipped(orderId, sellerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.transitionStatus(orderId, Order_1.OrderStatus.SHIPPING, sellerId, undefined, "Item shipped");
        });
    }
    /**
     * Mark order as delivered
     */
    static markDelivered(orderId, buyerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.transitionStatus(orderId, Order_1.OrderStatus.DELIVERED, buyerId, undefined, "Item received");
        });
    }
    /**
     * Complete order and release payment
     */
    static completeOrder(orderId, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield Order_1.Order.findById(orderId);
            if (!order) {
                throw new Error("Order not found");
            }
            // 1. Transition Status
            yield this.transitionStatus(orderId, Order_1.OrderStatus.COMPLETED, adminId, undefined, "Payment released to seller");
            // 2. Distribute Funds (Split Payment)
            const { itemPrice, platformFee, inspectionFee } = order.financials;
            const sellerPayout = itemPrice - platformFee;
            // Credit Seller
            yield User_1.User.findByIdAndUpdate(order.sellerId, {
                $inc: { "wallet.balance": sellerPayout },
            });
            // Credit Inspector (if applicable)
            if (order.inspectorId && inspectionFee > 0) {
                yield User_1.User.findByIdAndUpdate(order.inspectorId, {
                    $inc: { "wallet.balance": inspectionFee },
                });
            }
            // Note: Platform Fee and Shipping Fee are retained by the Platform (Company Account)
            // 3. Mark listing as SOLD
            yield Listing_1.Listing.findByIdAndUpdate(order.listingId, { status: "SOLD" });
            // Return updated order
            return yield Order_1.Order.findById(orderId);
        });
    }
    /**
     * Refund order
     */
    static refundOrder(orderId, adminId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.transitionStatus(orderId, Order_1.OrderStatus.REFUNDED, adminId, undefined, `Refunded: ${reason}`);
        });
    }
    /**
     * Open dispute
     */
    static openDispute(orderId, claimantId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.transitionStatus(orderId, Order_1.OrderStatus.DISPUTED, claimantId, undefined, "Dispute opened");
        });
    }
    /**
     * Get order timeline
     */
    static getOrderTimeline(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield Order_1.Order.findById(orderId)
                .populate("timeline.actorId", "fullName role")
                .exec();
            if (!order) {
                throw new Error("Order not found");
            }
            return order.timeline;
        });
    }
    /**
     * Emit order status changed event
     * In production, this would trigger email/push notifications
     */
    static emitOrderStatusChanged(order) {
        return __awaiter(this, void 0, void 0, function* () {
            // Notify Buyer
            yield NotificationService_1.NotificationService.sendNotification(order.buyerId.toString(), "Order Update", `Your order #${order._id} status is now ${order.status}`, { orderId: order._id.toString(), status: order.status });
            // Notify Seller
            yield NotificationService_1.NotificationService.sendNotification(order.sellerId.toString(), "Order Update", `Order #${order._id} status is now ${order.status}`, { orderId: order._id.toString(), status: order.status });
            console.log(`[ORDER EVENT] Order ${order._id} status changed to ${order.status}`);
        });
    }
}
exports.OrderService = OrderService;
/**
 * Finite State Machine - Define valid transitions
 */
OrderService.VALID_TRANSITIONS = {
    [Order_1.OrderStatus.CREATED]: [
        Order_1.OrderStatus.ESCROW_LOCKED,
        Order_1.OrderStatus.REFUNDED,
        Order_1.OrderStatus.CANCELLED,
        Order_1.OrderStatus.DISPUTED, // Allow dispute from created state
    ],
    [Order_1.OrderStatus.ESCROW_LOCKED]: [
        Order_1.OrderStatus.IN_INSPECTION,
        Order_1.OrderStatus.REFUNDED,
    ],
    [Order_1.OrderStatus.IN_INSPECTION]: [
        Order_1.OrderStatus.INSPECTION_PASSED,
        Order_1.OrderStatus.INSPECTION_FAILED,
        Order_1.OrderStatus.DISPUTED,
    ],
    [Order_1.OrderStatus.INSPECTION_PASSED]: [
        Order_1.OrderStatus.SHIPPING,
        Order_1.OrderStatus.DISPUTED,
    ],
    [Order_1.OrderStatus.INSPECTION_FAILED]: [
        Order_1.OrderStatus.REFUNDED,
        Order_1.OrderStatus.DISPUTED,
    ],
    [Order_1.OrderStatus.SHIPPING]: [Order_1.OrderStatus.DELIVERED, Order_1.OrderStatus.DISPUTED],
    [Order_1.OrderStatus.DELIVERED]: [Order_1.OrderStatus.COMPLETED, Order_1.OrderStatus.DISPUTED],
    [Order_1.OrderStatus.COMPLETED]: [Order_1.OrderStatus.DISPUTED],
    [Order_1.OrderStatus.DISPUTED]: [Order_1.OrderStatus.REFUNDED, Order_1.OrderStatus.COMPLETED],
    [Order_1.OrderStatus.REFUNDED]: [],
    [Order_1.OrderStatus.CANCELLED]: [],
};
//# sourceMappingURL=OrderService.js.map