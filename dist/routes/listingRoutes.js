"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listingRoutes = void 0;
const express_1 = require("express");
const ListingController_1 = require("../controllers/ListingController");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.listingRoutes = (0, express_1.Router)();
/**
 * @swagger
 * /api/listings:
 *   get:
 *     summary: Get all listings with filters
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ROAD, MTB, GRAVEL, ALL]
 *         description: Filter by bike type
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand name
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *     responses:
 *       200:
 *         description: List of bikes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Listing'
 */
exports.listingRoutes.get("/", ListingController_1.ListingController.getAll);
/**
 * @swagger
 * /api/listings/featured:
 *   get:
 *     summary: Get featured listings (PREMIUM sellers only)
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of featured listings to return
 *     responses:
 *       200:
 *         description: Featured listings from PREMIUM sellers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Listing'
 */
exports.listingRoutes.get("/featured", ListingController_1.ListingController.getFeatured);
/**
 * @swagger
 * /api/listings/my-listings:
 *   get:
 *     summary: Get seller's listings
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of seller's listings
 */
exports.listingRoutes.get("/my-listings", authMiddleware_1.protect, ListingController_1.ListingController.getMyListings);
/**
 * @swagger
 * /api/listings/nearby:
 *   get:
 *     summary: Find listings near a location (geolocation search)
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Search radius in kilometers
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by bike type
 *     responses:
 *       200:
 *         description: Listings near the location
 */
exports.listingRoutes.get("/nearby", ListingController_1.ListingController.getNearby);
/**
 * @swagger
 * /api/listings/search/advanced:
 *   get:
 *     summary: Advanced faceted search for listings
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [ROAD, MTB, GRAVEL, TRIATHLON, E_BIKE] }
 *       - in: query
 *         name: brand
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [newest, price_asc, price_desc, views] }
 *     responses:
 *       200:
 *         description: Search results with facets
 */
exports.listingRoutes.get("/search/advanced", ListingController_1.ListingController.advancedSearch);
/**
 * @swagger
 * /api/listings/search/suggestions:
 *   get:
 *     summary: Get search suggestions/autocomplete
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Search suggestions
 */
exports.listingRoutes.get("/search/suggestions", ListingController_1.ListingController.getSearchSuggestions);
/**
 * @swagger
 * /api/listings/search/facets:
 *   get:
 *     summary: Get search facets for filtering
 *     tags: [Listings]
 *     responses:
 *       200:
 *         description: Available facets
 */
exports.listingRoutes.get("/search/facets", ListingController_1.ListingController.getSearchFacets);
/**
 * @swagger
 * /api/listings/{id}:
 *   get:
 *     summary: Get a listing by ID
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Listing details
 *       404:
 *         description: Listing not found
 */
