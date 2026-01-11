import mongoose, { Schema, Document } from "mongoose";

export interface IInspection extends Document {
  orderId: mongoose.Types.ObjectId;
  inspectorId: mongoose.Types.ObjectId;
  overallVerdict: "PASSED" | "FAILED" | "SUGGEST_ADJUSTMENT";
  overallScore: number; // 1-10
  grade: "A" | "B" | "C" | "D"; // SRS BikeMarket grade system

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
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    inspectorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
    }, // SRS BikeMarket grade system

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
