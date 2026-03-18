import mongoose, { Schema, Document, Types } from "mongoose";

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IInspectorApplication extends Document {
  userId: Types.ObjectId;
  status: ApplicationStatus;
  // Personal info snapshot
  fullName: string;
  email: string;
  phone: string;
  // Credentials
  yearsOfExperience: number;
  specializations: string[]; // e.g. ["ROAD", "MTB", "E_BIKE"]
  bio: string; // Short intro / motivation
  certificates: Array<{
    name: string;       // e.g. "Certified Bicycle Mechanic - SBMA"
    issuedBy: string;
    issuedYear: number;
    imageUrl: string;   // Uploaded certificate image
  }>;
  // Admin review
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
}

const InspectorApplicationSchema = new Schema<IInspectorApplication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    yearsOfExperience: { type: Number, required: true, min: 0 },
    specializations: [{ type: String }],
    bio: { type: String, required: true },
    certificates: [
      {
        name: { type: String, required: true },
        issuedBy: { type: String, required: true },
        issuedYear: { type: Number, required: true },
        imageUrl: { type: String, required: true },
      },
    ],
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    rejectionReason: String,
  },
  { timestamps: true }
);

// One active application per user at a time
InspectorApplicationSchema.index({ userId: 1, status: 1 });

export const InspectorApplication = mongoose.model<IInspectorApplication>(
  "InspectorApplication",
  InspectorApplicationSchema
);
