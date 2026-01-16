import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUpload extends Document {
  userId: Types.ObjectId;
  publicId: string;
  url: string;
  folder: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  createdAt: Date;
}

const UploadSchema = new Schema<IUpload>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    publicId: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    folder: { type: String, default: "velobike_listings" },
    width: Number,
    height: Number,
    format: String,
    size: Number,
  },
  { timestamps: true }
);

export const Upload = mongoose.model<IUpload>("Upload", UploadSchema);
