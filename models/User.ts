import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export enum UserRole {
  GUEST = "GUEST",
  BUYER = "BUYER",
  SELLER = "SELLER",
  INSPECTOR = "INSPECTOR",
  ADMIN = "ADMIN",
}

export enum KycStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export interface IUser extends MongooseDocument {
  email: string;
  passwordHash?: string; // Optional because Google users might not have a password initially
  googleId?: string; // Google OAuth ID
  facebookId?: string; // Facebook OAuth ID
  fullName: string;
  avatar?: string; // User profile picture
  phone?: string;
  address?: {
    street?: string;
    district?: string;
    city?: string;
    province?: string;
    zipCode?: string;
  };
  role: UserRole;
  kycStatus: KycStatus;
  kycData?: {
    documentId?: string;
    documentType?: string;
    frontImage?: string;
    backImage?: string;
    verifiedAt?: Date;
    confidence?: number;
    documentData?: any;
    faceMatchScore?: number;
    verifiedBy?: string;
    note?: string;
  };
  bodyMeasurements?: {
    height?: number;
    inseam?: number;
    weight?: number;
  };
  wallet: {
    balance: number;
    currency: string;
  };
  reputation: {
    score: number;
    reviewCount: number;
  };
  fcmToken?: string;
  bankAccount?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
  };
  inspectorProfile?: {
    bio?: string;
    yearsOfExperience?: number;
    specializations?: string[];
    certificates?: Array<{
      name: string;
      issuedBy: string;
      issuedYear: number;
      imageUrl?: string;
    }>;
  };
  isActive?: boolean;
  emailVerified?: boolean;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    facebookId: { type: String, unique: true, sparse: true },
    fullName: { type: String, required: true },
    avatar: { type: String },
    phone: { type: String },
    address: {
      street: String,
      district: String,
      city: String,
      province: String,
      zipCode: String,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.GUEST,
    },
    kycStatus: {
      type: String,
      enum: Object.values(KycStatus),
      default: KycStatus.PENDING,
    },
    kycData: {
      documentId: { type: String, index: true },
      documentType: String,
      frontImage: String,
      backImage: String,
      verifiedAt: Date,
      confidence: Number,
      documentData: Schema.Types.Mixed,
      faceMatchScore: Number,
      verifiedBy: String,
      note: String,
    },
    bodyMeasurements: {
      height: Number, // cm
      inseam: Number, // cm
      weight: Number, // kg
    },
    wallet: {
      balance: { type: Number, default: 0 },
      currency: { type: String, default: "VND" },
    },
    reputation: {
      score: { type: Number, default: 5.0 },
      reviewCount: { type: Number, default: 0 },
    },
    fcmToken: String,
    bankAccount: {
      accountName: String,
      accountNumber: String,
      bankName: String,
    },
    inspectorProfile: {
      bio: String,
      yearsOfExperience: Number,
      specializations: [String],
      certificates: [{
        name: String,
        issuedBy: String,
        issuedYear: Number,
        imageUrl: String,
      }],
    },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Prevent same CCCD/CMND from being used across multiple accounts
UserSchema.index({ 'kycData.documentId': 1 }, { unique: true, sparse: true });

export const User = mongoose.model<IUser>("User", UserSchema);
