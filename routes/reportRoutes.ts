import { Router } from "express";
import { ReportController } from "../controllers/ReportController";
import { protect, requireRole } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

export const reportRoutes = Router();

/**
 * @swagger
 * /api/reports/listing:
 *   post:
 *     summary: Report a listing for violation (FR-BUY-04 per SRS BikeMarket)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listingId
 *               - reason
 *               - description
 *             properties:
 *               listingId:
 *                 type: string
 *                 description: ID of the listing to report
 *               reason:
 *                 type: string
 *                 enum: [FRAUD, INAPPROPRIATE_CONTENT, FAKE_LISTING, SPAM, OTHER]
 *                 description: Reason for reporting
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Detailed description of the issue
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs to evidence images (optional)
 *     responses:
 *       201:
 *         description: Report submitted successfully
 *       400:
 *         description: Already reported or invalid data
 *       404:
 *         description: Listing not found
 */
reportRoutes.post("/listing", protect, ReportController.reportListing as any);

/**
 * @swagger
 * /api/reports/my-reports:
 *   get:
 *     summary: Get user's submitted reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *     responses:
 *       200:
 *         description: List of user's reports
 */
reportRoutes.get("/my-reports", protect, ReportController.getMyReports as any);

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     summary: Get all reports (Admin only)
 *     tags: [Admin, Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, REVIEWED, RESOLVED, DISMISSED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *     responses:
 *       200:
 *         description: List of all reports
 */
reportRoutes.get("/admin/reports", protect, requireRole(UserRole.ADMIN), ReportController.getAllReports as any);

/**
 * @swagger
 * /api/admin/reports/{reportId}/review:
 *   put:
 *     summary: Review and resolve a report (Admin only)
 *     tags: [Admin, Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
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
 *                 enum: [REVIEWED, RESOLVED, DISMISSED]
 *               adminNote:
 *                 type: string
 *                 description: Admin's note about the resolution
 *               action:
 *                 type: string
 *                 enum: [REMOVE_LISTING, NO_ACTION]
 *                 description: Action to take on the reported listing
 *     responses:
 *       200:
 *         description: Report reviewed successfully
 */
reportRoutes.put("/admin/reports/:reportId/review", protect, requireRole(UserRole.ADMIN), ReportController.reviewReport as any);