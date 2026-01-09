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
    /**
     * Create review after order completion
     * POST /api/reviews
     */
    static createReview(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { orderId, rating, comment, categories, type } = req.body;
                const reviewerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                // Validate order exists and is completed
                const order = yield Order_1.Order.findById(orderId);
                if (!order) {
                    return res.status(404).json({ success: false, message: "Order not found" });
                }
                if (order.status !== "COMPLETED") {
                    return res
                        .status(400)
                        .json({ success: false, message: "Can only review completed orders" });
                }
                // Determine reviewee based on type
                const revieweeId = type === "SELLER" ? order.sellerId : order.buyerId;
                // Check if review already exists
                const existingReview = yield Review_1.Review.findOne({
                    orderId,
                    reviewerId,
                    type,
                });
                if (existingReview) {
                    return res
                        .status(400)
                        .json({ success: false, message: "You have already reviewed this order" });
                }
                const review = new Review_1.Review({
                    orderId,
                    reviewerId: new mongoose_1.default.Types.ObjectId(reviewerId),
                    revieweeId,
                    rating,
                    comment,
                    categories: categories || {},
                    type,
                });
                yield review.save();
                // Update user reputation
                const averageRating = yield Review_1.Review.aggregate([
                    { $match: { revieweeId } },
                    { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
                ]);
                if (averageRating.length > 0) {
                    yield User_1.User.findByIdAndUpdate(revieweeId, {
                        "reputation.score": averageRating[0].avgRating,
                        "reputation.reviewCount": averageRating[0].count,
                    });
                }
                res.status(201).json({
                    success: true,
                    message: "Review created successfully",
                    data: review,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error creating review", error: error.message });
            }
        });
    }
    /**
     * Get reviews for a user
     * GET /api/reviews/user/:userId
     */
    static getUserReviews(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId } = req.params;
                const { type, page = 1, limit = 10 } = req.query;
                const query = { revieweeId: userId };
                if (type) {
                    query.type = type;
                }
                const reviews = yield Review_1.Review.find(query)
                    .populate("reviewerId", "fullName avatar reputation")
                    .populate("orderId", "listingId")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Review_1.Review.countDocuments(query);
                res.status(200).json({
                    success: true,
                    data: reviews,
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
                    .json({ success: false, message: "Error fetching reviews", error: error.message });
            }
        });
    }
    /**
     * Get seller reviews (average)
     * GET /api/reviews/seller/:sellerId/summary
     */
    static getSellerSummary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { sellerId } = req.params;
                const summary = yield Review_1.Review.aggregate([
                    { $match: { revieweeId: new mongoose_1.default.Types.ObjectId(sellerId) } },
                    {
                        $group: {
                            _id: null,
                            averageRating: { $avg: "$rating" },
                            totalReviews: { $sum: 1 },
                            ratingDistribution: {
                                $push: "$rating",
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            averageRating: { $round: ["$averageRating", 1] },
                            totalReviews: 1,
                            distribution: {
                                $reduce: {
                                    input: "$ratingDistribution",
                                    initialValue: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
                                    in: {
                                        "1": {
                                            $cond: [{ $eq: ["$$this", 1] }, { $add: ["$$value.1", 1] }, "$$value.1"],
                                        },
                                        "2": {
                                            $cond: [{ $eq: ["$$this", 2] }, { $add: ["$$value.2", 1] }, "$$value.2"],
                                        },
                                        "3": {
                                            $cond: [{ $eq: ["$$this", 3] }, { $add: ["$$value.3", 1] }, "$$value.3"],
                                        },
                                        "4": {
                                            $cond: [{ $eq: ["$$this", 4] }, { $add: ["$$value.4", 1] }, "$$value.4"],
                                        },
                                        "5": {
                                            $cond: [{ $eq: ["$$this", 5] }, { $add: ["$$value.5", 1] }, "$$value.5"],
                                        },
                                    },
                                },
                            },
                        },
                    },
                ]);
                res.status(200).json({
                    success: true,
                    data: summary.length > 0 ? summary[0] : { averageRating: 0, totalReviews: 0 },
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error fetching summary", error: error.message });
            }
        });
    }
    /**
     * Get reviews for an order
     * GET /api/reviews/order/:orderId
     */
    static getOrderReviews(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                const reviews = yield Review_1.Review.find({ orderId })
                    .populate("reviewerId", "fullName avatar")
                    .populate("revieweeId", "fullName avatar");
                res.status(200).json({
                    success: true,
                    data: reviews,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error fetching reviews", error: error.message });
            }
        });
    }
    /**
     * Delete review (owner only)
     * DELETE /api/reviews/:reviewId
     */
    static deleteReview(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { reviewId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const review = yield Review_1.Review.findById(reviewId);
                if (!review) {
                    return res.status(404).json({ success: false, message: "Review not found" });
                }
                // Only reviewer can delete
                if (review.reviewerId.toString() !== userId) {
                    return res
                        .status(403)
                        .json({ success: false, message: "You can only delete your own reviews" });
                }
                yield Review_1.Review.findByIdAndDelete(reviewId);
                res.status(200).json({
                    success: true,
                    message: "Review deleted successfully",
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error deleting review", error: error.message });
            }
        });
    }
    /**
     * Get my reviews (reviews I wrote)
     * GET /api/reviews/my-reviews
     */
    static getMyReviews(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const reviewerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!reviewerId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                const { type, page = 1, limit = 20 } = req.query;
                const query = { reviewerId };
                if (type) {
                    query.type = type;
                }
                const reviews = yield Review_1.Review.find(query)
                    .populate("revieweeId", "fullName avatar reputation")
                    .populate("orderId", "listingId")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Review_1.Review.countDocuments(query);
                res.status(200).json({
                    success: true,
                    data: reviews,
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
}
exports.ReviewController = ReviewController;
//# sourceMappingURL=ReviewController.js.map