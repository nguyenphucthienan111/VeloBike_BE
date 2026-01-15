import { Router } from "express";
import multer from "multer";
import { AuthController } from "../controllers/AuthController";
import { validationRules, validate } from "../middleware/validationMiddleware";
import { protect } from "../middleware/authMiddleware";

const upload = multer({ dest: "uploads/" });

export const authRoutes = Router();

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
authRoutes.post("/register", validationRules.register, validate, AuthController.register as any);

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
authRoutes.post("/verify-email", AuthController.verifyEmail as any);

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
authRoutes.post("/login", validationRules.login, validate, AuthController.login as any);

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
authRoutes.post("/google", AuthController.googleLogin as any);

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
authRoutes.post("/facebook", AuthController.facebookLogin as any);

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
authRoutes.post("/change-password", protect, AuthController.changePassword as any);

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
authRoutes.post("/forgot-password", AuthController.forgotPassword as any);

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
authRoutes.post("/reset-password", AuthController.resetPassword as any);

/**
 * @swagger
 * /api/auth/kyc-submit:
 *   post:
 *     summary: Submit KYC documents (Seller only) - JSON with URLs
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
authRoutes.post("/kyc-submit", protect, AuthController.submitKyc as any);

/**
 * @swagger
 * /api/auth/kyc-upload:
 *   post:
 *     summary: Submit KYC with file upload (Seller only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
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
 *                 description: Loại giấy tờ
 *               documentId:
 *                 type: string
 *                 description: Số CCCD/CMND/Passport
 *               frontImage:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh mặt trước
 *               backImage:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh mặt sau
 *     responses:
 *       200:
 *         description: KYC submitted successfully
 */
authRoutes.post(
  "/kyc-upload",
  protect,
  upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 }
  ]) as any,
  AuthController.submitKycWithUpload as any
);

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
authRoutes.post("/refresh-token", AuthController.refreshToken as any);

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
authRoutes.post("/logout", AuthController.logout as any);

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
authRoutes.post("/logout-all", protect, AuthController.logoutAll as any);

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
authRoutes.get("/sessions", protect, AuthController.getActiveSessions as any);
