"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.authRoutes = (0, express_1.Router)();
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: securePassword123
 *               fullName:
 *                 type: string
 *                 example: Nguyen Van A
 *               role:
 *                 type: string
 *                 enum: [BUYER, SELLER, INSPECTOR]
 *                 default: GUEST
 *     responses:
 *       201:
 *         description: User created successfully (verification email sent)
 *       400:
 *         description: Email already exists
 */
exports.authRoutes.post("/register", validationMiddleware_1.validationRules.register, validationMiddleware_1.validate, AuthController_1.AuthController.register);
/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify a user's email with OTP code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired code
 */
exports.authRoutes.post("/verify-email", AuthController_1.AuthController.verifyEmail);
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in a user with Email/Password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: securePassword123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
exports.authRoutes.post("/login", validationMiddleware_1.validationRules.login, validationMiddleware_1.validate, AuthController_1.AuthController.login);
/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Log in or Register using Google OAuth Token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - googleToken
 *             properties:
 *               googleToken:
 *                 type: string
 *                 description: ID Token received from Google Client SDK
 *     responses:
 *       200:
 *         description: Login/Register successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
exports.authRoutes.post("/google", AuthController_1.AuthController.googleLogin);
/**
 * @swagger
 * /api/auth/facebook:
 *   post:
 *     summary: Log in or Register using Facebook Access Token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - facebookToken
 *               - userID
 *             properties:
 *               facebookToken:
 *                 type: string
 *               userID:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login/Register successful
 */
exports.authRoutes.post("/facebook", AuthController_1.AuthController.facebookLogin);
/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Incorrect current password
 */
exports.authRoutes.post("/change-password", authMiddleware_1.protect, AuthController_1.AuthController.changePassword);
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent to email
 *       404:
 *         description: User not found
 */
exports.authRoutes.post("/forgot-password", AuthController_1.AuthController.forgotPassword);
/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid OTP
 */
exports.authRoutes.post("/reset-password", AuthController_1.AuthController.resetPassword);
/**
 * @swagger
 * /api/auth/kyc-submit:
 *   post:
 *     summary: Submit KYC documents (Seller only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentType
 *               - documentId
 *               - frontImage
 *               - backImage
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: [CCCD, CMND, PASSPORT]
 *               documentId:
 *                 type: string
 *               frontImage:
 *                 type: string
 *               backImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC submitted
 */
exports.authRoutes.post("/kyc-submit", authMiddleware_1.protect, AuthController_1.AuthController.submitKyc);
/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token received during login
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 accessToken:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid or expired refresh token
 */
exports.authRoutes.post("/refresh-token", AuthController_1.AuthController.refreshToken);
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout from current device
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       400:
 *         description: Invalid refresh token
 */
exports.authRoutes.post("/logout", AuthController_1.AuthController.logout);
/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices
 */
exports.authRoutes.post("/logout-all", authMiddleware_1.protect, AuthController_1.AuthController.logoutAll);
/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: Get user's active sessions
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       deviceInfo:
 *                         type: object
 *                       lastUsedAt:
 *                         type: string
 *                       createdAt:
 *                         type: string
 */
exports.authRoutes.get("/sessions", authMiddleware_1.protect, AuthController_1.AuthController.getActiveSessions);
//# sourceMappingURL=authRoutes.js.map