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
exports.ListingController = void 0;
const Listing_1 = require("../models/Listing");
const SubscriptionService_1 = require("../services/SubscriptionService");
/**
 * Helper function to enrich seller info with subscription badge
 */
function enrichSellerWithBadge(listing) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!(listing === null || listing === void 0 ? void 0 : listing.sellerId))
            return listing;
        const sellerId = (_b = (_a = listing.sellerId) === null || _a === void 0 ? void 0 : _a._id) !== null && _b !== void 0 ? _b : listing.sellerId;
        if (!sellerId)
            return listing;
        const subscription = yield SubscriptionService_1.SubscriptionService.getSellerSubscription(sellerId);
        if (subscription) {
            const plan = yield SubscriptionService_1.SubscriptionService.getPlanByType(subscription.planType);
            if (plan) {
                // Add badge and plan info to seller
                if (typeof listing.sellerId === 'object') {
                    listing.sellerId.badge = plan.badge;
                    listing.sellerId.planType = subscription.planType;
                }
                // Add inspection info to listing level for easy access
                listing.sellerHasFreeInspection = plan.freeInspectionsPerMonth > 0 &&
                    subscription.inspectionsUsedThisMonth < plan.freeInspectionsPerMonth;
                listing.sellerPlanType = subscription.planType;
            }
        }
        return listing;
    });
}
/**
 * Helper function to enrich multiple listings with seller badges
 */
