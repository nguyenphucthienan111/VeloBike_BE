/**
 * Email Notification Service
 * Basic email service using Nodemailer (or similar)
 * 
 * Note: This is a basic implementation. In production, use:
 * - Nodemailer with SMTP
 * - SendGrid
 * - AWS SES
 * - Mailgun
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static readonly FROM_EMAIL = process.env.FROM_EMAIL || "noreply@velobike.vn";
  private static readonly FROM_NAME = process.env.FROM_NAME || "VeloBike";

  /**
   * Send email (mock implementation)
   * In production, integrate with actual email service
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // TODO: Implement actual email sending
      // Example with Nodemailer:
      /*
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"${this.FROM_NAME}" <${this.FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      */

      // For now, just log
      console.log(`[EMAIL] To: ${options.to}, Subject: ${options.subject}`);
      return true;
    } catch (error) {
      console.error("Email sending error:", error);
      return false;
    }
  }

  /**
   * Send order confirmation email to buyer
   */
  static async sendOrderConfirmation(buyerEmail: string, orderId: string, orderDetails: any): Promise<boolean> {
    const subject = `Xác nhận đơn hàng #${orderId}`;
    const html = `
      <h2>Xác nhận đơn hàng</h2>
      <p>Cảm ơn bạn đã đặt hàng tại VeloBike!</p>
      <p><strong>Mã đơn hàng:</strong> ${orderId}</p>
      <p><strong>Tổng tiền:</strong> ${orderDetails.totalAmount?.toLocaleString("vi-VN")} VND</p>
      <p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng được xử lý.</p>
    `;

    return this.sendEmail({ to: buyerEmail, subject, html });
  }

  /**
   * Send payment confirmation email
   */
  static async sendPaymentConfirmation(
    buyerEmail: string,
    orderId: string,
    amount: number
  ): Promise<boolean> {
    const subject = `Xác nhận thanh toán đơn hàng #${orderId}`;
    const html = `
      <h2>Thanh toán thành công</h2>
      <p>Đơn hàng #${orderId} của bạn đã được thanh toán thành công.</p>
      <p><strong>Số tiền:</strong> ${amount.toLocaleString("vi-VN")} VND</p>
      <p>Đơn hàng đang được kiểm định. Chúng tôi sẽ thông báo kết quả sớm nhất.</p>
    `;

    return this.sendEmail({ to: buyerEmail, subject, html });
  }

  /**
   * Send inspection result email
   */
  static async sendInspectionResult(
    buyerEmail: string,
    sellerEmail: string,
    orderId: string,
    verdict: string,
    score: number
  ): Promise<boolean> {
    const subject = `Kết quả kiểm định đơn hàng #${orderId}`;
    const html = `
      <h2>Kết quả kiểm định</h2>
      <p>Đơn hàng #${orderId} đã hoàn tất kiểm định.</p>
      <p><strong>Kết quả:</strong> ${verdict === "PASSED" ? "✅ ĐẠT" : verdict === "FAILED" ? "❌ KHÔNG ĐẠT" : "⚠️ CẦN ĐIỀU CHỈNH"}</p>
      <p><strong>Điểm số:</strong> ${score}/10</p>
      ${verdict === "PASSED" ? "<p>Xe đã được phê duyệt và sẽ được vận chuyển sớm.</p>" : ""}
      ${verdict === "FAILED" ? "<p>Xe không đạt yêu cầu. Tiền sẽ được hoàn lại.</p>" : ""}
    `;

    // Send to both buyer and seller
    await this.sendEmail({ to: buyerEmail, subject, html });
    await this.sendEmail({ to: sellerEmail, subject, html });

    return true;
  }

  /**
   * Send order shipped notification
   */
  static async sendOrderShipped(buyerEmail: string, orderId: string, trackingNumber?: string): Promise<boolean> {
    const subject = `Đơn hàng #${orderId} đã được gửi`;
    const html = `
      <h2>Đơn hàng đã được gửi</h2>
      <p>Đơn hàng #${orderId} của bạn đã được gửi đi.</p>
      ${trackingNumber ? `<p><strong>Mã vận đơn:</strong> ${trackingNumber}</p>` : ""}
      <p>Bạn sẽ nhận được hàng trong vòng 3-5 ngày làm việc.</p>
    `;

    return this.sendEmail({ to: buyerEmail, subject, html });
  }

  /**
   * Send order completed notification
   */
  static async sendOrderCompleted(
    buyerEmail: string,
    sellerEmail: string,
    orderId: string
  ): Promise<boolean> {
    const subject = `Đơn hàng #${orderId} đã hoàn tất`;
    const html = `
      <h2>Đơn hàng đã hoàn tất</h2>
      <p>Đơn hàng #${orderId} đã được hoàn tất thành công.</p>
      <p>Cảm ơn bạn đã sử dụng dịch vụ của VeloBike!</p>
    `;

    await this.sendEmail({ to: buyerEmail, subject, html });
    await this.sendEmail({ to: sellerEmail, subject, html });

    return true;
  }

  /**
   * Send dispute notification to admin
   */
  static async sendDisputeNotification(
    adminEmail: string,
    disputeId: string,
    orderId: string,
    reason: string
  ): Promise<boolean> {
    const subject = `Có tranh chấp mới #${disputeId}`;
    const html = `
      <h2>Tranh chấp mới</h2>
      <p>Có một tranh chấp mới cần xử lý.</p>
      <p><strong>Mã tranh chấp:</strong> ${disputeId}</p>
      <p><strong>Mã đơn hàng:</strong> ${orderId}</p>
      <p><strong>Lý do:</strong> ${reason}</p>
      <p>Vui lòng đăng nhập vào admin panel để xử lý.</p>
    `;

    return this.sendEmail({ to: adminEmail, subject, html });
  }
}