exports.listingRoutes.get("/:id", ListingController_1.ListingController.getById);
/**
 * @swagger
 * /api/listings:
 *   post:
 *     summary: Create a new listing
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - type
 *               - generalInfo
 *               - pricing
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Specialized Tarmac SL7 2023 - Size 54"
 *               description:
 *                 type: string
 *                 example: "Xe đạp đua cao cấp, đi được 2000km"
 *               type:
 *                 type: string
 *                 enum: [ROAD, MTB, GRAVEL, TRIATHLON, E_BIKE]
 *                 example: "ROAD"
 *               generalInfo:
 *                 type: object
 *                 required:
 *                   - brand
 *                   - model
 *                   - year
 *                   - size
 *                 properties:
 *                   brand:
 *                     type: string
 *                     example: "Specialized"
 *                   model:
 *                     type: string
 *                     example: "Tarmac SL7"
 *                   year:
 *                     type: number
 *                     example: 2023
 *                   size:
 *                     type: string
 *                     example: "54"
 *                   condition:
 *                     type: string
 *                     enum: [NEW, LIKE_NEW, GOOD, FAIR, PARTS]
 *                     example: "LIKE_NEW"
 *               specs:
 *                 type: object
 *                 properties:
 *                   frameMaterial:
 *                     type: string
 *                     example: "Carbon FACT 12r"
 *                   groupset:
 *                     type: string
 *                     example: "Shimano Dura-Ace Di2"
 *                   wheelset:
 *                     type: string
 *                     example: "Roval Rapide CLX"
 *                   brakeType:
 *                     type: string
 *                     enum: [Disc, Rim]
 *                     example: "Disc"
 *                   weight:
 *                     type: number
 *                     example: 6.8
 *               geometry:
 *                 type: object
 *                 properties:
 *                   stack:
 *                     type: number
 *                     example: 534
 *                   reach:
 *                     type: number
 *                     example: 387
 *               pricing:
 *                 type: object
 *                 required:
 *                   - amount
 *                 properties:
 *                   amount:
 *                     type: number
 *                     example: 120000000
 *                   currency:
 *                     type: string
 *                     default: "VND"
 *                   originalPrice:
 *                     type: number
 *                     example: 250000000
 *               media:
 *                 type: object
 *                 properties:
 *                   thumbnails:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: ["https://example.com/bike1.jpg"]
 *                   spin360Urls:
 *                     type: array
 *                     items:
 *                       type: string
 *                   videoUrl:
 *                     type: string
 *               location:
 *                 type: object
 *                 required:
 *                   - coordinates
 *                 properties:
 *                   type:
 *                     type: string
 *                     default: "Point"
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     example: [106.6297, 10.8231]
 *                     description: "[longitude, latitude]"
 *                   address:
 *                     type: string
 *                     example: "Quận 1, TP.HCM"
 *               inspectionRequired:
 *                 type: boolean
 *                 default: false
 *           example:
 *             title: "Specialized Tarmac SL7 2023 - Size 54"
 *             description: "Xe đạp đua cao cấp, đi được 2000km, bảo dưỡng định kỳ"
 *             type: "ROAD"
 *             generalInfo:
 *               brand: "Specialized"
 *               model: "Tarmac SL7"
 *               year: 2023
 *               size: "54"
 *               condition: "LIKE_NEW"
 *             specs:
 *               frameMaterial: "Carbon FACT 12r"
 *               groupset: "Shimano Dura-Ace Di2"
 *               wheelset: "Roval Rapide CLX"
 *               brakeType: "Disc"
 *             geometry:
 *               stack: 534
 *               reach: 387
 *             pricing:
 *               amount: 120000000
 *               currency: "VND"
 *               originalPrice: 250000000
 *             media:
 *               thumbnails: ["https://example.com/bike.jpg"]
 *             location:
 *               type: "Point"
 *               coordinates: [106.6297, 10.8231]
 *               address: "Quận 1, TP.HCM"
 *             inspectionRequired: false
 *     responses:
 *       201:
 *         description: Listing created
 */
exports.listingRoutes.post("/", authMiddleware_1.protect, validationMiddleware_1.validationRules.createListing, validationMiddleware_1.validate, ListingController_1.ListingController.create);
/**
 * @swagger
 * /api/listings/nearby:
 *   get:
 *     summary: Find listings near a location (geolocation search)
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Search radius in kilometers
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by bike type
 *     responses:
 *       200:
 *         description: Listings near the location
 */
exports.listingRoutes.get("/nearby", ListingController_1.ListingController.getNearby);
/**
 * @swagger
 * /api/listings/search/advanced:
 *   get:
 *     summary: Advanced faceted search for listings
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [ROAD, MTB, GRAVEL, TRIATHLON, E_BIKE] }
 *       - in: query
 *         name: brand
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [newest, price_asc, price_desc, views] }
 *     responses:
 *       200:
 *         description: Search results with facets
 */
exports.listingRoutes.get("/search/advanced", ListingController_1.ListingController.advancedSearch);
/**
 * @swagger
 * /api/listings/search/suggestions:
 *   get:
 *     summary: Get search suggestions/autocomplete
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: Search suggestions
 */
exports.listingRoutes.get("/search/suggestions", ListingController_1.ListingController.getSearchSuggestions);
/**
 * @swagger
 * /api/listings/search/facets:
 *   get:
 *     summary: Get search facets for filtering
 *     tags: [Listings]
 *     responses:
 *       200:
 *         description: Available facets
 */
