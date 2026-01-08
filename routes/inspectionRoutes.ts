import { Router } from "express";
import { InspectionController } from "../controllers/InspectionController";

export const inspectionRoutes = Router();

/**
 * @swagger
 * /api/inspections:
 *   post:
 *     summary: Submit an inspection report (Inspector only)
 *     tags: [Inspections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - inspectorId
 *               - overallVerdict
 *               - overallScore
 *               - checkpoints
 *             properties:
 *               orderId:
 *                 type: string
 *               inspectorId:
 *                 type: string
 *               overallVerdict:
 *                 type: string
 *                 enum: [PASSED, FAILED, SUGGEST_ADJUSTMENT]
 *               overallScore:
 *                 type: number
 *               inspectorNote:
 *                 type: string
 *               checkpoints:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     component: { type: string }
 *                     status: { type: string, enum: [PASS, FAIL, WARN] }
 *                     observation: { type: string }
 *     responses:
 *       201:
 *         description: Inspection submitted and Order status updated
 */
inspectionRoutes.post("/", InspectionController.submitReport as any);

/**
 * @swagger
 * /api/inspections/{orderId}:
 *   get:
 *     summary: Get inspection report for an order
 *     tags: [Inspections]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inspection details
 *       404:
 *         description: Not found
 */
inspectionRoutes.get("/:orderId", InspectionController.getByOrder as any);
