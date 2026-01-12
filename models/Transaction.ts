import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: "DEPOSIT" | "WITHDRAW" | "PAYMENT_HOLD" | "PAYMENT_RELEASE" | "REFUND" | "PLATFORM_FEE" | "INSPECTION_FEE";
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  relatedOrderId?: mongoose.Types.ObjectId;
  relatedInspectionId?: mongoose.Types.ObjectId;
  description: string;
  paymentGatewayRef?: string; // PayOS transaction ID
  metadata?: object; // Additional payment gateway data
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["DEPOSIT", "WITHDRAW", "PAYMENT_HOLD", "PAYMENT_RELEASE", "REFUND", "PLATFORM_FEE", "INSPECTION_FEE"],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    relatedOrderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    relatedInspectionId: {
      type: Schema.Types.ObjectId,
      ref: "Inspection",
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    paymentGatewayRef: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1 });
TransactionSchema.index({ relatedOrderId: 1, type: 1 });

export const Transaction = mongoose.model<ITransaction>("Transaction", TransactionSchema);