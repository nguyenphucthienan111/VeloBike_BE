import { Router } from "express";
import { KycController } from "../controllers/KycController";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

const kycRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: KYC
 *   description: eKYC verification and webhook endpoints
 */

/**
 * @swagger
 * /api/kyc/webhook:
 *   post:
 *     summary: Receive eKYC verification webhook from provider
 *     tags: [KYC]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [VERIFIED, REJECTED]
 *               confidence:
 *                 type: number
 *               documentData:
 *                 type: object
 *               faceMatch:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
kycRoutes.post("/webhook", KycController.handleWebhook as any);

/**
 * @swagger
 * /api/kyc/verify/{userId}:
 *   put:
 *     summary: Manual KYC verification by admin
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [VERIFIED, REJECTED]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC status updated
 */
kycRoutes.put("/verify/:userId", protect, authorize(UserRole.ADMIN), KycController.manualVerify as any);

/**
 * @swagger
 * /api/kyc/pending:
 *   get:
 *     summary: Get pending KYC verifications (Admin only)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Pending KYC list
 */
kycRoutes.get("/pending", protect, authorize(UserRole.ADMIN), KycController.getPendingKyc as any);

/**
 * @swagger
 * /api/kyc/stats:
 *   get:
 *     summary: Get KYC statistics (Admin only)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC statistics
 */
kycRoutes.get("/stats", protect, authorize(UserRole.ADMIN), KycController.getKycStats as any);

export { kycRoutes };