import { Withdrawal, WithdrawalStatus, IWithdrawal } from "../models/Withdrawal";
import { User } from "../models/User";
import { Transaction } from "../models/Transaction";
import { Types } from "mongoose";

// Withdrawal fee policy
const WITHDRAWAL_FEE_THRESHOLD = 1000000; // 1 triệu
const WITHDRAWAL_FEE_BELOW_THRESHOLD = 10000; // 10k phí
const MINIMUM_WITHDRAWAL = 50000; // Tối thiểu 50k

export class WithdrawalService {
  /**
   * Calculate withdrawal fee
   */
  static calculateFee(amount: number): number {
    if (amount >= WITHDRAWAL_FEE_THRESHOLD) {
      return 0; // Miễn phí nếu >= 1 triệu
    }
    return WITHDRAWAL_FEE_BELOW_THRESHOLD; // 10k nếu < 1 triệu
  }

  /**
   * Request withdrawal
   */
  static async requestWithdrawal(
    userId: string,
    amount: number,
    bankAccount: {
      bankName: string;
      accountNumber: string;
      accountName: string;
      branch?: string;
    }
  ): Promise<IWithdrawal> {
    // Validate amount
    if (amount < MINIMUM_WITHDRAWAL) {
      throw new Error(`Số tiền rút tối thiểu là ${MINIMUM_WITHDRAWAL.toLocaleString()} VNĐ`);
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Calculate fee
    const fee = this.calculateFee(amount);
    const netAmount = amount - fee;

    // Check balance
    if (user.wallet.balance < amount) {
      throw new Error(
        `Số dư không đủ. Số dư hiện tại: ${user.wallet.balance.toLocaleString()} VNĐ, cần: ${amount.toLocaleString()} VNĐ`
      );
    }

    // Check for pending withdrawals
    const pendingWithdrawal = await Withdrawal.findOne({
      userId: new Types.ObjectId(userId),
      status: WithdrawalStatus.PENDING,
    });

    if (pendingWithdrawal) {
      throw new Error(
        "Bạn đã có yêu cầu rút tiền đang chờ xử lý. Vui lòng đợi admin duyệt hoặc hủy yêu cầu cũ."
      );
    }

    // Create withdrawal request
    const withdrawal = new Withdrawal({
      userId: new Types.ObjectId(userId),
      amount,
      fee,
      netAmount,
      bankAccount,
      status: WithdrawalStatus.PENDING,
      requestedAt: new Date(),
    });

    await withdrawal.save();

    // Hold the amount in wallet (optional: create a "frozen" field)
    // For now, we just create the request

    return withdrawal;
  }

  /**
   * Get user's withdrawals
   */
  static async getUserWithdrawals(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ withdrawals: IWithdrawal[]; total: number }> {
    const withdrawals = await Withdrawal.find({
      userId: new Types.ObjectId(userId),
    })
      .sort({ requestedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Withdrawal.countDocuments({
      userId: new Types.ObjectId(userId),
    });

    return { withdrawals, total };
  }

  /**
   * Cancel withdrawal (user)
   */
  static async cancelWithdrawal(
    withdrawalId: string,
    userId: string
  ): Promise<IWithdrawal> {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      throw new Error("Withdrawal request not found");
    }

    if (withdrawal.userId.toString() !== userId) {
      throw new Error("Not authorized");
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new Error(
        `Không thể hủy yêu cầu ở trạng thái ${withdrawal.status}`
      );
    }

    withdrawal.status = WithdrawalStatus.CANCELLED;
    await withdrawal.save();

    return withdrawal;
  }

  /**
   * Get all withdrawal requests (admin)
   */
  static async getAllWithdrawals(
    status?: WithdrawalStatus,
    page: number = 1,
    limit: number = 20
  ): Promise<{ withdrawals: IWithdrawal[]; total: number }> {
    const query: any = {};
    if (status) {
      query.status = status;
    }

    const withdrawals = await Withdrawal.find(query)
      .populate("userId", "fullName email phone bankAccount")
      .populate("processedBy", "fullName")
      .sort({ requestedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Withdrawal.countDocuments(query);

    return { withdrawals, total };
  }

  /**
   * Approve withdrawal (admin)
   */
  static async approveWithdrawal(
    withdrawalId: string,
    adminId: string
  ): Promise<IWithdrawal> {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      throw new Error("Withdrawal request not found");
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new Error(
        `Không thể duyệt yêu cầu ở trạng thái ${withdrawal.status}`
      );
    }

    // Check user balance again
    const user = await User.findById(withdrawal.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.wallet.balance < withdrawal.amount) {
      throw new Error(
        `Số dư không đủ. User balance: ${user.wallet.balance}, requested: ${withdrawal.amount}`
      );
    }

    // Deduct from wallet
    user.wallet.balance -= withdrawal.amount;
    await user.save();

    // Create transaction
    const transaction = await Transaction.create({
      userId: withdrawal.userId,
      type: "WITHDRAW",
      amount: -withdrawal.amount, // Negative for withdrawal
      status: "COMPLETED",
      description: `Rút tiền về ${withdrawal.bankAccount.bankName} ${withdrawal.bankAccount.accountNumber}`,
      metadata: {
        withdrawalId: withdrawal._id,
        fee: withdrawal.fee,
        netAmount: withdrawal.netAmount,
        bankAccount: withdrawal.bankAccount,
      },
    });

    // Update withdrawal
    withdrawal.status = WithdrawalStatus.APPROVED;
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = new Types.ObjectId(adminId);
    withdrawal.transactionId = transaction._id;

    await withdrawal.save();

    return withdrawal;
  }

  /**
   * Mark as completed (admin - after transfer)
   */
  static async completeWithdrawal(
    withdrawalId: string,
    adminId: string,
    transferProof?: string,
    note?: string
  ): Promise<IWithdrawal> {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      throw new Error("Withdrawal request not found");
    }

    if (withdrawal.status !== WithdrawalStatus.APPROVED) {
      throw new Error(
        `Chỉ có thể complete withdrawal ở trạng thái APPROVED`
      );
    }

    withdrawal.status = WithdrawalStatus.COMPLETED;
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = new Types.ObjectId(adminId);
    if (transferProof) withdrawal.transferProof = transferProof;
    if (note) withdrawal.note = note;

    await withdrawal.save();

    return withdrawal;
  }

  /**
   * Reject withdrawal (admin)
   */
  static async rejectWithdrawal(
    withdrawalId: string,
    adminId: string,
    reason: string
  ): Promise<IWithdrawal> {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      throw new Error("Withdrawal request not found");
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new Error(
        `Không thể reject yêu cầu ở trạng thái ${withdrawal.status}`
      );
    }

    withdrawal.status = WithdrawalStatus.REJECTED;
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = new Types.ObjectId(adminId);
    withdrawal.rejectionReason = reason;

    await withdrawal.save();

    // No need to refund wallet since we didn't deduct yet

    return withdrawal;
  }

  /**
   * Get withdrawal statistics (admin)
   */
  static async getStatistics(): Promise<{
    pending: number;
    approved: number;
    completed: number;
    rejected: number;
    totalAmount: number;
    totalFees: number;
  }> {
    const stats = await Withdrawal.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalFees: { $sum: "$fee" },
        },
      },
    ]);

    const result = {
      pending: 0,
      approved: 0,
      completed: 0,
      rejected: 0,
      totalAmount: 0,
      totalFees: 0,
    };

    stats.forEach((stat) => {
      const status = stat._id.toLowerCase();
      if (status in result) {
        result[status as keyof typeof result] = stat.count;
      }
      result.totalAmount += stat.totalAmount;
      result.totalFees += stat.totalFees;
    });

    return result;
  }
}
