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
 *               - sellerId
 *               - title
 *               - type
 *               - generalInfo
 *               - pricing
 *             properties:
 *               sellerId:
 *                 type: string
 *                 description: ID of the user selling the bike
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ROAD, MTB, GRAVEL, TRIATHLON]
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
 *               pricing:
 *                 type: object
 *                 properties:
 *                   amount:
 *                     type: number
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
 * /api/listings/my-listings:
 *   get:
 *     summary: Get seller's listings
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 */
exports.listingRoutes.get("/my-listings", authMiddleware_1.protect, ListingController_1.ListingController.getMyListings);
/**
 * @swagger
 * /api/listings/{id}:
 *   put:
 *     summary: Update a listing (Seller only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
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
//# sourceMappingURL=listingRoutes.js.map