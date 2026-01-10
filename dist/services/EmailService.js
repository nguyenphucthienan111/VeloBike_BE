"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    /**
     * Send verification email
     */
    static sendVerificationEmail(email, name, code) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const mailOptions = {
                    from: `"VeloBike" <${process.env.SMTP_USER}>`,
                    to: email,
                    subject: "Verify Your Email - VeloBike",
                    html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to VeloBike!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for registering with VeloBike. Please verify your email address using the code below:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #1f2937; font-size: 32px; margin: 0;">${code}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't create an account with VeloBike, please ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Best regards,<br>
              The VeloBike Team
            </p>
          </div>
        `,
                };
                yield this.transporter.sendMail(mailOptions);
                console.log(`Verification email sent to ${email}`);
                return true;
            }
            catch (error) {
                console.error("Failed to send verification email:", error);
                return false;
            }
        });
    }
    /**
     * Send password reset email
     */
    static sendPasswordResetEmail(email, name, code) {
        return __awaiter(this, void 0, void 0, function* () {
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
                yield this.transporter.sendMail(mailOptions);
                console.log(`Password reset email sent to ${email}`);
                return true;
            }
            catch (error) {
                console.error("Failed to send password reset email:", error);
                return false;
            }
        });
    }
    /**
     * Send notification email
     */
    static sendNotificationEmail(email, name, title, message) {
        return __awaiter(this, void 0, void 0, function* () {
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
                yield this.transporter.sendMail(mailOptions);
                console.log(`Notification email sent to ${email}: ${title}`);
                return true;
            }
            catch (error) {
                console.error("Failed to send notification email:", error);
                return false;
            }
        });
    }
    /**
     * Send order confirmation email
     */
    static sendOrderConfirmationEmail(email, name, orderId, itemName, amount) {
        return __awaiter(this, void 0, void 0, function* () {
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
                yield this.transporter.sendMail(mailOptions);
                console.log(`Order confirmation email sent to ${email}`);
                return true;
            }
            catch (error) {
                console.error("Failed to send order confirmation email:", error);
                return false;
            }
        });
    }
    /**
     * Send KYC status email
     */
    static sendKycStatusEmail(email, name, status, note) {
        return __awaiter(this, void 0, void 0, function* () {
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
            ${isApproved
                        ? "<p>You can now start selling on VeloBike!</p>"
                        : "<p>Please contact support if you have any questions about this decision.</p>"}
            <hr style="margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Best regards,<br>
              The VeloBike Team
            </p>
          </div>
        `,
                };
                yield this.transporter.sendMail(mailOptions);
                console.log(`KYC status email sent to ${email}: ${status}`);
                return true;
            }
            catch (error) {
                console.error("Failed to send KYC status email:", error);
                return false;
            }
        });
    }
    /**
     * Send welcome email
     */
    static sendWelcomeEmail(email, name) {
        return __awaiter(this, void 0, void 0, function* () {
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
                yield this.transporter.sendMail(mailOptions);
                console.log(`Welcome email sent to ${email}`);
                return true;
            }
            catch (error) {
                console.error("Failed to send welcome email:", error);
                return false;
            }
        });
    }
}
exports.EmailService = EmailService;
EmailService.transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
//# sourceMappingURL=EmailService.js.map