import { Router } from "express";
import { BrandController } from "../controllers/BrandController";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

export const brandRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Brands
 *   description: Brand management endpoints
 */

/**
 * @swagger
 * /api/brands/popular:
 *   get:
 *     summary: Get popular brands (based on listing count)
 *     tags: [Brands]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of popular brands
 */
brandRoutes.get("/popular", BrandController.getPopular);

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: Get all brands
 *     tags: [Brands]
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by brand name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of brands
 */
brandRoutes.get("/", BrandController.getAll);

/**
 * @swagger
 * /api/brands/{id}:
 *   get:
 *     summary: Get brand by ID
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Brand details
 *       404:
 *         description: Brand not found
 */
brandRoutes.get("/:id", BrandController.getById);

/**
 * @swagger
 * /api/brands/{id}/stats:
 *   get:
 *     summary: Get brand statistics
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Brand statistics
 *       404:
 *         description: Brand not found
 */
brandRoutes.get("/:id/stats", BrandController.getStats);

/**
 * @swagger
 * /api/brands:
 *   post:
 *     summary: Create new brand (Admin only)
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Trek"
 *               slug:
 *                 type: string
 *                 example: "trek"
 *               description:
 *                 type: string
 *                 example: "American bicycle manufacturer"
 *               logo:
 *                 type: string
 *                 example: "https://example.com/trek-logo.png"
 *               country:
 *                 type: string
 *                 example: "USA"
 *               website:
 *                 type: string
 *                 example: "https://www.trekbikes.com"
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Brand created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
brandRoutes.post(
  "/",
  protect,
  authorize(UserRole.ADMIN),
  BrandController.create
);

/**
 * @swagger
 * /api/brands/{id}:
 *   put:
 *     summary: Update brand (Admin only)
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               logo:
 *                 type: string
 *               country:
 *                 type: string
 *               website:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Brand updated successfully
 *       404:
 *         description: Brand not found
 */
brandRoutes.put(
  "/:id",
  protect,
  authorize(UserRole.ADMIN),
  BrandController.update
);

/**
 * @swagger
 * /api/brands/{id}:
 *   delete:
 *     summary: Delete brand (Admin only)
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Brand deleted successfully
 *       400:
 *         description: Cannot delete - brand is in use
 *       404:
 *         description: Brand not found
 */
brandRoutes.delete(
  "/:id",
  protect,
  authorize(UserRole.ADMIN),
  BrandController.delete
);

/**
 * @swagger
 * /api/brands/{id}/toggle-active:
 *   put:
 *     summary: Toggle brand active status (Admin only)
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Brand status toggled successfully
 *       404:
 *         description: Brand not found
 */
brandRoutes.put(
  "/:id/toggle-active",
  protect,
  authorize(UserRole.ADMIN),
  BrandController.toggleActive
);

export default brandRoutes;
