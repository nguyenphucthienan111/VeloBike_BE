import mongoose, { Schema, Document } from "mongoose";

export enum PlanType {
  FREE = "FREE",
  BASIC = "BASIC",
  PRO = "PRO",
  PREMIUM = "PREMIUM",
}

export interface ISubscriptionPlan extends Document {
  name: PlanType;
  displayName: string;
  price: number; // VND/tháng
  commissionRate: number; // % hoa hồng (0.12 = 12%)
  maxListingsPerMonth: number; // -1 = unlimited
  features: string[];
  boostPerWeek: number; // Số lần boost miễn phí/tuần
  freeInspectionsPerMonth: number; // Số lần kiểm định miễn phí/tháng
  priorityLevel: number; // 1-4, cao hơn = ưu tiên hơn
  approvalTimeHours: number; // Thời gian duyệt tin (giờ)
  badge?: string; // Badge hiển thị
  isActive: boolean;
}

const SubscriptionPlanSchema: Schema = new Schema(
  {
    name: {
      type: String,
      enum: Object.values(PlanType),
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    commissionRate: {
      type: Number,
      required: true,
      default: 0.12, // 12%
    },
    maxListingsPerMonth: {
      type: Number,
      required: true,
      default: 2, // FREE = 2 tin/tháng
    },
    features: [{
      type: String,
    }],
    boostPerWeek: {
      type: Number,
      default: 0,
    },
    freeInspectionsPerMonth: {
      type: Number,
      default: 0,
    },
    priorityLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 4,
    },
    approvalTimeHours: {
      type: Number,
      default: 48,
    },
    badge: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>(
  "SubscriptionPlan",
  SubscriptionPlanSchema
);
