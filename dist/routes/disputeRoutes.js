"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disputeRoutes = void 0;
const express_1 = require("express");
const DisputeController_1 = require("../controllers/DisputeController");
exports.disputeRoutes = (0, express_1.Router)();
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
exports.disputeRoutes.post("/", DisputeController_1.DisputeController.openDispute);
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
exports.disputeRoutes.get("/:disputeId", DisputeController_1.DisputeController.getDispute);
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
exports.disputeRoutes.get("/", DisputeController_1.DisputeController.getUserDisputes);
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
exports.disputeRoutes.put("/:disputeId/resolve", DisputeController_1.DisputeController.resolveDispute);
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
exports.disputeRoutes.put("/:disputeId/review", DisputeController_1.DisputeController.reviewDispute);
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
exports.disputeRoutes.put("/:disputeId/close", DisputeController_1.DisputeController.closeDispute);
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
exports.disputeRoutes.post("/:disputeId/evidence", DisputeController_1.DisputeController.addEvidence);
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
exports.disputeRoutes.get("/admin/all", DisputeController_1.DisputeController.getAllDisputes);
//# sourceMappingURL=disputeRoutes.js.map