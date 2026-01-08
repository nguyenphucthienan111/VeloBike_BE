import mongoose, { Schema, Document as MongooseDocument, Types } from "mongoose";

export interface IMessage extends MongooseDocument {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  content: string;
  attachments?: string[]; // Image/file URLs
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true },
    attachments: [String],
    isRead: { type: Boolean, default: false, index: true },
    readAt: Date,
  },
  { timestamps: true }
);

export const Message = mongoose.model<IMessage>("Message", MessageSchema);

// Conversation model for grouping messages
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