function enrichListingsWithBadges(listings) {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.all(listings.map(listing => enrichSellerWithBadge(listing)));
    });
}
class ListingController {
    // GET /api/listings/featured
    // Get featured listings (PREMIUM sellers only)
    static getFeatured(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const { limit = 10 } = req.query;
                // Get all published listings
                let listings = yield Listing_1.Listing.find({ status: "PUBLISHED" })
                    .populate("sellerId", "fullName reputation address")
                    .lean();
                // Filter only PREMIUM sellers
                const featuredListings = [];
                for (const listing of listings) {
                    const listingAny = listing;
                    const sellerId = ((_b = (_a = listingAny.sellerId) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) || ((_c = listingAny.sellerId) === null || _c === void 0 ? void 0 : _c.toString());
                    if (!sellerId)
                        continue;
                    const subscription = yield SubscriptionService_1.SubscriptionService.getSellerSubscription(sellerId);
                    if (subscription && subscription.planType === "PREMIUM") {
                        const plan = yield SubscriptionService_1.SubscriptionService.getPlanByType(subscription.planType);
                        if (plan) {
                            // Add badge and priority info
                            if (typeof listingAny.sellerId === 'object' && listingAny.sellerId) {
                                listingAny.sellerId.badge = plan.badge;
                                listingAny.sellerId.planType = subscription.planType;
                            }
                            listingAny.priorityLevel = plan.priorityLevel;
                            featuredListings.push(listingAny);
                        }
                    }
                }
                // Sort by tier: 1. Boosted, 2. Views, 3. Newest
                // Within same tier → time-based rotation (offset by hour) so all sellers get fair exposure
                const now = new Date();
                const hourOffset = now.getHours(); // Changes every hour → different sellers surface
                featuredListings.sort((a, b) => {
                    var _a, _b, _c, _d, _e, _f;
                    const aBoost = a.boostedUntil && new Date(a.boostedUntil) > now ? 1 : 0;
                    const bBoost = b.boostedUntil && new Date(b.boostedUntil) > now ? 1 : 0;
                    // Tier 1: Active boost wins
                    if (aBoost !== bBoost)
                        return bBoost - aBoost;
                    // Tier 2 (both boosted or both not): rotate by views bucket + hour offset
                    // Group views into buckets of 10 so minor differences don't dominate
                    const aViewBucket = Math.floor((a.views || 0) / 10);
                    const bViewBucket = Math.floor((b.views || 0) / 10);
                    if (aViewBucket !== bViewBucket)
                        return bViewBucket - aViewBucket;
                    // Tier 3 (same view bucket): time-based rotation using seller id hash + hour
                    // This ensures different sellers appear at top each hour
                    const aHash = (((_b = (_a = a.sellerId) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) || ((_c = a._id) === null || _c === void 0 ? void 0 : _c.toString()) || '').charCodeAt(0) || 0;
                    const bHash = (((_e = (_d = b.sellerId) === null || _d === void 0 ? void 0 : _d._id) === null || _e === void 0 ? void 0 : _e.toString()) || ((_f = b._id) === null || _f === void 0 ? void 0 : _f.toString()) || '').charCodeAt(0) || 0;
                    return ((aHash + hourOffset) % 26) - ((bHash + hourOffset) % 26);
                });
                // Limit results
                const limitedListings = featuredListings.slice(0, Number(limit));
                res.json({
                    success: true,
                    count: limitedListings.length,
                    data: limitedListings,
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/listings
    static getAll(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { type, brand, minPrice, maxPrice } = req.query;
                // Build Query
                let query = { status: "PUBLISHED" }; // Only show published bikes
                if (type && type !== "ALL")
                    query.type = type;
                if (brand)
                    query["generalInfo.brand"] = brand;
                if (minPrice || maxPrice) {
                    query["pricing.amount"] = {};
                    if (minPrice)
                        query["pricing.amount"].$gte = Number(minPrice);
                    if (maxPrice)
                        query["pricing.amount"].$lte = Number(maxPrice);
                }
                let listings = yield Listing_1.Listing.find(query)
                    .populate("sellerId", "fullName reputation address")
                    .lean(); // Use lean for better performance
                // Enrich with seller badges
                listings = yield enrichListingsWithBadges(listings);
                // Get seller subscriptions for priority sorting (sellerId may be null if user deleted)
                const listingsWithPriority = yield Promise.all(listings.map((listing) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c;
                    const sellerId = (_c = (_b = (_a = listing.sellerId) === null || _a === void 0 ? void 0 : _a._id) !== null && _b !== void 0 ? _b : listing.sellerId) !== null && _c !== void 0 ? _c : null;
                    const subscription = sellerId
                        ? yield SubscriptionService_1.SubscriptionService.getSellerSubscription(sellerId)
                        : null;
                    if (subscription) {
                        const plan = yield SubscriptionService_1.SubscriptionService.getPlanByType(subscription.planType);
                        listing.priorityLevel = (plan === null || plan === void 0 ? void 0 : plan.priorityLevel) || 0;
                    }
                    else {
                        listing.priorityLevel = 0;
                    }
                    return listing;
                })));
                // Sort by: 1. Boosted, 2. Priority Level, 3. Created Date
                const now = new Date();
                const sortedListings = listingsWithPriority.sort((a, b) => {
                    // 1. Boosted listings first
                    const aBoost = a.boostedUntil && new Date(a.boostedUntil) > now ? 1 : 0;
                    const bBoost = b.boostedUntil && new Date(b.boostedUntil) > now ? 1 : 0;
                    if (aBoost !== bBoost)
                        return bBoost - aBoost;
                    // 2. Priority level (higher is better)
                    if (a.priorityLevel !== b.priorityLevel) {
                        return b.priorityLevel - a.priorityLevel;
                    }
                    // 3. Newest first
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });
                res.json({
                    success: true,
                    count: sortedListings.length,
                    data: sortedListings
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/listings/:id
    static getById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let listing = yield Listing_1.Listing.findById(req.params.id)
                    .populate("sellerId", "fullName reputation address")
                    .lean();
                if (!listing) {
                    res.status(404).json({ success: false, message: "Listing not found" });
                    return;
                }
                // Enrich with seller badge
                listing = yield enrichSellerWithBadge(listing);
                res.json({ success: true, data: listing });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // POST /api/listings
    static create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // SECURITY FIX: Get User ID from Token
                const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!sellerId) {
                    return res
                        .status(401)
                        .json({ success: false, message: "Unauthorized" });
                }
                // Check subscription quota before creating listing
                const quotaCheck = yield SubscriptionService_1.SubscriptionService.canCreateListing(sellerId);
                if (!quotaCheck.canCreate) {
                    return res.status(403).json({
                        success: false,
                        message: quotaCheck.reason,
                        data: {
                            used: quotaCheck.used,
                            limit: quotaCheck.limit,
                            planType: quotaCheck.planType,
                            upgradeUrl: "/api/subscriptions/plans",
                        },
                    });
                }
                const newListing = new Listing_1.Listing(Object.assign(Object.assign({}, req.body), { sellerId: sellerId, status: "DRAFT" }));
                yield newListing.save();
                // Increment listing count for subscription
                yield SubscriptionService_1.SubscriptionService.incrementListingCount(sellerId);
                res.status(201).json({
                    success: true,
                    data: newListing,
                    message: "Listing created as draft. Use PUT /api/listings/:id to submit for approval.",
                    quota: {
                        used: quotaCheck.used + 1,
                        limit: quotaCheck.limit,
                        planType: quotaCheck.planType,
                    },
                });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
    // PUT /api/listings/:id/submit-approval
    // Submit listing for admin approval (SRS requirement)
    static submitForApproval(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!sellerId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                const listing = yield Listing_1.Listing.findById(id);
                if (!listing) {
                    return res.status(404).json({ success: false, message: "Listing not found" });
                }
                // Check ownership
                if (listing.sellerId.toString() !== sellerId) {
                    return res.status(403).json({ success: false, message: "Not authorized to update this listing" });
                }
                // Only allow submission from DRAFT status
                if (listing.status !== "DRAFT") {
                    return res.status(400).json({
                        success: false,
                        message: `Cannot submit listing with status ${listing.status} for approval`
                    });
                }
                // Update status to PENDING_APPROVAL per SRS BikeMarket
                listing.status = Listing_1.ListingStatus.PENDING_APPROVAL;
                listing.submittedAt = new Date();
                yield listing.save();
                // TODO: Send notification to admin about new listing pending approval
                res.json({
                    success: true,
                    data: listing,
                    message: "Listing submitted for admin approval per SRS BikeMarket workflow"
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // PUT /api/listings/:id
    // Update listing (Seller only)
    static update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!sellerId) {
                    return res
                        .status(401)
                        .json({ success: false, message: "Unauthorized" });
                }
                const listing = yield Listing_1.Listing.findById(id);
                if (!listing) {
                    return res
                        .status(404)
                        .json({ success: false, message: "Listing not found" });
                }
                // Check ownership
                if (listing.sellerId.toString() !== sellerId) {
                    return res
                        .status(403)
                        .json({
                        success: false,
                        message: "Not authorized to update this listing",
                    });
                }
                // Don't allow updating if already sold
                if (listing.status === "SOLD") {
                    return res
                        .status(400)
                        .json({ success: false, message: "Không thể chỉnh sửa listing đã bán" });
                }
                // Don't allow updating if listing is reserved (has active order)
                if (listing.status === "RESERVED") {
                    return res
                        .status(400)
                        .json({
                        success: false,
                        message: "Không thể chỉnh sửa listing đã có người đặt cọc. Vui lòng chờ giao dịch hoàn tất."
                    });
                }
                // Additional check: verify no active orders exist for this listing
                const { Order } = yield Promise.resolve().then(() => __importStar(require("../models/Order")));
                const activeOrder = yield Order.findOne({
                    listingId: id,
                    status: {
                        $in: ["CREATED", "ESCROW_LOCKED", "IN_INSPECTION", "INSPECTION_PASSED", "IN_TRANSIT"]
                    }
                });
                if (activeOrder) {
                    return res
                        .status(400)
                        .json({
                        success: false,
                        message: "Không thể chỉnh sửa listing có đơn hàng đang xử lý. Vui lòng chờ giao dịch hoàn tất."
                    });
                }
                // Update listing
                const updatedListing = yield Listing_1.Listing.findByIdAndUpdate(id, req.body, {
                    new: true,
                    runValidators: true,
                });
                res.json({ success: true, data: updatedListing, message: "Listing đã được cập nhật thành công" });
            }
            catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        });
    }
    // DELETE /api/listings/:id
    // Delete listing (Seller only)
    static delete(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!sellerId) {
                    return res
                        .status(401)
                        .json({ success: false, message: "Unauthorized" });
                }
                const listing = yield Listing_1.Listing.findById(id);
                if (!listing) {
                    return res
                        .status(404)
                        .json({ success: false, message: "Listing not found" });
                }
                // Check ownership
                if (listing.sellerId.toString() !== sellerId) {
                    return res
                        .status(403)
                        .json({
                        success: false,
                        message: "Not authorized to delete this listing",
                    });
                }
                // Don't allow deleting if already sold
                if (listing.status === "SOLD") {
                    return res
                        .status(400)
                        .json({ success: false, message: "Không thể xóa listing đã bán" });
                }
                // Don't allow deleting if listing is reserved (has active order)
                if (listing.status === "RESERVED") {
                    return res
                        .status(400)
                        .json({
                        success: false,
                        message: "Không thể xóa listing đã có người đặt cọc. Vui lòng chờ giao dịch hoàn tất."
                    });
                }
                // Additional check: verify no active orders exist for this listing
                const { Order } = yield Promise.resolve().then(() => __importStar(require("../models/Order")));
                const activeOrder = yield Order.findOne({
                    listingId: id,
                    status: {
                        $in: ["CREATED", "ESCROW_LOCKED", "IN_INSPECTION", "INSPECTION_PASSED", "IN_TRANSIT"]
                    }
                });
                if (activeOrder) {
                    return res
                        .status(400)
                        .json({
                        success: false,
                        message: "Không thể xóa listing có đơn hàng đang xử lý. Vui lòng chờ giao dịch hoàn tất hoặc hủy đơn hàng."
                    });
                }
                yield Listing_1.Listing.findByIdAndDelete(id);
                res.json({ success: true, message: "Listing đã được xóa thành công" });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // PUT /api/listings/:id/view
    // Increment view count
    static incrementView(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const listing = yield Listing_1.Listing.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
                if (!listing) {
                    return res
                        .status(404)
                        .json({ success: false, message: "Listing not found" });
                }
                res.json({ success: true, data: { views: listing.views } });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/listings/my-listings
    // Get seller's listings
    static getMyListings(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const sellerId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!sellerId) {
                    return res
                        .status(401)
                        .json({ success: false, message: "Unauthorized" });
                }
                const { status, page = 1, limit = 20 } = req.query;
                const query = { sellerId };
                if (status) {
                    query.status = status;
                }
                const listings = yield Listing_1.Listing.find(query)
                    .populate("sellerId", "fullName reputation address")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Listing_1.Listing.countDocuments(query);
                res.json({
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
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/listings/nearby
    // Find listings near a location (geolocation search)
    static getNearby(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { lat, lng, radius = 10, type, brand, minPrice, maxPrice, } = req.query;
                if (!lat || !lng) {
                    return res.status(400).json({
                        success: false,
                        message: "Latitude and longitude are required",
                    });
                }
                const latitude = parseFloat(lat);
                const longitude = parseFloat(lng);
                const radiusKm = parseFloat(radius) || 10; // Default 10km
                // Validate coordinates
                if (isNaN(latitude) ||
                    isNaN(longitude) ||
                    latitude < -90 ||
                    latitude > 90 ||
                    longitude < -180 ||
                    longitude > 180) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid coordinates",
                    });
                }
                // Build base query
                let query = {
                    status: "PUBLISHED",
                    location: {
                        $near: {
                            $geometry: {
                                type: "Point",
                                coordinates: [longitude, latitude], // MongoDB uses [lng, lat]
                            },
                            $maxDistance: radiusKm * 1000, // Convert km to meters
                        },
                    },
                };
                // Add filters
                if (type && type !== "ALL")
                    query.type = type;
                if (brand)
                    query["generalInfo.brand"] = brand;
                if (minPrice || maxPrice) {
                    query["pricing.amount"] = {};
                    if (minPrice)
                        query["pricing.amount"].$gte = Number(minPrice);
                    if (maxPrice)
                        query["pricing.amount"].$lte = Number(maxPrice);
                }
                const listings = yield Listing_1.Listing.find(query)
                    .sort({ createdAt: -1 })
                    .populate("sellerId", "fullName reputation address")
                    .limit(50); // Limit results
                // Calculate distance for each listing (optional enhancement)
                const listingsWithDistance = listings.map((listing) => {
                    const listingCoords = listing.location.coordinates;
                    const distance = calculateDistance(latitude, longitude, listingCoords[1], // lat
                    listingCoords[0] // lng
                    );
                    return Object.assign(Object.assign({}, listing.toObject()), { distance: Math.round(distance * 10) / 10 });
                });
                res.json({
                    success: true,
                    count: listingsWithDistance.length,
                    data: listingsWithDistance,
                    searchLocation: { lat: latitude, lng: longitude },
                    radius: radiusKm,
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // POST /api/listings/fit-calculator
    // Calculate bike fit based on rider's body measurements
    static fitCalculator(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { riderHeight, riderInseam, riderReach, listingId } = req.body;
                if (!riderHeight || !riderInseam) {
                    return res.status(400).json({
                        success: false,
                        message: "riderHeight and riderInseam are required",
                    });
                }
                const height = parseFloat(riderHeight);
                const inseam = parseFloat(riderInseam);
                const preferredReach = riderReach ? parseFloat(riderReach) : null;
                if (isNaN(height) ||
                    isNaN(inseam) ||
                    height < 100 ||
                    height > 250 ||
                    inseam < 50 ||
                    inseam > 150) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid body measurements",
                    });
                }
                // If listingId provided, check fit for that specific bike
                if (listingId) {
                    const listing = yield Listing_1.Listing.findById(listingId);
                    if (!listing) {
                        return res.status(404).json({
                            success: false,
                            message: "Listing not found",
                        });
                    }
                    const fitResult = calculateBikeFit(listing, height, inseam, preferredReach);
                    return res.json({
                        success: true,
                        listingId,
                        fitResult,
                    });
                }
                // Otherwise, find bikes that fit
                let query = {
                    status: "PUBLISHED",
                    "geometry.stack": { $exists: true },
                    "geometry.reach": { $exists: true },
                };
                // Calculate ideal stack and reach based on rider measurements
                // Simplified formula (can be enhanced with more sophisticated algorithms)
                const idealStack = height * 0.55 + inseam * 0.15; // Approximate formula
                const idealReach = height * 0.45 + (preferredReach || height * 0.3);
                // Find bikes within tolerance
                const tolerance = 30; // mm tolerance
                query["geometry.stack"] = {
                    $gte: idealStack - tolerance,
                    $lte: idealStack + tolerance,
                };
                if (preferredReach) {
                    query["geometry.reach"] = {
                        $gte: idealReach - tolerance,
                        $lte: idealReach + tolerance,
                    };
                }
                const listings = yield Listing_1.Listing.find(query)
                    .populate("sellerId", "fullName reputation address")
                    .limit(20);
                // Calculate fit score for each listing
                const listingsWithFit = listings.map((listing) => {
                    const fitResult = calculateBikeFit(listing, height, inseam, preferredReach);
                    return Object.assign(Object.assign({}, listing.toObject()), { fitScore: fitResult.fitScore, fitRecommendation: fitResult.recommendation });
                });
                // Sort by fit score
                listingsWithFit.sort((a, b) => b.fitScore - a.fitScore);
                res.json({
                    success: true,
                    count: listingsWithFit.length,
                    data: listingsWithFit,
                    riderMeasurements: { height, inseam, preferredReach },
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/listings/search/advanced
    // Faceted Search using Aggregation Pipeline
    static advancedSearch(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { keyword, type, // ROAD, MTB, etc.
                brand, minPrice, maxPrice, size, frameMaterial, brakeType, groupset, wheelSize, condition, lat, lng, radius = 20, // km
                page = 1, limit = 20, sortBy = "newest", // newest, price_asc, price_desc, views
                 } = req.query;
                const pipeline = [];
                // 1. Full-text search or Geo search (must be first)
                if (lat && lng) {
                    pipeline.push({
                        $geoNear: {
                            near: {
                                type: "Point",
                                coordinates: [parseFloat(lng), parseFloat(lat)],
                            },
                            distanceField: "distance",
                            maxDistance: parseFloat(radius) * 1000,
                            spherical: true,
                        },
                    });
                }
                else if (keyword) {
                    pipeline.push({
                        $match: { $text: { $search: keyword } },
                    });
                }
                // 2. Match Filters
                const matchStage = { status: "PUBLISHED" };
                if (type && type !== "ALL")
                    matchStage.type = type;
                if (brand)
                    matchStage["generalInfo.brand"] = { $regex: new RegExp(brand, "i") };
                if (size)
                    matchStage["generalInfo.size"] = size;
                if (condition)
                    matchStage["generalInfo.condition"] = condition;
                // Price Range
                if (minPrice || maxPrice) {
                    matchStage["pricing.amount"] = {};
                    if (minPrice)
                        matchStage["pricing.amount"].$gte = Number(minPrice);
                    if (maxPrice)
                        matchStage["pricing.amount"].$lte = Number(maxPrice);
                }
                // Specs Filters (Polymorphic fields)
                if (frameMaterial)
                    matchStage["specs.frameMaterial"] = {
                        $regex: new RegExp(frameMaterial, "i"),
                    };
                if (brakeType)
                    matchStage["specs.brakeType"] = brakeType;
                if (groupset)
                    matchStage["specs.groupset"] = { $regex: new RegExp(groupset, "i") };
                if (wheelSize)
                    matchStage["specs.wheelSize"] = wheelSize;
                pipeline.push({ $match: matchStage });
                // 3. Sorting
                let sortStage = {};
                switch (sortBy) {
                    case "price_asc":
                        sortStage["pricing.amount"] = 1;
                        break;
                    case "price_desc":
                        sortStage["pricing.amount"] = -1;
                        break;
                    case "views":
                        sortStage.views = -1;
                        break;
                    case "newest":
                    default:
                        sortStage.createdAt = -1;
                }
                pipeline.push({ $sort: sortStage });
                // 4. Facets (Pagination + Stats)
                pipeline.push({
                    $facet: {
                        data: [
                            { $skip: (Number(page) - 1) * Number(limit) },
                            { $limit: Number(limit) },
                            {
                                $lookup: {
                                    from: "users",
                                    localField: "sellerId",
                                    foreignField: "_id",
                                    as: "seller",
                                },
                            },
                            { $unwind: "$seller" },
                            {
                                $project: {
                                    "seller.passwordHash": 0,
                                    "seller.googleId": 0,
                                    "seller.facebookId": 0,
                                },
                            },
                        ],
                        totalCount: [{ $count: "count" }],
                        // Aggregations for filter menu
                        brands: [
                            { $group: { _id: "$generalInfo.brand", count: { $sum: 1 } } },
                        ],
                        types: [{ $group: { _id: "$type", count: { $sum: 1 } } }],
                        frameMaterials: [
                            { $group: { _id: "$specs.frameMaterial", count: { $sum: 1 } } },
                        ],
                    },
                });
                const result = yield Listing_1.Listing.aggregate(pipeline);
                const data = result[0].data;
                const total = result[0].totalCount[0] ? result[0].totalCount[0].count : 0;
                const facets = {
                    brands: result[0].brands,
                    types: result[0].types,
                    frameMaterials: result[0].frameMaterials,
                };
                res.json({
                    success: true,
                    data,
                    facets,
                    pagination: {
                        total,
                        page: Number(page),
                        limit: Number(limit),
                        pages: Math.ceil(total / Number(limit)),
                    },
                });
            }
            catch (error) {
                console.error("Advanced Search Error:", error);
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // POST /api/listings/suggest-from-image
    // AI Vision feature: Suggest bike details from uploaded image
    static suggestFromImage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // In a real implementation, this would handle file upload and send to Gemini Vision API
                // For now, we simulate the response or use the text-based service if description is provided
                const { imageUrl, description } = req.body;
                // Placeholder for AI Vision Logic
                // const analysis = await ChatbotService.analyzeImage(imageUrl);
                res.json({
                    success: true,
                    suggestion: {
                        brand: "Specialized (AI Detected)",
                        type: "ROAD",
                        frameMaterial: "Carbon",
                        estimatedPrice: 45000000,
                    },
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/listings/search/suggestions
    // Get search suggestions/autocomplete
    static getSearchSuggestions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { q, limit = 10 } = req.query;
                if (!q || q.length < 2) {
                    return res.json({ success: true, data: [] });
                }
                const query = q.toString().toLowerCase();
                // Search in brands, models, and titles
                const suggestions = yield Listing_1.Listing.aggregate([
                    {
                        $match: {
                            status: "PUBLISHED",
                            $or: [
                                { "generalInfo.brand": { $regex: query, $options: "i" } },
                                { "generalInfo.model": { $regex: query, $options: "i" } },
                                { title: { $regex: query, $options: "i" } },
                            ],
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            brands: { $addToSet: "$generalInfo.brand" },
                            models: { $addToSet: "$generalInfo.model" },
                            titles: { $addToSet: "$title" },
                        },
                    },
                    {
                        $project: {
                            suggestions: {
                                $slice: [
                                    {
                                        $setUnion: [
                                            { $filter: { input: "$brands", cond: { $regexMatch: { input: "$$this", regex: query, options: "i" } } } },
                                            { $filter: { input: "$models", cond: { $regexMatch: { input: "$$this", regex: query, options: "i" } } } },
                                            { $filter: { input: "$titles", cond: { $regexMatch: { input: "$$this", regex: query, options: "i" } } } },
                                        ],
                                    },
                                    Number(limit),
                                ],
                            },
                        },
                    },
                ]);
                const data = suggestions.length > 0 ? suggestions[0].suggestions : [];
                res.json({ success: true, data });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // GET /api/listings/search/facets
    // Get search facets for filtering
    static getSearchFacets(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const facets = yield Listing_1.Listing.aggregate([
                    { $match: { status: "PUBLISHED" } },
                    {
                        $facet: {
                            brands: [
                                { $group: { _id: "$generalInfo.brand", count: { $sum: 1 } } },
                                { $sort: { count: -1 } },
                                { $limit: 20 },
                            ],
                            types: [
                                { $group: { _id: "$type", count: { $sum: 1 } } },
                                { $sort: { count: -1 } },
                            ],
                            conditions: [
                                { $group: { _id: "$generalInfo.condition", count: { $sum: 1 } } },
                                { $sort: { count: -1 } },
                            ],
                            frameMaterials: [
                                { $group: { _id: "$specs.frameMaterial", count: { $sum: 1 } } },
                                { $match: { _id: { $ne: null } } },
                                { $sort: { count: -1 } },
                                { $limit: 10 },
                            ],
                            brakeTypes: [
                                { $group: { _id: "$specs.brakeType", count: { $sum: 1 } } },
                                { $match: { _id: { $ne: null } } },
                                { $sort: { count: -1 } },
                            ],
                            priceRanges: [
                                {
                                    $bucket: {
                                        groupBy: "$pricing.amount",
                                        boundaries: [0, 10000000, 30000000, 50000000, 100000000, 200000000],
                                        default: "200000000+",
                                        output: { count: { $sum: 1 } },
                                    },
                                },
                            ],
                        },
                    },
                ]);
                res.json({ success: true, data: facets[0] });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // POST /api/listings/search/save
    // Save search query for user
    static saveSearch(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                const { query, filters, name } = req.body;
                // For now, we'll store in a simple collection or user document
                // In production, create a SavedSearch model
                const savedSearch = {
                    userId,
                    name: name || `Search ${new Date().toLocaleDateString()}`,
                    query,
                    filters,
                    createdAt: new Date(),
                };
                // Simulate saving (in production, save to SavedSearch collection)
                console.log("Saved search:", savedSearch);
                res.status(201).json({
                    success: true,
                    message: "Search saved successfully",
                    data: savedSearch,
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
    // POST /api/listings/:id/boost
    // Boost a listing to appear higher in search results
    static boostListing(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { id } = req.params;
                const BOOST_DURATION_DAYS = 2; // Fixed: 1 lượt boost = 2 ngày
                if (!userId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                // Find listing
                const listing = yield Listing_1.Listing.findById(id);
                if (!listing) {
                    return res.status(404).json({ success: false, message: "Listing not found" });
                }
                // Check ownership
                if (listing.sellerId.toString() !== userId) {
                    return res.status(403).json({ success: false, message: "You can only boost your own listings" });
                }
                // Check if listing is published
                if (listing.status !== Listing_1.ListingStatus.PUBLISHED) {
                    return res.status(400).json({ success: false, message: "Only published listings can be boosted" });
                }
                // Get seller's subscription
                const subscription = yield SubscriptionService_1.SubscriptionService.getSellerSubscription(userId);
                if (!subscription) {
                    return res.status(400).json({ success: false, message: "No active subscription found" });
                }
                // Get plan details
                const plan = yield SubscriptionService_1.SubscriptionService.getPlanByType(subscription.planType);
                if (!plan) {
                    return res.status(400).json({ success: false, message: "Plan not found" });
                }
                // Reset weekly boost quota if needed
                yield SubscriptionService_1.SubscriptionService.resetWeeklyBoostIfNeeded(subscription);
                // Check boost quota
                if (subscription.boostsUsedThisWeek >= plan.boostPerWeek) {
                    return res.status(400).json({
                        success: false,
                        message: `You have used all ${plan.boostPerWeek} boosts this week. Upgrade your plan to boost more!`,
                        data: {
                            used: subscription.boostsUsedThisWeek,
                            limit: plan.boostPerWeek,
                            planType: subscription.planType,
                        },
                    });
                }
                // Boost the listing
                const boostedUntil = new Date();
                boostedUntil.setDate(boostedUntil.getDate() + BOOST_DURATION_DAYS);
                listing.boostedUntil = boostedUntil;
                listing.boostCount = (listing.boostCount || 0) + 1;
                yield listing.save();
                // Increment boost usage
                subscription.boostsUsedThisWeek += 1;
                yield subscription.save();
                res.json({
                    success: true,
                    message: `Listing boosted successfully for ${BOOST_DURATION_DAYS} days!`,
                    data: {
                        listing: {
                            id: listing._id,
                            title: listing.title,
                            boostedUntil: listing.boostedUntil,
                            boostCount: listing.boostCount,
                        },
                        boostUsage: {
                            used: subscription.boostsUsedThisWeek,
                            limit: plan.boostPerWeek,
                            remaining: plan.boostPerWeek - subscription.boostsUsedThisWeek,
                        },
                    },
                });
            }
            catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        });
    }
}
exports.ListingController = ListingController;
/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function toRad(degrees) {
    return degrees * (Math.PI / 180);
}
/**
 * Calculate bike fit for a specific listing
 */
function calculateBikeFit(listing, riderHeight, riderInseam, preferredReach) {
    if (!listing.geometry || !listing.geometry.stack || !listing.geometry.reach) {
        return {
            fitScore: 0,
            recommendation: "UNKNOWN",
            message: "Bike geometry data not available",
        };
    }
    const bikeStack = listing.geometry.stack;
    const bikeReach = listing.geometry.reach;
    // Calculate ideal measurements
    const idealStack = riderHeight * 0.55 + riderInseam * 0.15;
    const idealReach = preferredReach || riderHeight * 0.45;
    // Calculate differences
    const stackDiff = Math.abs(bikeStack - idealStack);
    const reachDiff = Math.abs(bikeReach - idealReach);
    // Calculate fit score (0-100)
    // Lower difference = higher score
    const maxTolerance = 50; // mm
    const stackScore = Math.max(0, 100 - (stackDiff / maxTolerance) * 100);
    const reachScore = Math.max(0, 100 - (reachDiff / maxTolerance) * 100);
    const fitScore = (stackScore + reachScore) / 2;
    // Determine recommendation
    let recommendation = "UNKNOWN";
    if (fitScore >= 80) {
        recommendation = "EXCELLENT";
    }
    else if (fitScore >= 60) {
        recommendation = "GOOD";
    }
    else if (fitScore >= 40) {
        recommendation = "ACCEPTABLE";
    }
    else {
        recommendation = "POOR";
    }
    return {
        fitScore: Math.round(fitScore),
        recommendation,
        stackDifference: Math.round(stackDiff),
        reachDifference: Math.round(reachDiff),
        bikeGeometry: {
            stack: bikeStack,
            reach: bikeReach,
        },
        idealGeometry: {
            stack: Math.round(idealStack),
            reach: Math.round(idealReach),
        },
    };
}
//# sourceMappingURL=ListingController.js.map