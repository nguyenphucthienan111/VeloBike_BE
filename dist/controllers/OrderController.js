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
exports.OrderEscrowController = exports.OrderController = void 0;
const Order_1 = require("../models/Order");
const Listing_1 = require("../models/Listing");
const OrderService_1 = require("../services/OrderService");
const User_1 = require("../models/User");
class OrderController {
    // POST /api/orders
    // Create a new order (Buyer)
    static create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const buyerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!buyerId) {
                    return res
                        .status(401)
                        .json({ success: false, message: "Unauthorized" });
                }
                const { listingId, inspectionRequired = true } = req.body;
                if (!listingId) {
                    return res
                        .status(400)
                        .json({ success: false, message: "listingId is required" });
                }
                // Check if listing exists and is available
                const listing = yield Listing_1.Listing.findById(listingId);
                if (!listing) {
                    return res
                        .status(404)
                        .json({ success: false, message: "Listing not found" });
                }
                if (listing.status === "SOLD") {
                    return res
                        .status(400)
                        .json({ success: false, message: "This item is already sold" });
                }
                if (listing.sellerId.toString() === buyerId) {
                    return res
                        .status(400)
                        .json({ success: false, message: "Cannot buy your own listing" });
                }
                // Create order using OrderService
                const order = yield OrderService_1.OrderService.createOrder(listingId, buyerId, inspectionRequired);
                res.status(201).json({
                    success: true,
                    data: order,
                    message: "Order created successfully",
                });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/orders/:id
    // Get order details
    static getById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { id } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                const order = yield Order_1.Order.findById(id)
                    .populate("listingId")
                    .populate("buyerId", "fullName email phone")
                    .populate("sellerId", "fullName email phone")
                    .populate("inspectorId", "fullName");
                if (!order) {
                    return res
                        .status(404)
                        .json({ success: false, message: "Order not found" });
                }
                // Check authorization: Buyer, Seller, Inspector, or Admin can view
                const isAuthorized = userRole === User_1.UserRole.ADMIN ||
                    order.buyerId.toString() === userId ||
                    order.sellerId.toString() === userId ||
                    (order.inspectorId && order.inspectorId.toString() === userId);
                if (!isAuthorized) {
                    return res
                        .status(403)
                        .json({
                        success: false,
                        message: "Not authorized to view this order",
                    });
                }
                res.json({ success: true, data: order });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/orders
    // Get user's orders (Buyer or Seller)
    static getMyOrders(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res
                        .status(401)
                        .json({ success: false, message: "Unauthorized" });
                }
                const { status, role, page = 1, limit = 20 } = req.query;
                // Build query based on role
                let query = {};
                if (role === "buyer") {
                    query.buyerId = userId;
                }
                else if (role === "seller") {
                    query.sellerId = userId;
                }
                else {
                    // Default: show orders where user is buyer or seller
                    query.$or = [{ buyerId: userId }, { sellerId: userId }];
                }
                if (status) {
                    query.status = status;
                }
                const orders = yield Order_1.Order.find(query)
                    .populate("listingId", "title generalInfo pricing media")
                    .populate("buyerId", "fullName")
                    .populate("sellerId", "fullName")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Order_1.Order.countDocuments(query);
                res.json({
                    success: true,
                    data: orders,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / Number(limit)),
                    },
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/orders/:id/timeline
    // Get order timeline
    static getTimeline(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { id } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const order = yield Order_1.Order.findById(id);
                if (!order) {
                    return res
                        .status(404)
                        .json({ success: false, message: "Order not found" });
                }
                // Check authorization
                const isAuthorized = order.buyerId.toString() === userId ||
                    order.sellerId.toString() === userId ||
                    ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === User_1.UserRole.ADMIN;
                if (!isAuthorized) {
                    return res
                        .status(403)
                        .json({ success: false, message: "Not authorized" });
                }
                const timeline = yield OrderService_1.OrderService.getOrderTimeline(id);
                res.json({ success: true, data: timeline });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // PUT /api/orders/:id/status
    // Update order status (for Seller/Buyer specific actions)
    static updateStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { id } = req.params;
                const { status, note } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                const order = yield Order_1.Order.findById(id);
                if (!order) {
                    return res
                        .status(404)
                        .json({ success: false, message: "Order not found" });
                }
                // Check authorization and validate status transitions
                let allowedStatuses = [];
                if (userRole === User_1.UserRole.SELLER &&
                    order.sellerId.toString() === userId) {
                    // Seller can mark as SHIPPING
                    if (status === Order_1.OrderStatus.SHIPPING &&
                        order.status === Order_1.OrderStatus.INSPECTION_PASSED) {
                        allowedStatuses = [Order_1.OrderStatus.SHIPPING];
                    }
                }
                else if (userRole === User_1.UserRole.BUYER &&
                    order.buyerId.toString() === userId) {
                    // Buyer can mark as DELIVERED
                    if (status === Order_1.OrderStatus.DELIVERED &&
                        order.status === Order_1.OrderStatus.SHIPPING) {
                        allowedStatuses = [Order_1.OrderStatus.DELIVERED];
                    }
                    // Buyer can CANCEL if created
                    if (status === Order_1.OrderStatus.CANCELLED &&
                        order.status === Order_1.OrderStatus.CREATED) {
                        allowedStatuses = [Order_1.OrderStatus.CANCELLED];
                    }
                }
                else if (userRole === User_1.UserRole.SELLER &&
                    order.sellerId.toString() === userId) {
                    // Seller can CANCEL (Reject) if created
                    if (status === Order_1.OrderStatus.CANCELLED &&
                        order.status === Order_1.OrderStatus.CREATED) {
                        allowedStatuses = [Order_1.OrderStatus.CANCELLED];
                    }
                }
                else if (userRole === User_1.UserRole.ADMIN) {
                    // Admin can do more
                    allowedStatuses = [Order_1.OrderStatus.COMPLETED, Order_1.OrderStatus.REFUNDED];
                }
                if (!allowedStatuses.includes(status)) {
                    return res.status(403).json({
                        success: false,
                        message: `Not authorized to change status to ${status}`,
                    });
                }
                const orderService = new OrderService_1.OrderService();
                const updatedOrder = yield orderService.transitionState(id, status, userId, userRole, note);
                res.json({ success: true, data: updatedOrder });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
}
exports.OrderController = OrderController;
// Import Transaction model for escrow status
const Transaction_1 = require("../models/Transaction");
class OrderEscrowController {
    /**
     * GET /api/orders/:id/escrow-status
     * Get escrow status and transaction history for an order
     */
    static getEscrowStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { id } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
                const order = yield Order_1.Order.findById(id)
                    .populate("buyerId", "fullName")
                    .populate("sellerId", "fullName");
                if (!order) {
                    return res.status(404).json({ success: false, message: "Order not found" });
                }
                // Check authorization
                const isAuthorized = userRole === User_1.UserRole.ADMIN ||
                    order.buyerId.toString() === userId ||
                    order.sellerId.toString() === userId;
                if (!isAuthorized) {
                    return res.status(403).json({ success: false, message: "Not authorized" });
                }
                // Get all transactions related to this order
                const transactions = yield Transaction_1.Transaction.find({ relatedOrderId: id })
                    .sort({ createdAt: 1 });
                // Determine escrow status
                const holdTransaction = transactions.find(t => t.type === "PAYMENT_HOLD");
                const releaseTransaction = transactions.find(t => t.type === "PAYMENT_RELEASE");
                const refundTransaction = transactions.find(t => t.type === "REFUND");
                let escrowStatus = "NOT_PAID";
                if (refundTransaction) {
                    escrowStatus = "REFUNDED";
                }
                else if (releaseTransaction) {
                    escrowStatus = "RELEASED";
                }
                else if (holdTransaction) {
                    escrowStatus = "LOCKED";
                }
                // Calculate amounts
                const { itemPrice, platformFee, inspectionFee, shippingFee, totalAmount } = order.financials;
                const sellerWillReceive = itemPrice - platformFee;
                res.json({
                    success: true,
                    data: {
                        orderId: id,
                        orderStatus: order.status,
                        escrowStatus,
                        financials: {
                            totalAmount,
                            itemPrice,
                            platformFee,
                            inspectionFee,
                            shippingFee,
                            sellerWillReceive,
                            platformWillReceive: platformFee + shippingFee,
                            inspectorWillReceive: inspectionFee,
                        },
                        timeline: {
                            paidAt: (holdTransaction === null || holdTransaction === void 0 ? void 0 : holdTransaction.createdAt) || null,
                            releasedAt: (releaseTransaction === null || releaseTransaction === void 0 ? void 0 : releaseTransaction.createdAt) || null,
                            refundedAt: (refundTransaction === null || refundTransaction === void 0 ? void 0 : refundTransaction.createdAt) || null,
                        },
                        transactions: transactions.map(t => ({
                            id: t._id,
                            type: t.type,
                            amount: t.amount,
                            status: t.status,
                            description: t.description,
                            createdAt: t.createdAt,
                            paymentGatewayRef: t.paymentGatewayRef,
                        })),
                        message: this.getEscrowMessage(escrowStatus, order.status),
                    },
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    /**
     * Helper: Get human-readable escrow message
     */
    static getEscrowMessage(escrowStatus, orderStatus) {
        switch (escrowStatus) {
            case "NOT_PAID":
                return "Đơn hàng chưa được thanh toán. Tiền chưa vào hệ thống.";
            case "LOCKED":
                return "Tiền đang được giữ an toàn trên PayOS. Seller sẽ nhận tiền sau khi đơn hàng hoàn tất.";
            case "RELEASED":
                return "Tiền đã được chuyển cho Seller. Giao dịch hoàn tất.";
            case "REFUNDED":
                return "Tiền đã được hoàn lại cho Buyer.";
            default:
                return "";
        }
    }
}
exports.OrderEscrowController = OrderEscrowController;
//# sourceMappingURL=OrderController.js.map