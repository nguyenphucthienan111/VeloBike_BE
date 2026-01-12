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
exports.AdminController = void 0;
const User_1 = require("../models/User");
const Listing_1 = require("../models/Listing");
const Order_1 = require("../models/Order");
const Dispute_1 = require("../models/Dispute");
const Review_1 = require("../models/Review");
class AdminController {
    /**
     * Get dashboard statistics
     * GET /api/admin/dashboard
     */
    static getDashboard(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const stats = yield Promise.all([
                    User_1.User.countDocuments(),
                    Listing_1.Listing.countDocuments(),
                    Order_1.Order.countDocuments(),
                    Order_1.Order.aggregate([
                        { $match: { status: Order_1.OrderStatus.COMPLETED } },
                        { $group: { _id: null, totalRevenue: { $sum: "$financials.platformFee" } } },
                    ]),
                    Dispute_1.Dispute.countDocuments({ status: "OPEN" }),
                ]);
                res.status(200).json({
                    success: true,
                    data: {
                        totalUsers: stats[0],
                        totalListings: stats[1],
                        totalOrders: stats[2],
                        totalRevenue: ((_a = stats[3][0]) === null || _a === void 0 ? void 0 : _a.totalRevenue) || 0,
                        openDisputes: stats[4],
                    },
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error fetching dashboard", error: error.message });
            }
        });
    }
    /**
     * Get all users
     * GET /api/admin/users
     */
    static getAllUsers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { role, status, page = 1, limit = 20 } = req.query;
                const query = {};
                if (role)
                    query.role = role;
                if (status)
                    query.isActive = status === "active";
                const users = yield User_1.User.find(query)
                    .select("-passwordHash")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield User_1.User.countDocuments(query);
                res.status(200).json({
                    success: true,
                    data: users,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / Number(limit)),
                    },
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error fetching users", error: error.message });
            }
        });
    }
    /**
     * Update user KYC status
     * PUT /api/admin/users/:userId/kyc
     */
    static updateUserKyc(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const { kycStatus } = req.body;
                if (!Object.values(User_1.KycStatus).includes(kycStatus)) {
                    return res.status(400).json({ success: false, message: "Invalid KYC status" });
                }
                const user = yield User_1.User.findByIdAndUpdate(userId, { kycStatus, "kycData.verifiedAt": new Date() }, { new: true }).select("-passwordHash");
                if (!user) {
                    return res.status(404).json({ success: false, message: "User not found" });
                }
                res.status(200).json({
                    success: true,
                    message: "KYC status updated",
                    data: user,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error updating KYC", error: error.message });
            }
        });
    }
    /**
     * Ban/Suspend user
     * PUT /api/admin/users/:userId/status
     */
    static updateUserStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const { isActive } = req.body;
                const user = yield User_1.User.findByIdAndUpdate(userId, { isActive }, { new: true }).select("-passwordHash");
                if (!user) {
                    return res.status(404).json({ success: false, message: "User not found" });
                }
                res.status(200).json({
                    success: true,
                    message: `User ${isActive ? "activated" : "deactivated"}`,
                    data: user,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error updating user status", error: error.message });
            }
        });
    }
    /**
     * Get all listings for moderation
     * GET /api/admin/listings
     */
    static getAllListings(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { status, page = 1, limit = 20 } = req.query;
                const query = {};
                if (status)
                    query.status = status;
                const listings = yield Listing_1.Listing.find(query)
                    .populate("sellerId", "fullName email reputation")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Listing_1.Listing.countDocuments(query);
                res.status(200).json({
                    success: true,
                    data: listings,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / Number(limit)),
                    },
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error fetching listings", error: error.message });
            }
        });
    }
    /**
     * Approve/Reject listing (SRS BikeMarket requirement)
     * PUT /api/admin/listings/:listingId/status
     */
    static updateListingStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { listingId } = req.params;
                const { status, rejectionReason } = req.body;
                // SRS BikeMarket: Admin can approve (PUBLISHED) or reject (REJECTED)
                const allowedStatuses = ["PUBLISHED", "REJECTED"];
                if (!allowedStatuses.includes(status)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid status. Admin can only PUBLISHED or REJECTED listings per SRS BikeMarket"
                    });
                }
                const updateData = { status };
                if (status === "REJECTED" && rejectionReason) {
                    updateData.rejectionReason = rejectionReason;
                }
                const listing = yield Listing_1.Listing.findByIdAndUpdate(listingId, updateData, { new: true }).populate("sellerId", "fullName email");
                if (!listing) {
                    return res.status(404).json({ success: false, message: "Listing not found" });
                }
                // TODO: Send notification to seller about listing approval/rejection
                const message = status === "PUBLISHED"
                    ? "Listing approved and published per SRS BikeMarket workflow"
                    : "Listing rejected per SRS BikeMarket workflow";
                res.status(200).json({
                    success: true,
                    message,
                    data: listing,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error updating listing", error: error.message });
            }
        });
    }
    /**
     * Get all orders
     * GET /api/admin/orders
     */
    static getAllOrders(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { status, page = 1, limit = 20 } = req.query;
                const query = {};
                if (status)
                    query.status = status;
                const orders = yield Order_1.Order.find(query)
                    .populate("buyerId", "fullName email")
                    .populate("sellerId", "fullName email")
                    .populate("listingId", "title")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Order_1.Order.countDocuments(query);
                res.status(200).json({
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
                res
                    .status(500)
                    .json({ success: false, message: "Error fetching orders", error: error.message });
            }
        });
    }
    /**
     * Get system reports & analytics
     * GET /api/admin/analytics
     */
    static getAnalytics(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { period = "month" } = req.query; // day, week, month, year
                const dateFilter = this.getDateFilter(period);
                const analytics = yield Promise.all([
                    Order_1.Order.countDocuments({ createdAt: { $gte: dateFilter } }),
                    Order_1.Order.aggregate([
                        { $match: { createdAt: { $gte: dateFilter } } },
                        { $group: { _id: null, totalRevenue: { $sum: "$financials.platformFee" } } },
                    ]),
                    User_1.User.countDocuments({
                        role: User_1.UserRole.SELLER,
                        createdAt: { $gte: dateFilter },
                    }),
                    Review_1.Review.countDocuments({ createdAt: { $gte: dateFilter } }),
                ]);
                res.status(200).json({
                    success: true,
                    data: {
                        period,
                        orders: analytics[0],
                        revenue: ((_a = analytics[1][0]) === null || _a === void 0 ? void 0 : _a.totalRevenue) || 0,
                        newSellers: analytics[2],
                        reviews: analytics[3],
                    },
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error fetching analytics", error: error.message });
            }
        });
    }
    /**
     * Manage platform settings/categories
     * This would typically interact with a Settings model
     */
    static getSettings(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // TODO: Implement settings model and retrieval
                res.status(200).json({
                    success: true,
                    data: {
                        platformFeePercentage: 10,
                        inspectionFee: 500000,
                        shippingFee: 150000,
                        minimumBikePrice: 500000,
                        maximumBikePrice: 500000000,
                    },
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error fetching settings", error: error.message });
            }
        });
    }
    /**
     * Update platform settings
     */
    static updateSettings(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const settings = req.body;
                // TODO: Save to database
                res.status(200).json({
                    success: true,
                    message: "Settings updated",
                    data: settings,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error updating settings", error: error.message });
            }
        });
    }
    /**
     * Release payout to seller (Admin only)
     * PUT /api/admin/orders/:id/payout
     */
    static releasePayout(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { OrderService } = yield Promise.resolve().then(() => __importStar(require("../services/OrderService")));
                const order = yield Order_1.Order.findById(id).populate("sellerId");
                if (!order) {
                    return res.status(404).json({ success: false, message: "Order not found" });
                }
                if (order.status !== Order_1.OrderStatus.DELIVERED) {
                    return res.status(400).json({
                        success: false,
                        message: "Order must be in DELIVERED status to release payout",
                    });
                }
                // Complete the order (handles wallet update and status transition)
                yield OrderService.completeOrder(id, req.user.id);
                res.status(200).json({
                    success: true,
                    message: "Payout released and order completed",
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    /**
     * Get all inspectors
     * GET /api/admin/inspectors
     */
    static getAllInspectors(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { isActive, page = 1, limit = 20 } = req.query;
                const query = { role: User_1.UserRole.INSPECTOR };
                if (isActive !== undefined) {
                    query.isActive = isActive === "true";
                }
                const inspectors = yield User_1.User.find(query)
                    .select("-passwordHash")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield User_1.User.countDocuments(query);
                res.status(200).json({
                    success: true,
                    data: inspectors,
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
    /**
     * Helper: Get date filter based on period
     */
    static getDateFilter(period) {
        const now = new Date();
        const date = new Date(now);
        switch (period) {
            case "day":
                date.setDate(date.getDate() - 1);
                break;
            case "week":
                date.setDate(date.getDate() - 7);
                break;
            case "month":
                date.setMonth(date.getMonth() - 1);
                break;
            case "year":
                date.setFullYear(date.getFullYear() - 1);
                break;
            default:
                date.setMonth(date.getMonth() - 1);
        }
        return date;
    }
}
exports.AdminController = AdminController;
//# sourceMappingURL=AdminController.js.map