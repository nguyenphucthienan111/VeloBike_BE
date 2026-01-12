import mongoose, { Schema, Document } from "mongoose";

export interface IInspection extends Document {
  listingId: mongoose.Types.ObjectId; // Always required
  orderId?: mongoose.Types.ObjectId; // Optional for PRE_SALE inspections
  inspectorId: mongoose.Types.ObjectId;
  type: "PRE_SALE" | "POST_SALE_ORDER"; // New field per bạn bạn suggestion
  overallVerdict: "PASSED" | "FAILED" | "SUGGEST_ADJUSTMENT";
  overallScore: number; // 1-10
  grade: "A" | "B" | "C" | "D"; // SRS BikeMarket grade system
  fee?: number; // Inspection fee amount
  feeTransactionId?: mongoose.Types.ObjectId; // Link to Transaction

  checkpoints: Array<{
    component: string; // e.g., "Frame - Top Tube", "Rear Derailleur"
    status: "PASS" | "FAIL" | "WARN";
    observation?: string;
    evidenceImages?: string[]; // URLs to evidence photos
    severity?: "LOW" | "MEDIUM" | "CRITICAL";
  }>;

  inspectorNote?: string;
  completedAt: Date;
}

const InspectionSchema: Schema = new Schema(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true, // Not required for PRE_SALE inspections
    },
    inspectorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["PRE_SALE", "POST_SALE_ORDER"],
      required: true,
      index: true,
    },
    overallVerdict: {
      type: String,
      enum: ["PASSED", "FAILED", "SUGGEST_ADJUSTMENT"],
      required: true,
    },
    overallScore: { type: Number, required: true, min: 1, max: 10 },
    grade: { 
      type: String, 
      enum: ["A", "B", "C", "D"], 
      required: true 
    },
    fee: { type: Number }, // Inspection fee
    feeTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
    },

    checkpoints: [
      {
        component: { type: String, required: true },
        status: {
          type: String,
          enum: ["PASS", "FAIL", "WARN"],
          required: true,
        },
        observation: String,
        evidenceImages: [String],
        severity: { type: String, enum: ["LOW", "MEDIUM", "CRITICAL"] },
      },
    ],

    inspectorNote: String,
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Inspection = mongoose.model<IInspection>(
  "Inspection",
  InspectionSchema
);
