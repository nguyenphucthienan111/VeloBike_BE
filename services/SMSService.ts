import axios from "axios";

export class SMSService {
  private static readonly SMS_API_URL = process.env.SMS_API_URL || "mock";
  private static readonly SMS_API_KEY = process.env.SMS_API_KEY || "free";
  private static readonly SMS_SENDER = process.env.SMS_SENDER || "VeloBike";

  /**
   * Send SMS using mock service (Vietnam-friendly)
   */
  static async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Format phone number (remove +84, add 0)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Always use mock SMS for Vietnam
      console.log(`[SMS MOCK] Sending to ${formattedPhone}: ${message}`);
      
      // Simulate SMS sending delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mock success response
      console.log(`✅ SMS sent successfully to ${formattedPhone} (MOCK)`);
      return true;

      // Real SMS integration can be added later when needed:
      /*
      if (this.SMS_API_URL !== "mock" && this.SMS_API_KEY !== "free") {
        // Example for Vietnamese SMS provider (like VIETGUYS, SPEEDSMS, ESMS)
        const response = await axios.post(this.SMS_API_URL, {
          to: formattedPhone,
          content: message,
          sms_type: 2, // Brandname SMS
          sender: this.SMS_SENDER,
        }, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.SMS_API_KEY}`,
          },
        });

        if (response.data.status === "success") {
          console.log(`SMS sent successfully to ${formattedPhone}`);
          return true;
        } else {
          console.error("SMS sending failed:", response.data);
          return false;
        }
      }
      */
    } catch (error) {
      console.error("Failed to send SMS (using mock):", error);
      return true; // Return true for mock to not break the flow
    }
  }

  /**
   * Send OTP SMS
   */
  static async sendOTP(phoneNumber: string, code: string): Promise<boolean> {
    const message = `Your VeloBike verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send order notification SMS
   */
  static async sendOrderNotificationSMS(
    phoneNumber: string,
    orderId: string,
    status: string
  ): Promise<boolean> {
    const message = `VeloBike: Your order #${orderId} status is now ${status}. Check the app for details.`;
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send payment notification SMS
   */
  static async sendPaymentNotificationSMS(
    phoneNumber: string,
    amount: number,
    type: "received" | "failed" | "payout"
  ): Promise<boolean> {
    const messages = {
      received: `VeloBike: Payment of ${amount.toLocaleString()} VND received successfully.`,
      failed: `VeloBike: Payment of ${amount.toLocaleString()} VND failed. Please try again.`,
      payout: `VeloBike: Payout of ${amount.toLocaleString()} VND has been released to your account.`,
    };

    return this.sendSMS(phoneNumber, messages[type]);
  }

  /**
   * Send inspection notification SMS
   */
  static async sendInspectionNotificationSMS(
    phoneNumber: string,
    orderId: string,
    type: "assigned" | "completed" | "failed"
  ): Promise<boolean> {
    const messages = {
      assigned: `VeloBike: Inspection assigned for order #${orderId}. Please check the app.`,
      completed: `VeloBike: Inspection completed for order #${orderId}. Check results in the app.`,
      failed: `VeloBike: Inspection failed for order #${orderId}. Contact support for details.`,
    };

    return this.sendSMS(phoneNumber, messages[type]);
  }

  /**
   * Format phone number for Vietnamese providers
   */
  private static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let formatted = phoneNumber.replace(/\D/g, "");

    // Handle different formats
    if (formatted.startsWith("84")) {
      // +84 format -> 0 format
      formatted = "0" + formatted.substring(2);
    } else if (formatted.startsWith("0")) {
      // Already in correct format
      return formatted;
    } else if (formatted.length === 9) {
      // Missing leading 0
      formatted = "0" + formatted;
    }

    // Validate Vietnamese phone number format
    if (!/^0[3-9]\d{8}$/.test(formatted)) {
      console.warn(`Invalid Vietnamese phone number format: ${phoneNumber}`);
    }

    return formatted;
  }

  /**
   * Validate phone number
   */
  static isValidPhoneNumber(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    return /^0[3-9]\d{8}$/.test(formatted);
  }

  /**
   * Send bulk SMS
   */
  static async sendBulkSMS(phoneNumbers: string[], message: string): Promise<number> {
    let successCount = 0;

    for (const phoneNumber of phoneNumbers) {
      const success = await this.sendSMS(phoneNumber, message);
      if (success) {
        successCount++;
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Bulk SMS: ${successCount}/${phoneNumbers.length} sent successfully (MOCK)`);
    return successCount;
  }

  /**
   * Vietnamese SMS Providers Integration Guide
   * 
   * Recommended providers for Vietnam:
   * 1. ESMS.vn - https://esms.vn/
   * 2. VIETGUYS - https://vietguys.biz/
   * 3. SPEEDSMS - https://speedsms.vn/
   * 4. STRINGEE - https://stringee.com/
   * 
   * To integrate real SMS:
   * 1. Register with a Vietnamese SMS provider
   * 2. Get API credentials
   * 3. Update SMS_API_URL and SMS_API_KEY in .env
   * 4. Uncomment the real SMS code in sendSMS method
   * 
   * Example .env for ESMS:
   * SMS_API_URL=https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/
   * SMS_API_KEY=your_esms_api_key
   * SMS_SECRET_KEY=your_esms_secret_key
   */
}