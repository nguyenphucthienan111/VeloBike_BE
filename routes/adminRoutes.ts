import { Router } from "express";
import { AdminController } from "../controllers/AdminController";
import { CategoryController } from "../controllers/CategoryController";
import { BrandController } from "../controllers/BrandController";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

export const adminRoutes = Router();

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
adminRoutes.get("/dashboard", AdminController.getDashboard as any);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [BUYER, SELLER, INSPECTOR, ADMIN]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Users list
 */
adminRoutes.get("/users", AdminController.getAllUsers as any);

/**
 * @swagger
 * /api/admin/users/{userId}/kyc:
 *   put:
 *     summary: Update user KYC status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kycStatus
 *             properties:
 *               kycStatus:
 *                 type: string
 *                 enum: [PENDING, VERIFIED, REJECTED]
 *     responses:
 *       200:
 *         description: KYC status updated
 */
adminRoutes.put("/users/:userId/kyc", AdminController.updateUserKyc as any);

/**
 * @swagger
 * /api/admin/users/{userId}/status:
 *   put:
 *     summary: Ban or activate user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User status updated
 */
adminRoutes.put("/users/:userId/status", AdminController.updateUserStatus as any);

/**
 * @swagger
 * /api/admin/listings:
 *   get:
 *     summary: Get all listings for moderation
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, IN_INSPECTION, SOLD]
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Listings list
 */
adminRoutes.get("/listings", AdminController.getAllListings as any);

/**
 * @swagger
 * /api/admin/listings/{listingId}/status:
 *   put:
 *     summary: Update listing status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PUBLISHED, REJECTED, SOLD]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Listing status updated
 */
adminRoutes.put("/listings/:listingId/status", AdminController.updateListingStatus as any);

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Orders list
 */
adminRoutes.get("/orders", AdminController.getAllOrders as any);

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     summary: Get system analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Analytics data
 */
adminRoutes.get("/analytics", AdminController.getAnalytics as any);

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get platform settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform settings
 */
adminRoutes.get("/settings", AdminController.getSettings as any);

/**
 * @swagger
 * /api/admin/settings:
 *   put:
 *     summary: Update platform settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platformFeePercentage:
 *                 type: number
 *               inspectionFee:
 *                 type: number
 *               shippingFee:
 *                 type: number
 *     responses:
 *       200:
 *         description: Settings updated
 */
adminRoutes.put("/settings", AdminController.updateSettings as any);

// Category Management Routes
/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
adminRoutes.get("/categories", CategoryController.getAll as any);

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
adminRoutes.post("/categories", CategoryController.create as any);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
adminRoutes.put("/categories/:id", CategoryController.update as any);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
adminRoutes.delete("/categories/:id", CategoryController.delete as any);

// Brand Management Routes
/**
 * @swagger
 * /api/admin/brands:
 *   get:
 *     summary: Get all brands
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
adminRoutes.get("/brands", BrandController.getAll as any);

/**
 * @swagger
 * /api/admin/brands:
 *   post:
 *     summary: Create a new brand
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
adminRoutes.post("/brands", BrandController.create as any);

/**
 * @swagger
 * /api/admin/brands/{id}:
 *   put:
 *     summary: Update a brand
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
adminRoutes.put("/brands/:id", BrandController.update as any);

/**
 * @swagger
 * /api/admin/brands/{id}:
 *   delete:
 *     summary: Delete a brand
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
adminRoutes.delete("/brands/:id", BrandController.delete as any);

/**
 * @swagger
 * /api/admin/orders/{id}/payout:
 *   put:
 *     summary: Release payout to seller (Admin only)
 *     description: Giải ngân tiền cho seller sau khi order hoàn tất. Tự động phân chia tiền cho seller, inspector, và platform.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *         example: "696cba63ad1e5d95a2bcde45"
 *     responses:
 *       200:
 *         description: Payout released successfully
 *       400:
 *         description: Order not in correct status
 *       403:
 *         description: Admin only
 *       404:
 *         description: Order not found
 */
adminRoutes.put("/orders/:id/payout", protect, authorize(UserRole.ADMIN), AdminController.releasePayout as any);
adminRoutes.put("/orders/:id/assign-inspector", protect, authorize(UserRole.ADMIN), AdminController.assignInspector as any);

/**
 * @swagger
 * /api/admin/inspectors:
 *   get:
 *     summary: Get all inspectors
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
adminRoutes.get("/inspectors", protect, authorize(UserRole.ADMIN), AdminController.getAllInspectors as any);
