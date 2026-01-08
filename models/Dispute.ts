import mongoose, { Schema, Document as MongooseDocument, Types } from "mongoose";

export enum DisputeStatus {
  OPEN = "OPEN",
  IN_REVIEW = "IN_REVIEW",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

export enum DisputeReason {
  ITEM_NOT_RECEIVED = "ITEM_NOT_RECEIVED",
  ITEM_NOT_AS_DESCRIBED = "ITEM_NOT_AS_DESCRIBED",
  ITEM_DAMAGED = "ITEM_DAMAGED",
  QUALITY_ISSUE = "QUALITY_ISSUE",
  PAYMENT_ISSUE = "PAYMENT_ISSUE",
  INSPECTION_DISPUTE = "INSPECTION_DISPUTE",
  OTHER = "OTHER",
}

export interface IDispute extends MongooseDocument {
  orderId: Types.ObjectId;
  claimantId: Types.ObjectId; // Who opened the dispute
  respondentId: Types.ObjectId; // The other party
  reason: DisputeReason;
  description: string;
  evidence?: string[]; // Image/document URLs
  status: DisputeStatus;
  resolution?: string;
  resolvedBy?: Types.ObjectId; // Admin who resolved
  resolvedAt?: Date;
  compensationAmount?: number;
  createdAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    claimantId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    respondentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: { type: String, enum: Object.values(DisputeReason), required: true },
    description: { type: String, required: true },
    evidence: [String],
    status: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
      index: true,
    },
    resolution: String,
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: Date,
    compensationAmount: { type: Number, min: 0 },
  },
  { timestamps: true }
);

DisputeSchema.index({ orderId: 1, claimantId: 1 }, { unique: true });

export const Dispute = mongoose.model<IDispute>("Dispute", DisputeSchema);
