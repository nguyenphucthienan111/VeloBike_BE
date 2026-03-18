import { Router } from "express";
import { InspectorApplicationController } from "../controllers/InspectorApplicationController";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

export const inspectorApplicationRoutes = Router();

/**
 * @swagger
 * /api/inspector-applications:
 *   post:
 *     summary: Submit inspector application (KYC required)
 *     tags: [InspectorApplications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - yearsOfExperience
 *               - bio
 *               - certificates
 *             properties:
 *               phone:
 *                 type: string
 *               yearsOfExperience:
 *                 type: number
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *               bio:
 *                 type: string
 *               certificates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     issuedBy:
 *                       type: string
 *                     issuedYear:
 *                       type: number
 *                     imageUrl:
 *                       type: string
 *     responses:
 *       201:
 *         description: Application submitted
 *       400:
 *         description: KYC not verified or already applied
 */
inspectorApplicationRoutes.post("/", protect, InspectorApplicationController.apply as any);

/**
 * @swagger
 * /api/inspector-applications/my:
 *   get:
 *     summary: Get my inspector application status
 *     tags: [InspectorApplications]
 *     security:
 *       - bearerAuth: []
 */
inspectorApplicationRoutes.get("/my", protect, InspectorApplicationController.getMyApplication as any);

/**
 * @swagger
 * /api/inspector-applications:
 *   get:
 *     summary: Admin - list all applications
 *     tags: [InspectorApplications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 */
inspectorApplicationRoutes.get("/", protect, authorize(UserRole.ADMIN), InspectorApplicationController.getAll as any);

/**
 * @swagger
 * /api/inspector-applications/{id}/approve:
 *   put:
 *     summary: Admin - approve application
 *     tags: [InspectorApplications]
 *     security:
 *       - bearerAuth: []
 */
inspectorApplicationRoutes.put("/:id/approve", protect, authorize(UserRole.ADMIN), InspectorApplicationController.approve as any);

/**
 * @swagger
 * /api/inspector-applications/{id}/reject:
 *   put:
 *     summary: Admin - reject application
 *     tags: [InspectorApplications]
 *     security:
 *       - bearerAuth: []
 */
inspectorApplicationRoutes.put("/:id/reject", protect, authorize(UserRole.ADMIN), InspectorApplicationController.reject as any);
