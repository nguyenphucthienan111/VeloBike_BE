import mongoose, { Schema, Document } from "mongoose";

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  reason: "FRAUD" | "INAPPROPRIATE_CONTENT" | "FAKE_LISTING" | "SPAM" | "OTHER";
  description: string;
  evidence?: string[]; // URLs to evidence images
  status: "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";
  adminNote?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
}

const ReportSchema: Schema = new Schema(
  {
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    reason: {
      type: String,
      enum: ["FRAUD", "INAPPROPRIATE_CONTENT", "FAKE_LISTING", "SPAM", "OTHER"],
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    evidence: [String], // URLs to evidence images
    status: {
      type: String,
      enum: ["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"],
      default: "PENDING",
    },
    adminNote: String,
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
  },
  { timestamps: true }
);

// Index for efficient queries
ReportSchema.index({ listingId: 1, status: 1 });
ReportSchema.index({ reporterId: 1 });

export const Report = mongoose.model<IReport>("Report", ReportSchema);