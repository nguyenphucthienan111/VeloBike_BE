// import * as admin from 'firebase-admin'; // Uncomment when firebase-admin is installed
import { User } from "../models/User";
import { Notification } from "../models/Notification";

export class NotificationService {
  
  // static init() {
  //   admin.initializeApp({
  //     credential: admin.credential.cert(serviceAccount),
  //   });
  // }

  /**
   * Send notification to user (multi-channel)
   */
  static async sendNotification(
    userId: string,
    title: string,
    message: string,
    data?: any,
    channels: ("database" | "push")[] = ["database", "push"]
  ): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.warn(`User ${userId} not found for notification`);
        return;
      }

      // 1. Save to database (always)
      if (channels.includes("database")) {
        await this.saveToDatabase(userId, title, message, data);
      }

      // 2. Send push notification
      if (channels.includes("push") && user.fcmToken) {
        await this.sendPushNotification(user.fcmToken, title, message, data);
      }

      console.log(`Notification sent to user ${userId}: ${title}`);
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }

  /**
   * Send Push Notification via FCM
   */
  static async sendPushNotification(fcmToken: string, title: string, body: string, data?: any) {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: fcmToken,
      };

      // Mock sending
      console.log(`[FCM] Sending push notification:`, message);
      
      // Real implementation:
      // await admin.messaging().send(message);
      
      return true;
    } catch (error) {
      console.error("[FCM] Error:", error);
      return false;
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendMulticast(userIds: string[], title: string, body: string, data?: any) {
    // Loop for now, efficient multicast in real FCM
    for (const id of userIds) {
      await this.sendNotification(id, title, body, data);
    }
  }

  /**
   * Send bulk notifications
   */
  static async sendBulkNotification(
    userIds: string[],
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    const promises = userIds.map(userId =>
      this.sendNotification(userId, title, message, data)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Send notification to all users with specific role
   */
  static async sendRoleNotification(
    role: string,
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    const users = await User.find({ role, isActive: true }).select("_id");
    const userIds = users.map(user => user._id.toString());
    
    await this.sendBulkNotification(userIds, title, message, data);
  }

  /**
   * Save notification to database
   */
  private static async saveToDatabase(
    userId: string,
    title: string,
    message: string,
    data?: any
  ): Promise<void> {
    try {
      const notification = new Notification({
        userId,
        title,
        message,
        data,
        isRead: false,
      });

      await notification.save();
    } catch (error) {
      console.error("Failed to save notification to database:", error);
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      return !!result;
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return result.modifiedCount;
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      return 0;
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ) {
    try {
      const query: any = { userId };
      if (unreadOnly) {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({ userId, isRead: false });

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      };
    } catch (error) {
      console.error("Failed to get user notifications:", error);
      return null;
    }
  }

  /**
   * Send order status notification
   */
  static async sendOrderStatusNotification(
    orderId: string,
    buyerId: string,
    sellerId: string,
    status: string,
    message: string
  ): Promise<void> {
    const data = { orderId, status, type: "order_update" };

    // Notify buyer
    await this.sendNotification(
      buyerId,
      "Order Update",
      message,
      data,
      ["database", "push"]
    );

    // Notify seller
    await this.sendNotification(
      sellerId,
      "Order Update",
      message,
      data,
      ["database", "push"]
    );
  }

  /**
   * Send payment notification
   */
  static async sendPaymentNotification(
    userId: string,
    type: "payment_received" | "payment_failed" | "payout_released",
    amount: number,
    orderId?: string
  ): Promise<void> {
    const titles = {
      payment_received: "Payment Received",
      payment_failed: "Payment Failed",
      payout_released: "Payout Released",
    };

    const messages = {
      payment_received: `Payment of ${amount.toLocaleString()} VND has been received`,
      payment_failed: `Payment of ${amount.toLocaleString()} VND has failed`,
      payout_released: `Payout of ${amount.toLocaleString()} VND has been released to your account`,
    };

    await this.sendNotification(
      userId,
      titles[type],
      messages[type],
      { type, amount, orderId },
      ["database", "push"]
    );
  }

  /**
   * Send inspection notification
   */
  static async sendInspectionNotification(
    userId: string,
    type: "inspection_assigned" | "inspection_completed" | "inspection_failed",
    orderId: string,
    details?: string
  ): Promise<void> {
    const titles = {
      inspection_assigned: "Inspection Assigned",
      inspection_completed: "Inspection Completed",
      inspection_failed: "Inspection Failed",
    };

    const messages = {
      inspection_assigned: "An inspection has been assigned to you",
      inspection_completed: "Inspection has been completed successfully",
      inspection_failed: "Inspection has failed",
    };

    await this.sendNotification(
      userId,
      titles[type],
      details || messages[type],
      { type, orderId },
      ["database", "push"]
    );
  }
}
