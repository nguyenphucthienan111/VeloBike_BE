import { Request, Response } from "express";
import { Notification } from "../models/Notification";

export class NotificationController {
  /**
   * Get user notifications
   * GET /api/notifications
   */
  static async getNotifications(req: any, res: any) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20 } = req.query;

      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Notification.countDocuments({ userId });
      const unreadCount = await Notification.countDocuments({ userId, isRead: false });

      res.json({
        success: true,
        data: notifications,
        pagination: {
          total,
          unreadCount,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Mark notification as read
   * PUT /api/notifications/:id/read
   */
  static async markAsRead(req: any, res: any) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const notification = await Notification.findOneAndUpdate(
        { _id: id, userId },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }

      res.json({ success: true, data: notification });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Mark all as read
   * PUT /api/notifications/read-all
   */
  static async markAllAsRead(req: any, res: any) {
    try {
      const userId = req.user?.id;

      await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );

      res.json({ success: true, message: "All notifications marked as read" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
