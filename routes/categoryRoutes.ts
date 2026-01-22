import { Router } from "express";
import { CategoryController } from "../controllers/CategoryController";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

export const categoryRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management endpoints
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
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
 *         description: List of categories
 */
categoryRoutes.get("/", CategoryController.getAll);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
categoryRoutes.get("/:id", CategoryController.getById);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create new category (Admin only)
 *     tags: [Categories]
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
 *                 example: "Road Bikes"
 *               slug:
 *                 type: string
 *                 example: "road-bikes"
 *               description:
 *                 type: string
 *                 example: "High-performance road bicycles"
 *               icon:
 *                 type: string
 *                 example: "🚴"
 *               specsTemplate:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["frameMaterial", "groupset", "wheelset"]
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
categoryRoutes.post(
  "/",
  protect,
  authorize(UserRole.ADMIN),
  CategoryController.create
);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update category (Admin only)
 *     tags: [Categories]
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
 *               icon:
 *                 type: string
 *               specsTemplate:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 */
categoryRoutes.put(
  "/:id",
  protect,
  authorize(UserRole.ADMIN),
  CategoryController.update
);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete category (Admin only)
 *     tags: [Categories]
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
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete - category is in use
 *       404:
 *         description: Category not found
 */
categoryRoutes.delete(
  "/:id",
  protect,
  authorize(UserRole.ADMIN),
  CategoryController.delete
);

/**
 * @swagger
 * /api/categories/{id}/toggle-active:
 *   put:
 *     summary: Toggle category active status (Admin only)
 *     tags: [Categories]
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
 *         description: Category status toggled successfully
 *       404:
 *         description: Category not found
 */
categoryRoutes.put(
  "/:id/toggle-active",
  protect,
  authorize(UserRole.ADMIN),
  CategoryController.toggleActive
);

export default categoryRoutes;
