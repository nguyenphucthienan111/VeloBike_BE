import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface ICategory extends MongooseDocument {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  specsTemplate?: string[]; // Required specs fields for this category type
  isActive: boolean;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: String,
    icon: String,
    specsTemplate: [String], // Array of required spec fields
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Category = mongoose.model<ICategory>("Category", CategorySchema);
