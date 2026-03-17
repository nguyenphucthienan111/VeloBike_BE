import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInspectorReview extends Document {
  inspectionId: Types.ObjectId;
  inspectorId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  reviewerRole: "BUYER" | "SELLER";
  rating: number; // 1-5
  comment: string;
  categories: {
    professionalism: number;
    accuracy: number;
    communication: number;
    timeliness: number;
  };
  createdAt: Date;
}

const InspectorReviewSchema = new Schema<IInspectorReview>(
  {
    inspectionId: { type: Schema.Types.ObjectId, ref: "Inspection", required: true, index: true },
    inspectorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewerRole: { type: String, enum: ["BUYER", "SELLER"], required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    categories: {
      professionalism: { type: Number, min: 1, max: 5, default: 5 },
      accuracy: { type: Number, min: 1, max: 5, default: 5 },
      communication: { type: Number, min: 1, max: 5, default: 5 },
      timeliness: { type: Number, min: 1, max: 5, default: 5 },
    },
  },
  { timestamps: true }
);

// One review per inspection per reviewer
InspectorReviewSchema.index({ inspectionId: 1, reviewerId: 1 }, { unique: true });

export const InspectorReview = mongoose.model<IInspectorReview>("InspectorReview", InspectorReviewSchema);
