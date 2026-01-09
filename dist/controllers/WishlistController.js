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
exports.WishlistController = void 0;
const Wishlist_1 = require("../models/Wishlist");
const Listing_1 = require("../models/Listing");
const mongoose_1 = __importDefault(require("mongoose"));
class WishlistController {
    /**
     * Add to wishlist
     * POST /api/wishlist
     */
    static addToWishlist(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { listingId } = req.body;
                const buyerId = req.userId;
                // Check if listing exists
                const listing = yield Listing_1.Listing.findById(listingId);
                if (!listing) {
                    return res.status(404).json({ success: false, message: "Listing not found" });
                }
                // Check if already in wishlist
                const existingWishlist = yield Wishlist_1.Wishlist.findOne({
                    buyerId,
                    listingId,
                });
                if (existingWishlist) {
                    return res
                        .status(400)
                        .json({ success: false, message: "Item already in wishlist" });
                }
                const wishlist = new Wishlist_1.Wishlist({
                    buyerId: new mongoose_1.default.Types.ObjectId(buyerId),
                    listingId: new mongoose_1.default.Types.ObjectId(listingId),
                });
                yield wishlist.save();
                res.status(201).json({
                    success: true,
                    message: "Added to wishlist",
                    data: wishlist,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error adding to wishlist", error: error.message });
            }
        });
    }
    /**
     * Remove from wishlist
     * DELETE /api/wishlist/:listingId
     */
    static removeFromWishlist(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { listingId } = req.params;
                const buyerId = req.userId;
                const wishlist = yield Wishlist_1.Wishlist.findOneAndDelete({
                    buyerId,
                    listingId,
                });
                if (!wishlist) {
                    return res.status(404).json({ success: false, message: "Item not in wishlist" });
                }
                res.status(200).json({
                    success: true,
                    message: "Removed from wishlist",
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error removing from wishlist", error: error.message });
            }
        });
    }
    /**
     * Get user's wishlist
     * GET /api/wishlist
     */
    static getWishlist(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const buyerId = req.userId;
                const { page = 1, limit = 20, sort = "-addedAt" } = req.query;
                const wishlistItems = yield Wishlist_1.Wishlist.find({ buyerId })
                    .populate({
                    path: "listingId",
                    select: "title type brand model year size pricing media status condition views inspectionScore",
                    populate: {
                        path: "sellerId",
                        select: "fullName avatar reputation",
                    },
                })
                    .sort(sort)
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Wishlist_1.Wishlist.countDocuments({ buyerId });
                res.status(200).json({
                    success: true,
                    data: wishlistItems,
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
                    .json({ success: false, message: "Error fetching wishlist", error: error.message });
            }
        });
    }
    /**
     * Check if listing is in wishlist
     * GET /api/wishlist/check/:listingId
     */
    static checkWishlist(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { listingId } = req.params;
                const buyerId = req.userId;
                const wishlist = yield Wishlist_1.Wishlist.findOne({
                    buyerId,
                    listingId,
                });
                res.status(200).json({
                    success: true,
                    data: {
                        inWishlist: !!wishlist,
                    },
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error checking wishlist", error: error.message });
            }
        });
    }
    /**
     * Clear wishlist
     * DELETE /api/wishlist
     */
    static clearWishlist(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const buyerId = req.userId;
                yield Wishlist_1.Wishlist.deleteMany({ buyerId });
                res.status(200).json({
                    success: true,
                    message: "Wishlist cleared",
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error clearing wishlist", error: error.message });
            }
        });
    }
    /**
     * Get wishlist count
     * GET /api/wishlist/count
     */
    static getWishlistCount(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const buyerId = req.userId;
                const count = yield Wishlist_1.Wishlist.countDocuments({ buyerId });
                res.status(200).json({
                    success: true,
                    data: { count },
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({ success: false, message: "Error getting wishlist count", error: error.message });
            }
        });
    }
}
exports.WishlistController = WishlistController;
//# sourceMappingURL=WishlistController.js.map