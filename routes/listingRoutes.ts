import { Router } from "express";
import { ListingController } from "../controllers/ListingController";
import { validationRules, validate } from "../middleware/validationMiddleware";
import { protect } from "../middleware/authMiddleware";

export const listingRoutes = Router();

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
listingRoutes.get("/", ListingController.getAll as any);

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
listingRoutes.get("/:id", ListingController.getById as any);

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
listingRoutes.post("/", protect, validationRules.createListing, validate, ListingController.create as any);

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
listingRoutes.get("/nearby", ListingController.getNearby as any);

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
listingRoutes.get("/search/advanced", ListingController.advancedSearch as any);

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
listingRoutes.get("/search/suggestions", ListingController.getSearchSuggestions as any);

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
listingRoutes.get("/search/facets", ListingController.getSearchFacets as any);

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
listingRoutes.post("/search/save", protect, ListingController.saveSearch as any);

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
listingRoutes.post("/fit-calculator", validationRules.fitCalculator, validate, ListingController.fitCalculator as any);

/**
 * @swagger
 * /api/listings/my-listings:
 *   get:
 *     summary: Get seller's listings
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 */
listingRoutes.get("/my-listings", protect, ListingController.getMyListings as any);

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
listingRoutes.put("/:id/submit-approval", protect, ListingController.submitForApproval as any);

/**
 * @swagger
 * /api/listings/{id}:
 *   put:
 *     summary: Update a listing (Seller only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 */
listingRoutes.put("/:id", protect, ListingController.update as any);

/**
 * @swagger
 * /api/listings/{id}:
 *   delete:
 *     summary: Delete a listing (Seller only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 */
listingRoutes.delete("/:id", protect, ListingController.delete as any);

/**
 * @swagger
 * /api/listings/{id}/view:
 *   put:
 *     summary: Increment view count
 *     tags: [Listings]
 */
listingRoutes.put("/:id/view", ListingController.incrementView as any);
