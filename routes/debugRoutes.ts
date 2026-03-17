import { Router } from "express";
import { DebugController } from "../controllers/DebugController";
import { protect } from "../middleware/authMiddleware";

export const debugRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Debug
 *   description: Debug endpoints for troubleshooting
 */

/**
 * @swagger
 * /api/debug/inspectors:
 *   get:
 *     summary: Check available inspectors in database
 *     description: Returns list of all inspectors (active and inactive) to debug auto-trigger inspection
 *     tags: [Debug]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inspector list retrieved
 */
debugRoutes.get("/inspectors", protect, DebugController.checkInspectors);

/**
 * @swagger
 * /api/debug/order/{orderId}/inspection-check:
 *   get:
 *     summary: Check why inspection was not triggered for an order
 *     description: Analyzes order, listing, and inspector availability to determine why auto-trigger failed
 *     tags: [Debug]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Inspection check completed
 *       404:
 *         description: Order not found
 */
debugRoutes.get("/order/:orderId/inspection-check", protect, DebugController.checkOrderInspection);

/**
 * @swagger
 * /api/debug/listing/{listingId}/inspection-check:
 *   get:
 *     summary: Check if listing is configured for inspection
 *     description: Checks if listing has inspectionRequired = true
 *     tags: [Debug]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: Listing check completed
 *       404:
 *         description: Listing not found
 */
debugRoutes.get("/listing/:listingId/inspection-check", protect, DebugController.checkListingInspection);

/**
 * @swagger
 * /api/debug/token:
 *   get:
 *     summary: Check current token and user info
 *     description: Decode token to see user ID, role, and check if can access inspector endpoints
 *     tags: [Debug]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token info retrieved
 *       401:
 *         description: Token invalid or expired
 */
debugRoutes.get("/token", protect, DebugController.checkToken);

/**
 * @swagger
 * /api/debug/trigger-auto-approve:
 *   post:
 *     summary: Manually trigger auto-approval of pending listings
 *     tags: [Debug]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Auto-approval triggered
 */
debugRoutes.post("/trigger-auto-approve", protect, async (req: any, res: any) => {
  try {
    const { AlertService } = await import("../services/AlertService");
    await AlertService.processAutoApprovals();
    res.json({ success: true, message: "Auto-approval process completed" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
