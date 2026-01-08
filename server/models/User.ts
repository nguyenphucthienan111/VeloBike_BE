import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
  GUEST = 'GUEST',
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  INSPECTOR = 'INSPECTOR',
  ADMIN = 'ADMIN'
}

export enum KycStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export interface IUser extends Document {
  email: string;
  passwordHash: string; // Will act as placeholder for Auth logic
  fullName: string;
  role: UserRole;
  kycStatus: KycStatus;
  wallet: {
    balance: number;
    currency: string;
  };
  reputation: {
    score: number;
    reviewCount: number;
  };
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { 
    type: String, 
    enum: Object.values(UserRole), 
    default: UserRole.GUEST 
  },
  kycStatus: {
    type: String,
    enum: Object.values(KycStatus),
    default: KycStatus.PENDING
  },
  wallet: {
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'VND' }
  },
  reputation: {
    score: { type: Number, default: 5.0 },
    reviewCount: { type: Number, default: 0 }
  }
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);