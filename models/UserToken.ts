import mongoose, { Schema, Document } from "mongoose";

export interface IUserToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string; // Refresh token string
  tokenType: "REFRESH" | "RESET_PASSWORD" | "EMAIL_VERIFICATION";
  expiresAt: Date;
  isRevoked: boolean;
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
    deviceId?: string;
  };
  lastUsedAt?: Date;
  createdAt: Date;
}

const UserTokenSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenType: {
      type: String,
      enum: ["REFRESH", "RESET_PASSWORD", "EMAIL_VERIFICATION"],
      default: "REFRESH",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true, // For automatic cleanup
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    deviceInfo: {
      userAgent: String,
      ipAddress: String,
      deviceId: String,
    },
    lastUsedAt: Date,
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
UserTokenSchema.index({ userId: 1, tokenType: 1 });
UserTokenSchema.index({ userId: 1, isRevoked: 1 });
UserTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired tokens

// Remove expired tokens automatically
UserTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const UserToken = mongoose.model<IUserToken>("UserToken", UserTokenSchema);