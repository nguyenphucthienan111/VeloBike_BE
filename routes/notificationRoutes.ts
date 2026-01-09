import { Router } from "express";
import { NotificationController } from "../controllers/NotificationController";
import { protect } from "../middleware/authMiddleware";

export const notificationRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notification management
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
notificationRoutes.get("/", protect, NotificationController.getNotifications as any);

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
notificationRoutes.put("/read-all", protect, NotificationController.markAllAsRead as any);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark specific notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
notificationRoutes.put("/:id/read", protect, NotificationController.markAsRead as any);
