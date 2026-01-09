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
    static getTransporter() {
        if (this.transporter)
            return this.transporter;
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
        this.transporter = nodemailer_1.default.createTransport({
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
    static sendEmail(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Debug log to help trace why emails from Swagger requests may not be sent
                console.log("EmailService.sendEmail invoked", {
                    SMTP_HOST: process.env.SMTP_HOST,
                    SMTP_PORT: process.env.SMTP_PORT,
                    SMTP_USER: process.env.SMTP_USER ? "***" : undefined,
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
                const info = yield transporter.sendMail({
                    from,
                    to: options.to,
                    subject: options.subject,
                    text: options.text,
                    html: options.html,
                });
                console.log("EmailService.sendMail result:", info && (info.messageId || info.response));
                return true;
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error("Email sending error:", error.message);
                }
                else {
                    console.error("Email sending error:", error);
                }
                return false;
            }
        });
    }
    static sendOrderConfirmation(buyerEmail, orderId, orderDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const subject = `Xác nhận đơn hàng #${orderId}`;
            const html = `
      <h2>Xác nhận đơn hàng</h2>
      <p>Cảm ơn bạn đã đặt hàng tại VeloBike!</p>
      <p><strong>Mã đơn hàng:</strong> ${orderId}</p>
      <p><strong>Tổng tiền:</strong> ${(_a = orderDetails.totalAmount) === null || _a === void 0 ? void 0 : _a.toLocaleString("vi-VN")} VND</p>
      <p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng được xử lý.</p>
    `;
            return this.sendEmail({ to: buyerEmail, subject, html });
        });
    }
    static sendPaymentConfirmation(buyerEmail, orderId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const subject = `Xác nhận thanh toán đơn hàng #${orderId}`;
            const html = `
      <h2>Thanh toán thành công</h2>
      <p>Đơn hàng #${orderId} của bạn đã được thanh toán thành công.</p>
      <p><strong>Số tiền:</strong> ${amount.toLocaleString("vi-VN")} VND</p>
      <p>Đơn hàng đang được kiểm định. Chúng tôi sẽ thông báo kết quả sớm nhất.</p>
    `;
            return this.sendEmail({ to: buyerEmail, subject, html });
        });
    }
    static sendInspectionResult(buyerEmail, sellerEmail, orderId, verdict, score) {
        return __awaiter(this, void 0, void 0, function* () {
            const subject = `Kết quả kiểm định đơn hàng #${orderId}`;
            const html = `
      <h2>Kết quả kiểm định</h2>
      <p>Đơn hàng #${orderId} đã hoàn tất kiểm định.</p>
      <p><strong>Kết quả:</strong> ${verdict === "PASSED"
                ? "✅ ĐẠT"
                : verdict === "FAILED"
                    ? "❌ KHÔNG ĐẠT"
                    : "⚠️ CẦN ĐIỀU CHỈNH"}</p>
      <p><strong>Điểm số:</strong> ${score}/10</p>
      ${verdict === "PASSED"
                ? "<p>Xe đã được phê duyệt và sẽ được vận chuyển sớm.</p>"
                : ""}
      ${verdict === "FAILED"
                ? "<p>Xe không đạt yêu cầu. Tiền sẽ được hoàn lại.</p>"
                : ""}
    `;
            yield this.sendEmail({ to: buyerEmail, subject, html });
            yield this.sendEmail({ to: sellerEmail, subject, html });
            return true;
        });
    }
    static sendOrderShipped(buyerEmail, orderId, trackingNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const subject = `Đơn hàng #${orderId} đã được gửi`;
            const html = `
      <h2>Đơn hàng đã được gửi</h2>
      <p>Đơn hàng #${orderId} của bạn đã được gửi đi.</p>
      ${trackingNumber
                ? `<p><strong>Mã vận đơn:</strong> ${trackingNumber}</p>`
                : ""}
      <p>Bạn sẽ nhận được hàng trong vòng 3-5 ngày làm việc.</p>
    `;
            return this.sendEmail({ to: buyerEmail, subject, html });
        });
    }
    static sendOrderCompleted(buyerEmail, sellerEmail, orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const subject = `Đơn hàng #${orderId} đã hoàn tất`;
            const html = `
      <h2>Đơn hàng đã hoàn tất</h2>
      <p>Đơn hàng #${orderId} đã được hoàn tất thành công.</p>
      <p>Cảm ơn bạn đã sử dụng dịch vụ của VeloBike!</p>
    `;
            yield this.sendEmail({ to: buyerEmail, subject, html });
            yield this.sendEmail({ to: sellerEmail, subject, html });
            return true;
        });
    }
    static sendDisputeNotification(adminEmail, disputeId, orderId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
}
exports.EmailService = EmailService;
EmailService.FROM_EMAIL = process.env.FROM_EMAIL || "noreply@velobike.vn";
EmailService.FROM_NAME = process.env.FROM_NAME || "VeloBike";
// Lazily created transporter
EmailService.transporter = null;
//# sourceMappingURL=EmailService.js.map