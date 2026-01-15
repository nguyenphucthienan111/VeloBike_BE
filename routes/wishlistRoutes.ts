import { Router } from "express";
import { WishlistController } from "../controllers/WishlistController";
import { protect } from "../middleware/authMiddleware";

export const wishlistRoutes = Router();

/**
 * @swagger
 * /api/wishlist:
 *   post:
 *     summary: Add listing to wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listingId
 *             properties:
 *               listingId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Added to wishlist
 */
wishlistRoutes.post("/", protect, WishlistController.addToWishlist as any);

/**
 * @swagger
 * /api/wishlist:
 *   get:
 *     summary: Get user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "-addedAt"
 *     responses:
 *       200:
 *         description: Wishlist items
 */
wishlistRoutes.get("/", protect, WishlistController.getWishlist as any);

/**
 * @swagger
 * /api/wishlist/check/{listingId}:
 *   get:
 *     summary: Check if listing is in wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Check result
 */
wishlistRoutes.get("/check/:listingId", protect, WishlistController.checkWishlist as any);

/**
 * @swagger
 * /api/wishlist/count:
 *   get:
 *     summary: Get wishlist item count
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist count
 */
wishlistRoutes.get("/count", protect, WishlistController.getWishlistCount as any);

/**
 * @swagger
 * /api/wishlist/clear:
 *   delete:
 *     summary: Clear all wishlist items
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist cleared
 */
wishlistRoutes.delete("/clear", protect, WishlistController.clearWishlist as any);

/**
 * @swagger
 * /api/wishlist/{listingId}:
 *   delete:
 *     summary: Remove listing from wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Removed from wishlist
 */
wishlistRoutes.delete("/:listingId", protect, WishlistController.removeFromWishlist as any);
