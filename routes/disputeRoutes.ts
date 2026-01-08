import { Router } from "express";
import { DisputeController } from "../controllers/DisputeController";

export const disputeRoutes = Router();

/**
 * @swagger
 * /api/disputes:
 *   post:
 *     summary: Open a dispute
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - reason
 *               - description
 *             properties:
 *               orderId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 enum:
 *                   - ITEM_NOT_RECEIVED
 *                   - ITEM_NOT_AS_DESCRIBED
 *                   - ITEM_DAMAGED
 *                   - QUALITY_ISSUE
 *                   - PAYMENT_ISSUE
 *                   - INSPECTION_DISPUTE
 *                   - OTHER
 *               description:
 *                 type: string
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Dispute opened
 */
disputeRoutes.post("/", DisputeController.openDispute as any);

/**
 * @swagger
 * /api/disputes/{disputeId}:
 *   get:
 *     summary: Get dispute details
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dispute details
 */
disputeRoutes.get("/:disputeId", DisputeController.getDispute as any);

/**
 * @swagger
 * /api/disputes:
 *   get:
 *     summary: Get user disputes
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, IN_REVIEW, RESOLVED, CLOSED]
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
 *         description: Disputes list
 */
disputeRoutes.get("/", DisputeController.getUserDisputes as any);

/**
 * @swagger
 * /api/disputes/{disputeId}/resolve:
 *   put:
 *     summary: Resolve dispute (Admin only)
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
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
 *               - resolution
 *             properties:
 *               resolution:
 *                 type: string
 *               compensationAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Dispute resolved
 */
disputeRoutes.put("/:disputeId/resolve", DisputeController.resolveDispute as any);

/**
 * @swagger
 * /api/disputes/{disputeId}/review:
 *   put:
 *     summary: Move dispute to review (Admin)
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dispute in review
 */
disputeRoutes.put("/:disputeId/review", DisputeController.reviewDispute as any);

/**
 * @swagger
 * /api/disputes/{disputeId}/close:
 *   put:
 *     summary: Close dispute (Admin)
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dispute closed
 */
disputeRoutes.put("/:disputeId/close", DisputeController.closeDispute as any);

/**
 * @swagger
 * /api/disputes/{disputeId}/evidence:
 *   post:
 *     summary: Add evidence to dispute
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
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
 *               - evidence
 *             properties:
 *               evidence:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *     responses:
 *       200:
 *         description: Evidence added
 */
disputeRoutes.post("/:disputeId/evidence", DisputeController.addEvidence as any);

/**
 * @swagger
 * /api/disputes/admin/all:
 *   get:
 *     summary: Get all disputes (Admin only)
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
 *         description: All disputes
 */
disputeRoutes.get("/admin/all", DisputeController.getAllDisputes as any);
