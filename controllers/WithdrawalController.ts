import { Request, Response } from "express";
import { WithdrawalService } from "../services/WithdrawalService";
import { WithdrawalStatus } from "../models/Withdrawal";

export class WithdrawalController {
  /**
   * POST /api/wallet/withdraw
   * Request withdrawal
   */
  static async requestWithdrawal(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { amount, bankAccount } = req.body;

      if (!amount || !bankAccount) {
        return res.status(400).json({
          success: false,
          message: "amount và bankAccount là bắt buộc",
        });
      }

      const withdrawal = await WithdrawalService.requestWithdrawal(
        userId,
        amount,
        bankAccount
      );

      res.status(201).json({
        success: true,
        data: withdrawal,
        message: "Yêu cầu rút tiền đã được tạo. Admin sẽ xử lý trong 1-2 ngày làm việc.",
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/wallet/withdrawals
   * Get user's withdrawals
   */
  static async getMyWithdrawals(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { page = 1, limit = 20 } = req.query;

      const { withdrawals, total } = await WithdrawalService.getUserWithdrawals(
        userId,
        Number(page),
        Number(limit)
      );

      res.json({
        success: true,
        data: withdrawals,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/wallet/withdrawals/:id/cancel
   * Cancel withdrawal
   */
  static async cancelWithdrawal(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { id } = req.params;

      const withdrawal = await WithdrawalService.cancelWithdrawal(id, userId);

      res.json({
        success: true,
        data: withdrawal,
        message: "Yêu cầu rút tiền đã được hủy",
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/admin/withdrawals
   * Get all withdrawals (admin)
   */
  static async getAllWithdrawals(req: any, res: Response) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const { withdrawals, total } = await WithdrawalService.getAllWithdrawals(
        status as WithdrawalStatus,
        Number(page),
        Number(limit)
      );

      res.json({
        success: true,
        data: withdrawals,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/admin/withdrawals/:id/approve
   * Approve withdrawal (admin)
   */
  static async approveWithdrawal(req: any, res: Response) {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;

      const withdrawal = await WithdrawalService.approveWithdrawal(id, adminId);

      res.json({
        success: true,
        data: withdrawal,
        message: "Yêu cầu rút tiền đã được duyệt. Tiền đã trừ khỏi ví. Hãy chuyển khoản cho user.",
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/admin/withdrawals/:id/complete
   * Mark as completed (admin)
   */
  static async completeWithdrawal(req: any, res: Response) {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;
      const { transferProof, note } = req.body;

      const withdrawal = await WithdrawalService.completeWithdrawal(
        id,
        adminId,
        transferProof,
        note
      );

      res.json({
        success: true,
        data: withdrawal,
        message: "Đã xác nhận chuyển khoản thành công",
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/admin/withdrawals/:id/reject
   * Reject withdrawal (admin)
   */
  static async rejectWithdrawal(req: any, res: Response) {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: "reason là bắt buộc",
        });
      }

      const withdrawal = await WithdrawalService.rejectWithdrawal(
        id,
        adminId,
        reason
      );

      res.json({
        success: true,
        data: withdrawal,
        message: "Yêu cầu rút tiền đã bị từ chối",
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/admin/withdrawals/statistics
   * Get statistics (admin)
   */
  static async getStatistics(req: any, res: Response) {
    try {
      const stats = await WithdrawalService.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
