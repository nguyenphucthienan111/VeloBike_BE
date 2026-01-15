import nodemailer from "nodemailer";

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  /**
   * Send verification email
   */
  static async sendVerificationEmail(email: string, name: string, code: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"VeloBike" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "🚴 Xác thực email của bạn - VeloBike",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f4f8; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                    
                    <!-- Header with gradient -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 50px 40px; text-align: center;">
                        <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 50%; padding: 16px; margin-bottom: 16px;">
                          <span style="font-size: 40px;">🚴</span>
                        </div>
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">VeloBike</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Sàn giao dịch xe đạp thể thao</p>
                      </td>
                    </tr>
                    
                    <!-- Main content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="color: #1a202c; margin: 0 0 8px 0; font-size: 22px; font-weight: 600;">Xin chào ${name}! 👋</h2>
                        <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px; line-height: 1.6;">
                          Cảm ơn bạn đã đăng ký tài khoản VeloBike. Để hoàn tất đăng ký, vui lòng nhập mã xác thực bên dưới:
                        </p>
                        
                        <!-- OTP Code Box -->
                        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px dashed #cbd5e1; border-radius: 12px; padding: 28px; text-align: center; margin: 24px 0;">
                          <p style="color: #64748b; margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Mã xác thực của bạn</p>
                          <div style="font-size: 40px; font-weight: 700; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</div>
                        </div>
                        
                        <!-- Timer warning -->
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 24px 0;">
                          <p style="color: #92400e; margin: 0; font-size: 14px;">
                            ⏱️ <strong>Lưu ý:</strong> Mã này sẽ hết hạn sau <strong>15 phút</strong>
                          </p>
                        </div>
                        
                        <!-- Security note -->
                        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
                          🔒 Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Divider -->
                    <tr>
                      <td style="padding: 0 40px;">
                        <div style="border-top: 1px solid #e2e8f0;"></div>
                      </td>
                    </tr>
                    
                    <!-- Features section -->
                    <tr>
                      <td style="padding: 32px 40px;">
                        <p style="color: #64748b; margin: 0 0 20px 0; font-size: 14px; font-weight: 600;">Sau khi xác thực, bạn có thể:</p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td width="33%" style="text-align: center; padding: 8px;">
                              <div style="background: #f0fdf4; border-radius: 12px; padding: 16px 8px;">
                                <span style="font-size: 24px;">🛒</span>
                                <p style="color: #166534; margin: 8px 0 0 0; font-size: 12px; font-weight: 500;">Mua xe đạp</p>
                              </div>
                            </td>
                            <td width="33%" style="text-align: center; padding: 8px;">
                              <div style="background: #eff6ff; border-radius: 12px; padding: 16px 8px;">
                                <span style="font-size: 24px;">💬</span>
                                <p style="color: #1e40af; margin: 8px 0 0 0; font-size: 12px; font-weight: 500;">Chat với người bán</p>
                              </div>
                            </td>
                            <td width="33%" style="text-align: center; padding: 8px;">
                              <div style="background: #fdf4ff; border-radius: 12px; padding: 16px 8px;">
                                <span style="font-size: 24px;">⭐</span>
                                <p style="color: #86198f; margin: 8px 0 0 0; font-size: 12px; font-weight: 500;">Đánh giá sản phẩm</p>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background: #f8fafc; padding: 28px 40px; text-align: center;">
                        <p style="color: #64748b; margin: 0 0 12px 0; font-size: 14px;">
                          Cần hỗ trợ? Liên hệ <a href="mailto:support@velobike.vn" style="color: #667eea; text-decoration: none; font-weight: 500;">support@velobike.vn</a>
                        </p>
                        <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                          © 2025 VeloBike. All rights reserved.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error("Failed to send verification email:", error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, name: string, code: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"VeloBike" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Password Reset - VeloBike",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Use the code below to reset your password:</p>
            <div style="background: #fef2f2; padding: 20px; text-align: center; margin: 20px 0; border: 1px solid #fecaca;">
              <h1 style="color: #dc2626; font-size: 32px; margin: 0;">${code}</h1>
            </div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Best regards,<br>
              The VeloBike Team
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return false;
    }
  }

  /**
   * Send notification email
   */
  static async sendNotificationEmail(
    email: string,
    name: string,
    title: string,
    message: string
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"VeloBike" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `${title} - VeloBike`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">${title}</h2>
            <p>Hi ${name},</p>
            <p>${message}</p>
            <p>You can check your account for more details.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Best regards,<br>
              The VeloBike Team
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Notification email sent to ${email}: ${title}`);
      return true;
    } catch (error) {
      console.error("Failed to send notification email:", error);
      return false;
    }
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmationEmail(
    email: string,
    name: string,
    orderId: string,
    itemName: string,
    amount: number
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"VeloBike" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Order Confirmation - VeloBike",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Order Confirmed!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for your order. Here are the details:</p>
            <div style="background: #f0fdf4; padding: 20px; margin: 20px 0; border: 1px solid #bbf7d0;">
              <h3 style="margin: 0 0 10px 0;">Order #${orderId}</h3>
              <p><strong>Item:</strong> ${itemName}</p>
              <p><strong>Amount:</strong> ${amount.toLocaleString()} VND</p>
            </div>
            <p>We'll notify you once your order is processed and ready for inspection.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Best regards,<br>
              The VeloBike Team
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Order confirmation email sent to ${email}`);
      return true;
    } catch (error) {
      console.error("Failed to send order confirmation email:", error);
      return false;
    }
  }

  /**
   * Send KYC status email
   */
  static async sendKycStatusEmail(
    email: string,
    name: string,
    status: "VERIFIED" | "REJECTED",
    note?: string
  ): Promise<boolean> {
    try {
      const isApproved = status === "VERIFIED";
      const color = isApproved ? "#059669" : "#dc2626";
      const bgColor = isApproved ? "#f0fdf4" : "#fef2f2";
      const borderColor = isApproved ? "#bbf7d0" : "#fecaca";

      const mailOptions = {
        from: `"VeloBike" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `KYC ${status} - VeloBike`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${color};">KYC ${status}</h2>
            <p>Hi ${name},</p>
            <p>Your identity verification has been ${status.toLowerCase()}.</p>
            <div style="background: ${bgColor}; padding: 20px; margin: 20px 0; border: 1px solid ${borderColor};">
              <h3 style="margin: 0 0 10px 0; color: ${color};">Status: ${status}</h3>
              ${note ? `<p><strong>Note:</strong> ${note}</p>` : ""}
            </div>
            ${
              isApproved
                ? "<p>You can now start selling on VeloBike!</p>"
                : "<p>Please contact support if you have any questions about this decision.</p>"
            }
            <hr style="margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Best regards,<br>
              The VeloBike Team
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`KYC status email sent to ${email}: ${status}`);
      return true;
    } catch (error) {
      console.error("Failed to send KYC status email:", error);
      return false;
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"VeloBike" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Welcome to VeloBike!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to VeloBike!</h2>
            <p>Hi ${name},</p>
            <p>Welcome to VeloBike - the premier marketplace for buying and selling sports bicycles!</p>
            <p>Here's what you can do:</p>
            <ul>
              <li>🚲 Browse thousands of quality bikes</li>
              <li>💬 Chat directly with sellers</li>
              <li>🔍 Get professional inspections</li>
              <li>💳 Secure escrow payments</li>
              <li>⭐ Build your reputation</li>
            </ul>
            <p>Ready to start your cycling journey? Explore our marketplace now!</p>
            <hr style="margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Happy cycling,<br>
              The VeloBike Team
            </p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      return false;
    }
  }
}