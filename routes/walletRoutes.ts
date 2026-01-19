import { Router } from "express";
import { WithdrawalController } from "../controllers/WithdrawalController";
import { protect, authorize } from "../middleware/authMiddleware";
import { UserRole } from "../models/User";

export const walletRoutes = Router();
export const adminWithdrawalRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet and withdrawal management
 */

/**
 * @swagger
 * /api/wallet/withdraw:
 *   post:
 *     summary: Request withdrawal from wallet to bank account
 *     description: |
 *       Seller/Inspector yêu cầu rút tiền từ ví về ngân hàng.
 *       
 *       **Phí rút tiền:**
 *       - Miễn phí nếu rút >= 1,000,000 VNĐ
 *       - 10,000 VNĐ nếu rút < 1,000,000 VNĐ
 *       
 *       **Quy trình:**
 *       1. User request rút tiền
 *       2. Admin duyệt và trừ ví
 *       3. Admin chuyển khoản thủ công
 *       4. Admin confirm đã chuyển
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - bankAccount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Số tiền muốn rút (tối thiểu 50,000 VNĐ)
 *                 example: 5000000
 *               bankAccount:
 *                 type: object
 *                 required:
 *                   - bankName
 *                   - accountNumber
 *                   - accountName
 *                 properties:
 *                   bankName:
 *                     type: string
 *                     example: "Vietcombank"
 *                   accountNumber:
 *                     type: string
 *                     example: "1234567890"
 *                   accountName:
 *                     type: string
 *                     example: "NGUYEN VAN A"
 *                   branch:
 *                     type: string
 *                     example: "Chi nhánh Quận 1"
 *     responses:
 *       201:
 *         description: Withdrawal request created
 *       400:
 *         description: Invalid request or insufficient balance
 *       401:
 *         description: Unauthorized
 */
walletRoutes.post("/withdraw", protect, WithdrawalController.requestWithdrawal);

/**
 * @swagger
 * /api/wallet/withdrawals:
 *   get:
 *     summary: Get user's withdrawal history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Withdrawal history
 */
walletRoutes.get("/withdrawals", protect, WithdrawalController.getMyWithdrawals);

/**
 * @swagger
 * /api/wallet/withdrawals/{id}/cancel:
 *   put:
 *     summary: Cancel withdrawal request
 *     description: User có thể hủy yêu cầu rút tiền khi còn ở trạng thái PENDING
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Withdrawal ID
 *     responses:
 *       200:
 *         description: Withdrawal cancelled
 *       400:
 *         description: Cannot cancel (already processed)
 */
walletRoutes.put("/withdrawals/:id/cancel", protect, WithdrawalController.cancelWithdrawal);

// Admin routes (separate router for /api/admin/withdrawals)
/**
 * @swagger
 * /api/admin/withdrawals:
 *   get:
 *     summary: Get all withdrawal requests (Admin)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, COMPLETED, REJECTED, CANCELLED]
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
 *         description: List of withdrawals
 */
adminWithdrawalRoutes.get(
  "/",
  protect,
  authorize(UserRole.ADMIN),
  WithdrawalController.getAllWithdrawals
);

/**
 * @swagger
 * /api/admin/withdrawals/statistics:
 *   get:
 *     summary: Get withdrawal statistics (Admin)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics
 */
adminWithdrawalRoutes.get(
  "/statistics",
  protect,
  authorize(UserRole.ADMIN),
  WithdrawalController.getStatistics
);

/**
 * @swagger
 * /api/admin/withdrawals/{id}/approve:
 *   put:
 *     summary: Approve withdrawal and deduct wallet (Admin)
 *     description: |
 *       Admin duyệt yêu cầu rút tiền:
 *       1. Trừ tiền khỏi ví user
 *       2. Tạo transaction WITHDRAW
 *       3. Admin cần chuyển khoản thủ công sau đó
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Withdrawal ID
 *         example: "6968d4defea9a1162ce2fd09"
 *     responses:
 *       200:
 *         description: Withdrawal approved
 */
adminWithdrawalRoutes.put(
  "/:id/approve",
  protect,
  authorize(UserRole.ADMIN),
  WithdrawalController.approveWithdrawal
);

/**
 * @swagger
 * /api/admin/withdrawals/{id}/complete:
 *   put:
 *     summary: Mark withdrawal as completed (Admin)
 *     description: Admin xác nhận đã chuyển khoản thành công
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Withdrawal ID
 *         example: "6968d4defea9a1162ce2fd09"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transferProof:
 *                 type: string
 *                 description: URL ảnh chứng từ chuyển khoản
 *               note:
 *                 type: string
 *                 description: Ghi chú
 *     responses:
 *       200:
 *         description: Withdrawal completed
 */
adminWithdrawalRoutes.put(
  "/:id/complete",
  protect,
  authorize(UserRole.ADMIN),
  WithdrawalController.completeWithdrawal
);

/**
 * @swagger
 * /api/admin/withdrawals/{id}/reject:
 *   put:
 *     summary: Reject withdrawal request (Admin)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Withdrawal ID
 *         example: "6968d4defea9a1162ce2fd09"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Lý do từ chối
 *                 example: "Thông tin tài khoản không chính xác"
 *     responses:
 *       200:
 *         description: Withdrawal rejected
 */
adminWithdrawalRoutes.put(
  "/:id/reject",
  protect,
  authorize(UserRole.ADMIN),
  WithdrawalController.rejectWithdrawal
);
