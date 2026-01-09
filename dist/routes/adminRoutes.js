"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = require("express");
const AdminController_1 = require("../controllers/AdminController");
const CategoryController_1 = require("../controllers/CategoryController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
exports.adminRoutes = (0, express_1.Router)();
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
exports.adminRoutes.get("/dashboard", AdminController_1.AdminController.getDashboard);
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
exports.adminRoutes.get("/users", AdminController_1.AdminController.getAllUsers);
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
exports.adminRoutes.put("/users/:userId/kyc", AdminController_1.AdminController.updateUserKyc);
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
exports.adminRoutes.put("/users/:userId/status", AdminController_1.AdminController.updateUserStatus);
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
exports.adminRoutes.get("/listings", AdminController_1.AdminController.getAllListings);
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
exports.adminRoutes.put("/listings/:listingId/status", AdminController_1.AdminController.updateListingStatus);
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
exports.adminRoutes.get("/orders", AdminController_1.AdminController.getAllOrders);
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
exports.adminRoutes.get("/analytics", AdminController_1.AdminController.getAnalytics);
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
exports.adminRoutes.get("/settings", AdminController_1.AdminController.getSettings);
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
exports.adminRoutes.put("/settings", AdminController_1.AdminController.updateSettings);
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
exports.adminRoutes.get("/categories", CategoryController_1.CategoryController.getAll);
/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
exports.adminRoutes.post("/categories", CategoryController_1.CategoryController.create);
/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
exports.adminRoutes.put("/categories/:id", CategoryController_1.CategoryController.update);
/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
exports.adminRoutes.delete("/categories/:id", CategoryController_1.CategoryController.delete);
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
exports.adminRoutes.get("/brands", CategoryController_1.BrandController.getAll);
/**
 * @swagger
 * /api/admin/brands:
 *   post:
 *     summary: Create a new brand
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
exports.adminRoutes.post("/brands", CategoryController_1.BrandController.create);
/**
 * @swagger
 * /api/admin/brands/{id}:
 *   put:
 *     summary: Update a brand
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
exports.adminRoutes.put("/brands/:id", CategoryController_1.BrandController.update);
/**
 * @swagger
 * /api/admin/brands/{id}:
 *   delete:
 *     summary: Delete a brand
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
exports.adminRoutes.delete("/brands/:id", CategoryController_1.BrandController.delete);
/**
 * @swagger
 * /api/admin/orders/{id}/payout:
 *   put:
 *     summary: Release payout to seller (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
exports.adminRoutes.put("/orders/:id/payout", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.ADMIN), AdminController_1.AdminController.releasePayout);
/**
 * @swagger
 * /api/admin/inspectors:
 *   get:
 *     summary: Get all inspectors
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
exports.adminRoutes.get("/inspectors", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.ADMIN), AdminController_1.AdminController.getAllInspectors);
//# sourceMappingURL=adminRoutes.js.map