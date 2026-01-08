import mongoose, { Schema, Document as MongooseDocument, Types } from "mongoose";

export interface IReview extends MongooseDocument {
  orderId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  revieweeId: Types.ObjectId;
  rating: number; // 1-5 stars
  comment: string;
  categories: {
    itemAccuracy: number;
    communication: number;
    shipping: number;
    packaging: number;
  };
  type: "SELLER" | "BUYER"; // Review from who to whom
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    revieweeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    categories: {
      itemAccuracy: { type: Number, min: 1, max: 5, default: 5 },
      communication: { type: Number, min: 1, max: 5, default: 5 },
      shipping: { type: Number, min: 1, max: 5, default: 5 },
      packaging: { type: Number, min: 1, max: 5, default: 5 },
    },
    type: { type: String, enum: ["SELLER", "BUYER"], required: true },
  },
  { timestamps: true }
);

// Ensure one review per order from each side
ReviewSchema.index({ orderId: 1, reviewerId: 1, type: 1 }, { unique: true });

export const Review = mongoose.model<IReview>("Review", ReviewSchema);
