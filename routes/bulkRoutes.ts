import { Router } from "express";
import { BulkController } from "../controllers/BulkController";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";
import { validationRules, validate } from "../middleware/validationMiddleware";

export const bulkRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Bulk Operations
 *   description: Bulk operations for sellers and admins
 */

// Seller Bulk Operations
/**
 * @swagger
 * /api/bulk/listings/update-status:
 *   put:
 *     summary: Bulk update listing status (Seller)
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listingIds
 *               - status
 *             properties:
 *               listingIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED]
 */
bulkRoutes.put("/listings/update-status", protect, authorize(UserRole.SELLER), BulkController.bulkUpdateListingStatus as any);

/**
 * @swagger
 * /api/bulk/listings/delete:
 *   delete:
 *     summary: Bulk delete listings (Seller)
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 */
bulkRoutes.delete("/listings/delete", protect, authorize(UserRole.SELLER), BulkController.bulkDeleteListings as any);

/**
 * @swagger
 * /api/bulk/listings/update-price:
 *   put:
 *     summary: Bulk update listing prices (Seller)
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 */
bulkRoutes.put("/listings/update-price", protect, authorize(UserRole.SELLER), BulkController.bulkUpdatePrices as any);

// Admin Bulk Operations
/**
 * @swagger
 * /api/bulk/admin/users/update-status:
 *   put:
 *     summary: Bulk update user status (Admin)
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 */
bulkRoutes.put("/admin/users/update-status", protect, authorize(UserRole.ADMIN), BulkController.bulkUpdateUserStatus as any);

/**
 * @swagger
 * /api/bulk/admin/listings/moderate:
 *   put:
 *     summary: Bulk moderate listings (Admin)
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 */
bulkRoutes.put("/admin/listings/moderate", protect, authorize(UserRole.ADMIN), BulkController.bulkModerateListing as any);

/**
 * @swagger
 * /api/bulk/export/listings:
 *   get:
 *     summary: Export listings to CSV (Seller/Admin)
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 */
bulkRoutes.get("/export/listings", protect, authorize(UserRole.SELLER, UserRole.ADMIN), BulkController.exportListings as any);

/**
 * @swagger
 * /api/bulk/export/orders:
 *   get:
 *     summary: Export orders to CSV (Seller/Admin)
 *     tags: [Bulk Operations]
 *     security:
 *       - bearerAuth: []
 */
bulkRoutes.get("/export/orders", protect, authorize(UserRole.SELLER, UserRole.ADMIN), BulkController.exportOrders as any);