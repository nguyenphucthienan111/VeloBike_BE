import mongoose, { Schema, Document as MongooseDocument, Types } from "mongoose";

export interface IWishlist extends MongooseDocument {
  buyerId: Types.ObjectId;
  listingId: Types.ObjectId;
  addedAt: Date;
}

const WishlistSchema = new Schema<IWishlist>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure one wishlist entry per user per listing
WishlistSchema.index({ buyerId: 1, listingId: 1 }, { unique: true });

export const Wishlist = mongoose.model<IWishlist>("Wishlist", WishlistSchema);