exports.listingRoutes.get("/search/facets", ListingController_1.ListingController.getSearchFacets);
/**
 * @swagger
 * /api/listings/search/save:
 *   post:
 *     summary: Save search query for user
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *               filters:
 *                 type: object
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Search saved
 */
exports.listingRoutes.post("/search/save", authMiddleware_1.protect, ListingController_1.ListingController.saveSearch);
/**
 * @swagger
 * /api/listings/fit-calculator:
 *   post:
 *     summary: Calculate bike fit based on rider measurements
 *     tags: [Listings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - riderHeight
 *               - riderInseam
 *             properties:
 *               riderHeight:
 *                 type: number
 *                 description: Rider height in cm
 *               riderInseam:
 *                 type: number
 *                 description: Rider inseam in cm
 *               riderReach:
 *                 type: number
 *                 description: Preferred reach in mm (optional)
 *               listingId:
 *                 type: string
 *                 description: Specific listing ID to check fit (optional)
 *     responses:
 *       200:
 *         description: Fit calculation results
 */
exports.listingRoutes.post("/fit-calculator", validationMiddleware_1.validationRules.fitCalculator, validationMiddleware_1.validate, ListingController_1.ListingController.fitCalculator);
/**
 * @swagger
 * /api/listings/{id}/submit-approval:
 *   put:
 *     summary: Submit listing for admin approval (SRS BikeMarket requirement)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Listing submitted for approval
 *       400:
 *         description: Invalid listing status for submission
 *       403:
 *         description: Not authorized
 */
exports.listingRoutes.put("/:id/submit-approval", authMiddleware_1.protect, ListingController_1.ListingController.submitForApproval);
/**
 * @swagger
 * /api/listings/{id}:
 *   put:
 *     summary: Update a listing (Seller only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               generalInfo:
 *                 type: object
 *                 properties:
 *                   brand:
 *                     type: string
 *                   model:
 *                     type: string
 *                   year:
 *                     type: number
 *                   size:
 *                     type: string
 *                   condition:
 *                     type: string
 *               specs:
 *                 type: object
 *               pricing:
 *                 type: object
 *                 properties:
 *                   amount:
 *                     type: number
 *                   currency:
 *                     type: string
 *               media:
 *                 type: object
 *                 properties:
 *                   thumbnails:
 *                     type: array
 *                     items:
 *                       type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                   address:
 *                     type: string
 *           example:
 *             pricing:
 *               amount: 115000000
 *     responses:
 *       200:
 *         description: Listing updated successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Listing not found
 */
exports.listingRoutes.put("/:id", authMiddleware_1.protect, ListingController_1.ListingController.update);
/**
 * @swagger
 * /api/listings/{id}:
 *   delete:
 *     summary: Delete a listing (Seller only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Listing deleted successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Listing not found
 */
exports.listingRoutes.delete("/:id", authMiddleware_1.protect, ListingController_1.ListingController.delete);
/**
 * @swagger
 * /api/listings/{id}/view:
 *   put:
 *     summary: Increment view count
 *     tags: [Listings]
 */
exports.listingRoutes.put("/:id/view", ListingController_1.ListingController.incrementView);
/**
 * @swagger
 * /api/listings/{id}/boost:
 *   post:
 *     summary: Boost a listing to appear higher in search results (2 days per boost)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Listing boosted successfully for 2 days
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Listing boosted successfully for 2 days!"
 *                 data:
 *                   type: object
 *                   properties:
 *                     listing:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         boostedUntil:
 *                           type: string
 *                           format: date-time
 *                           description: Thời gian boost hết hạn
 *                         boostCount:
 *                           type: number
 *                           description: Tổng số lần đã boost listing này
 *                     boostUsage:
 *                       type: object
 *                       properties:
 *                         used:
 *                           type: number
 *                           description: Số lượt boost đã dùng trong tuần
 *                         limit:
 *                           type: number
 *                           description: Tổng số lượt boost/tuần
 *                         remaining:
 *                           type: number
 *                           description: Số lượt boost còn lại trong tuần
 *       400:
 *         description: Boost quota exceeded or invalid listing status
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Listing not found
 */
exports.listingRoutes.post("/:id/boost", authMiddleware_1.protect, ListingController_1.ListingController.boostListing);
//# sourceMappingURL=listingRoutes.js.map