import { Router } from "express";
import { InspectionController } from "../controllers/InspectionController";
import { validationRules, validate } from "../middleware/validationMiddleware";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

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
inspectionRoutes.post(
  "/",
  protect,
  authorize(UserRole.INSPECTOR),
  validationRules.submitInspection,
  validate,
  InspectionController.submitReport as any
);

/**
 * @swagger
 * /api/inspections/checklist/{bikeType}:
 *   get:
 *     summary: Get dynamic inspection checklist based on bike type
 *     tags: [Inspections]
 *     parameters:
 *       - in: path
 *         name: bikeType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [ROAD, MTB, GRAVEL, TRIATHLON]
 *     responses:
 *       200:
 *         description: Checklist for the specified bike type
 */
inspectionRoutes.get("/checklist/:bikeType", InspectionController.getChecklist as any);

/**
 * @swagger
 * /api/inspections/checklist/order/{orderId}:
 *   get:
 *     summary: Get inspection checklist based on order's listing bike type
 *     tags: [Inspections]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Checklist for the order's bike type
 */
inspectionRoutes.get("/checklist/order/:orderId", InspectionController.getChecklistByOrder as any);

/**
 * @swagger
 * /api/inspections/pending:
 *   get:
 *     summary: Get pending inspections for inspector
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending inspections
 */
inspectionRoutes.get("/pending", protect, authorize(UserRole.INSPECTOR), InspectionController.getPending as any);

/**
 * @swagger
 * /api/inspections/my-inspections:
 *   get:
 *     summary: Get inspector's completed inspections
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of completed inspections
 */
inspectionRoutes.get("/my-inspections", protect, authorize(UserRole.INSPECTOR), InspectionController.getMyInspections as any);

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