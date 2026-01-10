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
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_auth_library_1 = require("google-auth-library");
const User_1 = require("../models/User");
const Otp_1 = require("../models/Otp");
const EmailService_1 = require("../services/EmailService");
function generateToken(user) {
    const payload = { id: user._id.toString(), role: user.role };
    const secret = process.env.JWT_SECRET || "dev_secret";
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: "7d" });
}
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID);
class AuthController {
    // POST /api/auth/register
    // Creates user (email not verified yet) and sends verification OTP to email
    static register(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password, fullName, role } = req.body;
                if (!email || !password || !fullName) {
                    return res
                        .status(400)
                        .json({ success: false, message: "Missing fields" });
                }
                const existing = yield User_1.User.findOne({ email });
                if (existing)
                    return res
                        .status(400)
                        .json({ success: false, message: "Email already registered" });
                const salt = yield bcryptjs_1.default.genSalt(10);
                const passwordHash = yield bcryptjs_1.default.hash(password, salt);
                const newUser = new User_1.User({
                    email,
                    passwordHash,
                    fullName,
                    role: role || User_1.UserRole.BUYER,
                    kycStatus: User_1.KycStatus.PENDING,
                    emailVerified: false,
                });
                yield newUser.save();
                // Generate email OTP (6 digits)
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
                // Save to DB (upsert)
                yield Otp_1.Otp.findOneAndUpdate({ identifier: `email:${email}` }, { code, expiresAt }, { upsert: true, new: true });
                // Send verification email (best-effort)
                const subject = "VeloBike - Xác thực email của bạn";
                const html = `<p>Xin chào ${newUser.fullName},</p><p>Mã xác thực email của bạn là: <strong>${code}</strong></p><p>Mã có hiệu lực trong 15 phút.</p>`;
                // Attempt to send and log result to server console for debugging (useful when requests come from Swagger UI)
                const _sent = yield EmailService_1.EmailService.sendVerificationEmail(email, newUser.fullName, code);
                console.log(`AuthController.register: sendVerificationEmail -> ${email} => ${_sent ? "OK" : "FAILED"}`);
                // Return limited user data; token issued but emailVerified flag false
                const token = generateToken(newUser);
                res.status(201).json({
                    success: true,
                    message: "Tài khoản đã được tạo. Vui lòng kiểm tra email để xác thực.",
                    token,
                    user: {
                        id: newUser._id,
                        email: newUser.email,
                        fullName: newUser.fullName,
                        role: newUser.role,
                        emailVerified: false,
                    },
                });
            }
            catch (err) {
                res.status(500).json({ success: false, message: err.message });
            }
        });
    }
    // POST /api/auth/verify-email
    // Body: { email, code }
    static verifyEmail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, code } = req.body;
                if (!email || !code)
                    return res
                        .status(400)
                        .json({ success: false, message: "Email and code required" });
                const record = yield Otp_1.Otp.findOne({ identifier: `email:${email}` });
                if (!record)
                    return res
                        .status(400)
                        .json({
                        success: false,
                        message: "Invalid or expired verification code",
                    });
                if (record.code !== code)
                    return res
                        .status(400)
                        .json({ success: false, message: "Invalid verification code" });
                const user = yield User_1.User.findOne({ email });
                if (!user)
                    return res
                        .status(404)
                        .json({ success: false, message: "User not found" });
                user.emailVerified = true;
                yield user.save();
                // Clean up OTP immediately
                yield Otp_1.Otp.deleteOne({ _id: record._id });
                const token = generateToken(user);
                res.json({
                    success: true,
                    message: "Email verified",
                    token,
                    user: {
                        id: user._id,
                        email: user.email,
                        fullName: user.fullName,
                        emailVerified: true,
                    },
                });
            }
            catch (err) {
                res.status(500).json({ success: false, message: err.message });
            }
        });
    }
    // POST /api/auth/login
    static login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                if (!email || !password)
                    return res
                        .status(400)
                        .json({ success: false, message: "Missing credentials" });
                const user = yield User_1.User.findOne({ email });
                if (!user || !user.passwordHash)
                    return res
                        .status(401)
                        .json({ success: false, message: "Invalid credentials" });
                const match = yield bcryptjs_1.default.compare(password, user.passwordHash);
                if (!match)
                    return res
                        .status(401)
                        .json({ success: false, message: "Invalid credentials" });
                const token = generateToken(user);
                res.json({
                    success: true,
                    token,
                    user: {
                        id: user._id,
                        email: user.email,
                        fullName: user.fullName,
                        role: user.role,
                        emailVerified: user.emailVerified,
                    },
                });
            }
            catch (err) {
                res.status(500).json({ success: false, message: err.message });
            }
        });
    }
    // POST /api/auth/google
    // Verify Google ID token and create/link user
    static googleLogin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { googleToken } = req.body;
                if (!googleToken)
                    return res
                        .status(400)
                        .json({ success: false, message: "googleToken is required" });
                // Verify token with Google
                const ticket = yield googleClient.verifyIdToken({
                    idToken: googleToken,
                    audience: GOOGLE_CLIENT_ID,
                });
                const payload = ticket.getPayload();
                if (!payload || !payload.email)
                    return res
                        .status(400)
                        .json({ success: false, message: "Invalid Google token" });
                const email = payload.email;
                const googleId = payload.sub;
                const name = payload.name || "Google User";
                const picture = payload.picture || undefined;
                let user = yield User_1.User.findOne({ email });
                if (user) {
                    if (!user.googleId) {
                        user.googleId = googleId;
                        user.avatar = user.avatar || picture;
                        yield user.save();
                    }
                }
                else {
                    user = new User_1.User({
                        email,
                        fullName: name,
                        googleId,
                        avatar: picture,
                        role: User_1.UserRole.BUYER,
                        kycStatus: User_1.KycStatus.PENDING,
                        emailVerified: true, // Google verified
                    });
                    yield user.save();
                }
                const token = generateToken(user);
                res.json({
                    success: true,
                    token,
                    user: {
                        id: user._id,
                        email: user.email,
                        fullName: user.fullName,
                        role: user.role,
                    },
                });
            }
            catch (err) {
                console.error("Google login error:", err.message || err);
                res.status(500).json({
                    success: false,
                    message: err.message || "Google authentication failed",
                });
            }
        });
    }
    // POST /api/auth/facebook
    // Verify Facebook Access Token and create/link user
    // Note: In production, verify token via Graph API: https://graph.facebook.com/me?access_token=...
    static facebookLogin(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { facebookToken, userID } = req.body;
                if (!facebookToken || !userID)
                    return res
                        .status(400)
                        .json({ success: false, message: "facebookToken and userID are required" });
                // Mock verification (Replace with real Graph API call)
                // const response = await axios.get(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${facebookToken}`);
                // const { id, name, email, picture } = response.data;
                // Simulated data for demo/stub
                const email = `fb_${userID}@velobike.local`; // Fallback if FB doesn't return email
                const name = "Facebook User";
                const picture = `https://graph.facebook.com/${userID}/picture?type=large`;
                let user = yield User_1.User.findOne({ facebookId: userID });
                if (!user) {
                    // Try to link by email if exists
                    user = yield User_1.User.findOne({ email });
                    if (user) {
                        user.facebookId = userID;
                        yield user.save();
                    }
                    else {
                        user = new User_1.User({
                            email,
                            fullName: name,
                            facebookId: userID,
                            avatar: picture,
                            role: User_1.UserRole.BUYER,
                            kycStatus: User_1.KycStatus.PENDING,
                            emailVerified: true,
                        });
                        yield user.save();
                    }
                }
                const token = generateToken(user);
                res.json({
                    success: true,
                    token,
                    user: {
                        id: user._id,
                        email: user.email,
                        fullName: user.fullName,
                        role: user.role,
                    },
                });
            }
            catch (err) {
                console.error("Facebook login error:", err.message);
                res.status(500).json({ success: false, message: err.message });
            }
        });
    }
    // POST /api/auth/send-otp
    // Body: { phone }
    static sendOtp(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { phone } = req.body;
                if (!phone)
                    return res
                        .status(400)
                        .json({ success: false, message: "Phone is required" });
                // Generate 6-digit code
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
                // Save to DB
                yield Otp_1.Otp.findOneAndUpdate({ identifier: `phone:${phone}` }, { code, expiresAt }, { upsert: true, new: true });
                // TODO: integrate with SMS provider here
                console.log(`OTP for ${phone}: ${code}`);
                res.json({ success: true, message: "OTP sent (demo)" });
            }
            catch (err) {
                res.status(500).json({ success: false, message: err.message });
            }
        });
    }
    // POST /api/auth/verify-otp
    // Body: { phone, code }
    static verifyOtp(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { phone, code } = req.body;
                if (!phone || !code)
                    return res
                        .status(400)
                        .json({ success: false, message: "Phone and code required" });
                const record = yield Otp_1.Otp.findOne({ identifier: `phone:${phone}` });
                if (!record)
                    return res
                        .status(400)
                        .json({ success: false, message: "Invalid or expired OTP" });
                if (record.code !== code)
                    return res.status(400).json({ success: false, message: "Invalid OTP" });
                // OTP valid. Find or create user by phone
                let user = yield User_1.User.findOne({ phone });
                if (!user) {
                    user = new User_1.User({
                        email: `phone_${phone}@velobike.local`,
                        fullName: `Phone User ${phone}`,
                        phone,
                        role: User_1.UserRole.BUYER,
                        kycStatus: User_1.KycStatus.PENDING,
                    });
                    yield user.save();
                }
                // Create token
                const token = generateToken(user);
                // Clean up OTP immediately
                yield Otp_1.Otp.deleteOne({ _id: record._id });
                res.json({
                    success: true,
                    token,
                    user: {
                        id: user._id,
                        email: user.email,
                        fullName: user.fullName,
                        phone: user.phone,
                    },
                });
            }
            catch (err) {
                res.status(500).json({ success: false, message: err.message });
            }
        });
    }
    // POST /api/auth/change-password
    // Body: { currentPassword, newPassword }
    // Requires Authentication Middleware
    static changePassword(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { currentPassword, newPassword } = req.body;
                const userId = req.user.id;
                if (!currentPassword || !newPassword) {
                    return res.status(400).json({ success: false, message: "Missing passwords" });
                }
                const user = yield User_1.User.findById(userId);
                if (!user || !user.passwordHash) {
                    return res.status(404).json({ success: false, message: "User not found" });
                }
                const isMatch = yield bcryptjs_1.default.compare(currentPassword, user.passwordHash);
                if (!isMatch) {
                    return res.status(400).json({ success: false, message: "Incorrect current password" });
                }
                const salt = yield bcryptjs_1.default.genSalt(10);
                user.passwordHash = yield bcryptjs_1.default.hash(newPassword, salt);
                yield user.save();
                res.json({ success: true, message: "Password updated successfully" });
            }
            catch (err) {
                res.status(500).json({ success: false, message: err.message });
            }
        });
    }
    // POST /api/auth/forgot-password
    // Body: { email }
    static forgotPassword(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email } = req.body;
                if (!email)
                    return res.status(400).json({ success: false, message: "Email required" });
                const user = yield User_1.User.findOne({ email });
                if (!user)
                    return res.status(404).json({ success: false, message: "User not found" });
                // Generate OTP
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
                yield Otp_1.Otp.findOneAndUpdate({ identifier: `reset:${email}` }, { code, expiresAt }, { upsert: true, new: true });
                // Send Email
                yield EmailService_1.EmailService.sendPasswordResetEmail(email, user.fullName, code);
                res.json({ success: true, message: "Reset OTP sent to email" });
            }
            catch (err) {
                res.status(500).json({ success: false, message: err.message });
            }
        });
    }
    // POST /api/auth/reset-password
    // Body: { email, code, newPassword }
    static resetPassword(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, code, newPassword } = req.body;
                if (!email || !code || !newPassword) {
                    return res.status(400).json({ success: false, message: "Missing fields" });
                }
                const record = yield Otp_1.Otp.findOne({ identifier: `reset:${email}` });
                if (!record || record.code !== code || new Date() > record.expiresAt) {
                    return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
                }
                const user = yield User_1.User.findOne({ email });
                if (!user)
                    return res.status(404).json({ success: false, message: "User not found" });
                const salt = yield bcryptjs_1.default.genSalt(10);
                user.passwordHash = yield bcryptjs_1.default.hash(newPassword, salt);
                yield user.save();
                yield Otp_1.Otp.deleteOne({ _id: record._id });
                res.json({ success: true, message: "Password reset successfully" });
            }
            catch (err) {
                res.status(500).json({ success: false, message: err.message });
            }
        });
    }
    // POST /api/auth/kyc-submit
    // Body: { documentType, documentId, frontImage, backImage }
    static submitKyc(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { documentType, documentId, frontImage, backImage } = req.body;
                const userId = req.user.id; // From middleware
                if (!documentType || !documentId || !frontImage || !backImage) {
                    return res
                        .status(400)
                        .json({ success: false, message: "Missing KYC data" });
                }
                const user = yield User_1.User.findById(userId);
                if (!user)
                    return res.status(404).json({ success: false, message: "User not found" });
                user.kycData = {
                    documentType,
                    documentId,
                    frontImage,
                    backImage,
                    verifiedAt: undefined,
                };
                // If not already verified, set to PENDING
                if (user.kycStatus !== User_1.KycStatus.VERIFIED) {
                    user.kycStatus = User_1.KycStatus.PENDING;
                }
                yield user.save();
                res.json({ success: true, message: "KYC data submitted for review" });
            }
            catch (err) {
                res.status(500).json({ success: false, message: err.message });
            }
        });
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map