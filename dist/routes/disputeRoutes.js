"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disputeRoutes = void 0;
const express_1 = require("express");
const DisputeController_1 = require("../controllers/DisputeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const User_1 = require("../models/User");
exports.disputeRoutes = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Disputes
 *   description: Quản lý tranh chấp đơn hàng
 */
/**
 * @swagger
 * /api/disputes/admin/all:
 *   get:
 *     summary: Xem tất cả tranh chấp (Admin only)
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, IN_REVIEW, RESOLVED, CLOSED]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: All disputes
 *       403:
 *         description: Admin only
 */
exports.disputeRoutes.get("/admin/all", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.ADMIN), DisputeController_1.DisputeController.getAllDisputes);
/**
 * @swagger
 * /api/disputes:
 *   get:
 *     summary: Xem tranh chấp của tôi
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
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: User's disputes
 */
exports.disputeRoutes.get("/", authMiddleware_1.protect, DisputeController_1.DisputeController.getUserDisputes);
/**
 * @swagger
 * /api/disputes:
 *   post:
 *     summary: Mở tranh chấp (Buyer/Seller)
 *     description: |
 *       Buyer hoặc Seller có thể mở tranh chấp khi có vấn đề với đơn hàng.
 *       Evidence có thể là URL ảnh (upload trước qua POST /api/upload).
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
 *                 description: ID đơn hàng
 *                 example: "6969db87ecf2d0f6e982f793"
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
 *                 description: Lý do tranh chấp
 *                 example: "ITEM_NOT_AS_DESCRIBED"
 *               description:
 *                 type: string
 *                 description: Mô tả chi tiết vấn đề
 *                 example: "Xe có vết xước lớn không được mô tả trong tin đăng"
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách URL ảnh/video làm bằng chứng
 *                 example: ["https://res.cloudinary.com/xxx/image1.jpg", "https://res.cloudinary.com/xxx/image2.jpg"]
 *     responses:
 *       201:
 *         description: Dispute opened successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
exports.disputeRoutes.post("/", authMiddleware_1.protect, DisputeController_1.DisputeController.openDispute);
/**
 * @swagger
 * /api/disputes/{disputeId}:
 *   get:
 *     summary: Xem chi tiết tranh chấp
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID tranh chấp
 *     responses:
 *       200:
 *         description: Dispute details
 *       404:
 *         description: Dispute not found
 */
exports.disputeRoutes.get("/:disputeId", authMiddleware_1.protect, DisputeController_1.DisputeController.getDispute);
/**
 * @swagger
 * /api/disputes/{disputeId}/evidence:
 *   post:
 *     summary: Thêm bằng chứng vào tranh chấp
 *     description: Upload ảnh trước qua POST /api/upload, sau đó gửi URL vào đây
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
 *                     example: "https://res.cloudinary.com/xxx/evidence.jpg"
 *                   - type: array
 *                     items:
 *                       type: string
 *                     example: ["https://res.cloudinary.com/xxx/img1.jpg", "https://res.cloudinary.com/xxx/img2.jpg"]
 *     responses:
 *       200:
 *         description: Evidence added
 */
exports.disputeRoutes.post("/:disputeId/evidence", authMiddleware_1.protect, DisputeController_1.DisputeController.addEvidence);
/**
 * @swagger
 * /api/disputes/{disputeId}/review:
 *   put:
 *     summary: Chuyển tranh chấp sang trạng thái đang xem xét (Admin)
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
 *       403:
 *         description: Admin only
 */
exports.disputeRoutes.put("/:disputeId/review", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.ADMIN), DisputeController_1.DisputeController.reviewDispute);
/**
 * @swagger
 * /api/disputes/{disputeId}/resolve:
 *   put:
 *     summary: Giải quyết tranh chấp (Admin only)
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
 *                 description: Quyết định giải quyết
 *                 example: "Hoàn tiền 50% cho Buyer do xe có vết xước nhỏ không được mô tả"
 *               compensationAmount:
 *                 type: number
 *                 description: Số tiền bồi thường (nếu có)
 *                 example: 5000000
 *     responses:
 *       200:
 *         description: Dispute resolved
 *       403:
 *         description: Admin only
 */
exports.disputeRoutes.put("/:disputeId/resolve", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.ADMIN), DisputeController_1.DisputeController.resolveDispute);
/**
 * @swagger
 * /api/disputes/{disputeId}/close:
 *   put:
 *     summary: Đóng tranh chấp (Admin)
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
 *       403:
 *         description: Admin only
 */
exports.disputeRoutes.put("/:disputeId/close", authMiddleware_1.protect, (0, authMiddleware_1.authorize)(User_1.UserRole.ADMIN), DisputeController_1.DisputeController.closeDispute);
//# sourceMappingURL=disputeRoutes.js.map