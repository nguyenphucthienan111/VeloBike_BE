import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static readonly FROM_EMAIL =
    process.env.FROM_EMAIL || "noreply@velobike.vn";
  private static readonly FROM_NAME = process.env.FROM_NAME || "VeloBike";

  // Lazily created transporter
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT
      ? parseInt(process.env.SMTP_PORT, 10)
      : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !port || !user || !pass) {
      // SMTP not configured — keep transporter null to indicate mock mode
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  /**
   * Send email. If SMTP configured in env, use Nodemailer. Otherwise fallback to console log (mock).
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Debug log to help trace why emails from Swagger requests may not be sent
      console.log("EmailService.sendEmail invoked", {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER ? '***' : undefined,
        transporterInitialized: !!this.transporter,
        to: options.to,
        subject: options.subject,
      });

      const transporter = this.getTransporter();
      const from = `"${this.FROM_NAME}" <${this.FROM_EMAIL}>`;

      if (!transporter) {
        // Mock mode
        console.log("[EMAIL MOCK]", {
          from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        return true;
      }

      const info = await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log('EmailService.sendMail result:', info && (info.messageId || info.response));
      return true;
    } catch (error) {
      console.error("Email sending error:", error && (error.message || error));
      return false;
    }
  }

  static async sendOrderConfirmation(
    buyerEmail: string,
    orderId: string,
    orderDetails: any
  ): Promise<boolean> {
    const subject = `Xác nhận đơn hàng #${orderId}`;
    const html = `
      <h2>Xác nhận đơn hàng</h2>
      <p>Cảm ơn bạn đã đặt hàng tại VeloBike!</p>
      <p><strong>Mã đơn hàng:</strong> ${orderId}</p>
      <p><strong>Tổng tiền:</strong> ${orderDetails.totalAmount?.toLocaleString(
        "vi-VN"
      )} VND</p>
      <p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng được xử lý.</p>
    `;

    return this.sendEmail({ to: buyerEmail, subject, html });
  }

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
      <p><strong>Kết quả:</strong> ${
        verdict === "PASSED"
          ? "✅ ĐẠT"
          : verdict === "FAILED"
          ? "❌ KHÔNG ĐẠT"
          : "⚠️ CẦN ĐIỀU CHỈNH"
      }</p>
      <p><strong>Điểm số:</strong> ${score}/10</p>
      ${
        verdict === "PASSED"
          ? "<p>Xe đã được phê duyệt và sẽ được vận chuyển sớm.</p>"
          : ""
      }
      ${
        verdict === "FAILED"
          ? "<p>Xe không đạt yêu cầu. Tiền sẽ được hoàn lại.</p>"
          : ""
      }
    `;

    await this.sendEmail({ to: buyerEmail, subject, html });
    await this.sendEmail({ to: sellerEmail, subject, html });

    return true;
  }

  static async sendOrderShipped(
    buyerEmail: string,
    orderId: string,
    trackingNumber?: string
  ): Promise<boolean> {
    const subject = `Đơn hàng #${orderId} đã được gửi`;
    const html = `
      <h2>Đơn hàng đã được gửi</h2>
      <p>Đơn hàng #${orderId} của bạn đã được gửi đi.</p>
      ${
        trackingNumber
          ? `<p><strong>Mã vận đơn:</strong> ${trackingNumber}</p>`
          : ""
      }
      <p>Bạn sẽ nhận được hàng trong vòng 3-5 ngày làm việc.</p>
    `;

    return this.sendEmail({ to: buyerEmail, subject, html });
  }

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
