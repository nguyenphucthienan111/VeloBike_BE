import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface IBrand extends MongooseDocument {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  country?: string;
  website?: string;
  isActive: boolean;
  createdAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: String,
    logo: String,
    country: String,
    website: String,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Brand = mongoose.model<IBrand>("Brand", BrandSchema);

