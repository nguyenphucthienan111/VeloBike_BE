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
 *               - checkpoints
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID cần kiểm định
 *                 example: "696cba63ad1e5d95a2bcde45"
 *               checkpoints:
 *                 type: array
 *                 description: Danh sách các điểm kiểm tra (tối thiểu 1)
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - component
 *                     - status
 *                   properties:
 *                     component:
 *                       type: string
 *                       description: Tên bộ phận kiểm tra
 *                       example: "Frame - Overall Condition"
 *                     status:
 *                       type: string
 *                       enum: [PASS, FAIL, WARN]
 *                       description: Trạng thái kiểm tra
 *                       example: "PASS"
 *                     observation:
 *                       type: string
 *                       description: Ghi chú chi tiết
 *                       example: "Khung xe tốt, không có vết nứt"
 *                     severity:
 *                       type: string
 *                       enum: [LOW, MEDIUM, CRITICAL]
 *                       description: Mức độ nghiêm trọng (bắt buộc nếu status = FAIL hoặc WARN)
 *                       example: "LOW"
 *                     evidenceImages:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: URLs ảnh chứng cứ (tùy chọn)
 *               overallVerdict:
 *                 type: string
 *                 enum: [PASSED, FAILED, SUGGEST_ADJUSTMENT]
 *                 description: Kết luận tổng thể (tùy chọn, hệ thống tự tính nếu không có)
 *                 example: "SUGGEST_ADJUSTMENT"
 *               overallScore:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *                 description: Điểm tổng thể 1-10 (tùy chọn, hệ thống tự tính nếu không có)
 *                 example: 7.5
 *               inspectorNote:
 *                 type: string
 *                 description: Ghi chú tổng quan của inspector (tùy chọn)
 *                 example: "Xe tổng thể tốt nhưng cần thay xích và má phanh"
 *           example:
 *             orderId: "696cba63ad1e5d95a2bcde45"
 *             checkpoints:
 *               - component: "Frame - Overall Condition"
 *                 status: "PASS"
 *                 observation: "Khung xe tốt, không có vết nứt"
 *               - component: "Front Brake"
 *                 status: "WARN"
 *                 severity: "LOW"
 *                 observation: "Má phanh còn 40%, nên thay trong 1 tháng"
 *               - component: "Chain"
 *                 status: "FAIL"
 *                 severity: "MEDIUM"
 *                 observation: "Xích đã kéo dài 0.75%, cần thay ngay"
 *               - component: "Rear Derailleur"
 *                 status: "PASS"
 *                 observation: "Hoạt động mượt mà"
 *             overallVerdict: "SUGGEST_ADJUSTMENT"
 *             overallScore: 7.5
 *             inspectorNote: "Xe tổng thể tốt nhưng cần thay xích và má phanh trước khi giao"
 *     responses:
 *       201:
 *         description: Inspection submitted and Order status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 orderStatus:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request (validation error)
 *       401:
 *         description: Unauthorized (no token or invalid token)
 *       403:
 *         description: Forbidden (not inspector role)
 *       404:
 *         description: Order not found
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
 * /api/inspections/test-auth:
 *   get:
 *     summary: Test authentication for inspector endpoints
 *     tags: [Inspections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Auth working
 */
inspectionRoutes.get(
  "/test-auth",
  protect,
  authorize(UserRole.INSPECTOR),
  (req: any, res: any) => {
    res.json({
      success: true,
      message: "✅ Authentication working!",
      user: req.user,
    });
  }
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