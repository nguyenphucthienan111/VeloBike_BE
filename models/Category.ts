import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface ICategory extends MongooseDocument {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: String,
    icon: String,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Category = mongoose.model<ICategory>("Category", CategorySchema);
