import mongoose, { Schema, Document, Types } from "mongoose";
import { PlanType } from "./SubscriptionPlan";

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
  PENDING = "PENDING", // Chờ thanh toán
}

export interface ISellerSubscription extends Document {
  sellerId: Types.ObjectId;
  planType: PlanType;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  autoRenew: boolean;
  
  // Usage tracking
  listingsUsedThisMonth: number;
  boostsUsedThisWeek: number;
  inspectionsUsedThisMonth: number;
  lastResetDate: Date; // Ngày reset quota hàng tháng
  
  // Payment history
  paymentHistory: Array<{
    amount: number;
    paidAt: Date;
    transactionId: string;
    paymentMethod: string;
  }>;
  
  // Pending payment (for webhook lookup)
  pendingPayment?: {
    orderCode: number;
    planType: PlanType;
    createdAt: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const SellerSubscriptionSchema: Schema = new Schema(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Mỗi seller chỉ có 1 subscription active
      index: true,
    },
    planType: {
      type: String,
      enum: Object.values(PlanType),
      default: PlanType.FREE,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    
    // Usage tracking
    listingsUsedThisMonth: {
      type: Number,
      default: 0,
    },
    boostsUsedThisWeek: {
      type: Number,
      default: 0,
    },
    inspectionsUsedThisMonth: {
      type: Number,
      default: 0,
    },
    lastResetDate: {
      type: Date,
      default: Date.now,
    },
    
    // Payment history
    paymentHistory: [{
      amount: { type: Number, required: true },
      paidAt: { type: Date, default: Date.now },
      transactionId: { type: String },
      paymentMethod: { type: String, default: "PAYOS" },
    }],
    
    // Pending payment (for webhook lookup)
    pendingPayment: {
      orderCode: { type: Number },
      planType: { 
        type: String, 
        enum: Object.values(PlanType) 
      },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Index for finding expired subscriptions
SellerSubscriptionSchema.index({ endDate: 1, status: 1 });

// Method to check if subscription is valid
SellerSubscriptionSchema.methods.isValid = function(): boolean {
  return this.status === SubscriptionStatus.ACTIVE && this.endDate > new Date();
};

// Method to check if can create listing
SellerSubscriptionSchema.methods.canCreateListing = async function(maxListings: number): Promise<boolean> {
  if (maxListings === -1) return true; // Unlimited
  return this.listingsUsedThisMonth < maxListings;
};

export const SellerSubscription = mongoose.model<ISellerSubscription>(
  "SellerSubscription",
  SellerSubscriptionSchema
);
