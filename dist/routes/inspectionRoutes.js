"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectionRoutes = void 0;
const express_1 = require("express");
const InspectionController_1 = require("../controllers/InspectionController");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
exports.inspectionRoutes = (0, express_1.Router)();
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
exports.inspectionRoutes.post("/", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.INSPECTOR), validationMiddleware_1.validationRules.submitInspection, validationMiddleware_1.validate, InspectionController_1.InspectionController.submitReport);
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
exports.inspectionRoutes.get("/checklist/:bikeType", InspectionController_1.InspectionController.getChecklist);
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
exports.inspectionRoutes.get("/checklist/order/:orderId", InspectionController_1.InspectionController.getChecklistByOrder);
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
exports.inspectionRoutes.get("/pending", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.INSPECTOR), InspectionController_1.InspectionController.getPending);
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
exports.inspectionRoutes.get("/my-inspections", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.INSPECTOR), InspectionController_1.InspectionController.getMyInspections);
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
exports.inspectionRoutes.get("/:orderId", InspectionController_1.InspectionController.getByOrder);
//# sourceMappingURL=inspectionRoutes.js.map