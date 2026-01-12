import { Request, Response } from "express";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";

export class TransactionController {
  /**
   * Get user's transaction history
   * GET /api/transactions/my-transactions
   */
  static async getMyTransactions(req: any, res: any) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { page = 1, limit = 20, type, status } = req.query;

      const query: any = { userId };
      if (type) query.type = type;
      if (status) query.status = status;

      const transactions = await Transaction.find(query)
        .populate("relatedOrderId", "financials.totalAmount")
        .populate("relatedInspectionId", "fee")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Transaction.countDocuments(query);

      res.json({
        success: true,
        data: transactions,
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
   * Get transaction by ID
   * GET /api/transactions/:id
   */
  static async getById(req: any, res: any) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const transaction = await Transaction.findOne({ _id: id, userId })
        .populate("relatedOrderId")
        .populate("relatedInspectionId")
        .populate("userId", "fullName email");

      if (!transaction) {
        return res.status(404).json({ success: false, message: "Transaction not found" });
      }

      res.json({ success: true, data: transaction });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Admin: Get all transactions
   * GET /api/admin/transactions
   */
  static async getAllTransactions(req: any, res: any) {
    try {
      const { page = 1, limit = 20, type, status, userId } = req.query;

      const query: any = {};
      if (type) query.type = type;
      if (status) query.status = status;
      if (userId) query.userId = userId;

      const transactions = await Transaction.find(query)
        .populate("userId", "fullName email")
        .populate("relatedOrderId", "financials.totalAmount")
        .populate("relatedInspectionId", "fee")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Transaction.countDocuments(query);

      // Calculate summary stats
      const stats = await Transaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      res.json({
        success: true,
        data: transactions,
        stats,
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
   * Create transaction (Internal use - called by services)
   * POST /api/transactions
   */
  static async createTransaction(req: any, res: any) {
    try {
      const {
        userId,
        type,
        amount,
        description,
        relatedOrderId,
        relatedInspectionId,
        paymentGatewayRef,
        metadata,
      } = req.body;

      const transaction = new Transaction({
        userId,
        type,
        amount,
        description,
        relatedOrderId,
        relatedInspectionId,
        paymentGatewayRef,
        metadata,
        status: "PENDING",
      });

      await transaction.save();

      // Update user wallet if transaction is COMPLETED
      if (req.body.status === "COMPLETED") {
        await this.updateUserWallet(userId, type, amount);
      }

      res.status(201).json({ success: true, data: transaction });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Update transaction status (Internal use)
   * PUT /api/transactions/:id/status
   */
  static async updateTransactionStatus(req: any, res: any) {
    try {
      const { id } = req.params;
      const { status, paymentGatewayRef, metadata } = req.body;

      const transaction = await Transaction.findById(id);
      if (!transaction) {
        return res.status(404).json({ success: false, message: "Transaction not found" });
      }

      const oldStatus = transaction.status;
      transaction.status = status;
      if (paymentGatewayRef) transaction.paymentGatewayRef = paymentGatewayRef;
      if (metadata) transaction.metadata = { ...transaction.metadata, ...metadata };

      await transaction.save();

      // Update user wallet when status changes to COMPLETED
      if (oldStatus !== "COMPLETED" && status === "COMPLETED") {
        await this.updateUserWallet(transaction.userId, transaction.type, transaction.amount);
      }

      res.json({ success: true, data: transaction });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Helper: Update user wallet based on transaction
   */
  private static async updateUserWallet(userId: any, type: string, amount: number) {
    const user = await User.findById(userId);
    if (!user) return;

    switch (type) {
      case "DEPOSIT":
      case "REFUND":
      case "PAYMENT_RELEASE":
        user.wallet.balance += amount;
        break;
      case "WITHDRAW":
      case "PAYMENT_HOLD":
      case "PLATFORM_FEE":
      case "INSPECTION_FEE":
        user.wallet.balance -= amount;
        break;
    }

    await user.save();
  }

  /**
   * Get transaction statistics
   * GET /api/transactions/stats
   */
  static async getTransactionStats(req: any, res: any) {
    try {
      const userId = req.user?.id;
      const { period = "month" } = req.query;

      const dateFilter = this.getDateFilter(period as string);

      const stats = await Transaction.aggregate([
        { $match: { userId, createdAt: { $gte: dateFilter } } },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const totalBalance = await User.findById(userId).select("wallet.balance");

      res.json({
        success: true,
        data: {
          currentBalance: totalBalance?.wallet.balance || 0,
          period,
          transactionStats: stats,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Helper: Get date filter based on period
   */
  private static getDateFilter(period: string): Date {
    const now = new Date();
    const date = new Date(now);

    switch (period) {
      case "day":
        date.setDate(date.getDate() - 1);
        break;
      case "week":
        date.setDate(date.getDate() - 7);
        break;
      case "month":
        date.setMonth(date.getMonth() - 1);
        break;
      case "year":
        date.setFullYear(date.getFullYear() - 1);
        break;
      default:
        date.setMonth(date.getMonth() - 1);
    }

    return date;
  }
}