"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wishlistRoutes = void 0;
const express_1 = require("express");
const WishlistController_1 = require("../controllers/WishlistController");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.wishlistRoutes = (0, express_1.Router)();
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
exports.wishlistRoutes.post("/", authMiddleware_1.protect, WishlistController_1.WishlistController.addToWishlist);
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
exports.wishlistRoutes.get("/", authMiddleware_1.protect, WishlistController_1.WishlistController.getWishlist);
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
exports.wishlistRoutes.get("/check/:listingId", authMiddleware_1.protect, WishlistController_1.WishlistController.checkWishlist);
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
exports.wishlistRoutes.get("/count", authMiddleware_1.protect, WishlistController_1.WishlistController.getWishlistCount);
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
exports.wishlistRoutes.delete("/clear", authMiddleware_1.protect, WishlistController_1.WishlistController.clearWishlist);
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
exports.wishlistRoutes.delete("/:listingId", authMiddleware_1.protect, WishlistController_1.WishlistController.removeFromWishlist);
//# sourceMappingURL=wishlistRoutes.js.map