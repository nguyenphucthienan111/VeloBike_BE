// import * as admin from 'firebase-admin'; // Uncomment when firebase-admin is installed
import { User } from "../models/User";

export class NotificationService {
  
  // static init() {
  //   admin.initializeApp({
  //     credential: admin.credential.cert(serviceAccount),
  //   });
  // }

  /**
   * Send Push Notification
   */
  static async sendNotification(userId: string, title: string, body: string, data?: any) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.fcmToken) {
        console.log(`[Notification] User ${userId} has no FCM token. Skipped: ${title}`);
        return;
      }

      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: user.fcmToken,
      };

      // Mock sending
      console.log(`[Notification] Sending to ${user.email} (${user.fcmToken}):`, message);
      
      // Real implementation:
      // await admin.messaging().send(message);
      
      return true;
    } catch (error) {
      console.error("[Notification] Error:", error);
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
}
