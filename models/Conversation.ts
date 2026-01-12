import mongoose, { Schema, Document as MongooseDocument, Types } from "mongoose";

export interface IConversation extends MongooseDocument {
  buyerId: Types.ObjectId;
  sellerId: Types.ObjectId;
  listingId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    lastMessage: String,
    lastMessageAt: Date,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Index for finding conversations between two users
ConversationSchema.index({ buyerId: 1, sellerId: 1 }, { unique: true });

export const Conversation = mongoose.model<IConversation>("Conversation", ConversationSchema);