import mongoose, { Schema, Document as MongooseDocument, Types } from "mongoose";

export interface ISavedSearch extends MongooseDocument {
  userId: Types.ObjectId;
  name: string;
  query: {
    type?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    location?: string;
    size?: string;
    condition?: string;
    [key: string]: any;
  };
  alertsEnabled: boolean;
  lastNotified?: Date;
  resultsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SavedSearchSchema = new Schema<ISavedSearch>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 100
    },
    query: {
      type: Schema.Types.Mixed,
      required: true
    },
    alertsEnabled: {
      type: Boolean,
      default: true,
      index: true
    },
    lastNotified: {
      type: Date
    },
    resultsCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexes
SavedSearchSchema.index({ userId: 1, createdAt: -1 });
SavedSearchSchema.index({ alertsEnabled: 1, lastNotified: 1 }); // For alert processing

export const SavedSearch = mongoose.model<ISavedSearch>("SavedSearch", SavedSearchSchema);