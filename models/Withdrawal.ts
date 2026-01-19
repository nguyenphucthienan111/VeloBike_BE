import mongoose, { Schema, Document } from "mongoose";

export enum WithdrawalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export interface IWithdrawal extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  fee: number;
  netAmount: number; // amount - fee
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    branch?: string;
  };
  status: WithdrawalStatus;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: mongoose.Types.ObjectId; // Admin ID
  rejectionReason?: string;
  transactionId?: mongoose.Types.ObjectId; // Link to Transaction
  transferProof?: string; // URL to transfer screenshot
  note?: string;
}

const WithdrawalSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 50000, // Minimum 50k VNĐ
    },
    fee: {
      type: Number,
      required: true,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    bankAccount: {
      bankName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      accountName: { type: String, required: true },
      branch: String,
    },
    status: {
      type: String,
      enum: Object.values(WithdrawalStatus),
      default: WithdrawalStatus.PENDING,
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: Date,
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: String,
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
    },
    transferProof: String,
    note: String,
  },
  { timestamps: true }
);

// Index for admin queries
WithdrawalSchema.index({ status: 1, requestedAt: -1 });
WithdrawalSchema.index({ userId: 1, status: 1 });

export const Withdrawal = mongoose.model<IWithdrawal>(
  "Withdrawal",
  WithdrawalSchema
);
