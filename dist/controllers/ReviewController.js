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
exports.ReviewController = void 0;
const Review_1 = require("../models/Review");
const Order_1 = require("../models/Order");
const User_1 = require("../models/User");
const mongoose_1 = __importDefault(require("mongoose"));
class ReviewController {
    // POST /api/reviews
    static createReview(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId, rating, comment } = req.body;
                const reviewerId = req.user.id;
                // Validate input
                if (!rating || rating < 1 || rating > 5) {
                    return res.status(400).json({ success: false, message: "Invalid rating" });
                }
                // Check order
                const order = yield Order_1.Order.findById(orderId);
                if (!order) {
                    return res.status(404).json({ success: false, message: "Order not found" });
                }
                // Check authorization (Only Buyer can review Seller)
                // Note: In some systems seller can also review buyer, but requirement says "Buyer assess seller"
                if (order.buyerId.toString() !== reviewerId) {
                    return res.status(403).json({ success: false, message: "Only buyer can review" });
                }
                // Check if order is completed
                if (order.status !== "COMPLETED" && order.status !== "DELIVERED") {
                    return res.status(400).json({ success: false, message: "Can only review completed/delivered orders" });
                }
                // Check if already reviewed
                const existing = yield Review_1.Review.findOne({ orderId, reviewerId });
                if (existing) {
                    return res.status(400).json({ success: false, message: "Review already exists" });
                }
                const review = new Review_1.Review({
                    orderId,
                    reviewerId,
                    revieweeId: order.sellerId,
                    rating,
                    comment,
                });
                yield review.save();
                // Update Seller Reputation
                yield ReviewController.updateUserReputation(order.sellerId.toString());
                res.status(201).json({ success: true, data: review });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // Helper: Recalculate and update user reputation
    static updateUserReputation(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield Review_1.Review.aggregate([
                    { $match: { revieweeId: new mongoose_1.default.Types.ObjectId(userId) } },
                    {
                        $group: {
                            _id: null,
                            averageRating: { $avg: "$rating" },
                            count: { $sum: 1 },
                        },
                    },
                ]);
                if (stats.length > 0) {
                    yield User_1.User.findByIdAndUpdate(userId, {
                        reputation: {
                            score: Math.round(stats[0].averageRating * 10) / 10,
                            reviewCount: stats[0].count,
                        },
                    });
                }
            }
            catch (error) {
                console.error("Error updating reputation:", error);
            }
        });
    }
    // GET /api/reviews/:userId
    static getUserReviews(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const { page = 1, limit = 10 } = req.query;
                const reviews = yield Review_1.Review.find({ revieweeId: userId })
                    .populate("reviewerId", "fullName avatar")
                    .populate("orderId", "listingId")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Review_1.Review.countDocuments({ revieweeId: userId });
                res.json({
                    success: true,
                    data: reviews,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / Number(limit))
                    }
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
}
exports.ReviewController = ReviewController;
//# sourceMappingURL=ReviewController.js.map