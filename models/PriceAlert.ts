import mongoose, { Schema, Document as MongooseDocument, Types } from "mongoose";

export interface IPriceAlert extends MongooseDocument {
  userId: Types.ObjectId;
  listingId: Types.ObjectId;
  targetPrice: number;
  currentPrice: number;
  isActive: boolean;
  triggered: boolean;
  triggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PriceAlertSchema = new Schema<IPriceAlert>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true
    },
    targetPrice: {
      type: Number,
      required: true,
      min: 0
    },
    currentPrice: {
      type: Number,
      required: true,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    triggered: {
      type: Boolean,
      default: false,
      index: true
    },
    triggeredAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
PriceAlertSchema.index({ userId: 1, isActive: 1 });
PriceAlertSchema.index({ listingId: 1, isActive: 1 });
PriceAlertSchema.index({ isActive: 1, triggered: 1 }); // For alert processing

// Ensure one alert per user per listing
PriceAlertSchema.index({ userId: 1, listingId: 1 }, { unique: true });

export const PriceAlert = mongoose.model<IPriceAlert>("PriceAlert", PriceAlertSchema);