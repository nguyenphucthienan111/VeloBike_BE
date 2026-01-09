import mongoose, { Schema, Document } from "mongoose";

export interface IOtp extends Document {
  identifier: string; // email or phone
  code: string;
  expiresAt: Date;
}

const OtpSchema: Schema = new Schema({
  identifier: { type: String, required: true, index: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

// TTL Index: Automatically delete documents after they expire
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model<IOtp>("Otp", OtpSchema);
