import mongoose, { Schema, Document } from "mongoose";

export interface IChatbotConversation extends Document {
  userId?: string; // Optional (guest)
  sessionId: string; // Unique session ID
  messages: Array<{
    sender: "USER" | "BOT";
    text: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ChatbotConversationSchema = new Schema(
  {
    userId: { type: String, index: true },
    sessionId: { type: String, required: true, index: true },
    messages: [
      {
        sender: { type: String, enum: ["USER", "BOT"], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const ChatbotConversation = mongoose.model<IChatbotConversation>(
  "ChatbotConversation",
  ChatbotConversationSchema
);
