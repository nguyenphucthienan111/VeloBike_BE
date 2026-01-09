import { Request, Response } from "express";
import { Message, Conversation } from "../models/Message";
import { User } from "../models/User";
import mongoose from "mongoose";

export class MessageController {
  /**
   * Get or create conversation
   * GET /api/messages/conversation/:userId
   */
  static async getOrCreateConversation(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).userId;
      const { listingId, orderId } = req.query;

      const conversation = await Conversation.findOne({
        $or: [
          { buyerId: currentUserId, sellerId: userId },
          { buyerId: userId, sellerId: currentUserId },
        ],
      });

      if (conversation) {
        return res.status(200).json({
          success: true,
          data: conversation,
        });
      }

      // Create new conversation
      const newConversation = new Conversation({
        buyerId: currentUserId,
        sellerId: userId,
        listingId: listingId || undefined,
        orderId: orderId || undefined,
      });

      await newConversation.save();

      res.status(201).json({
        success: true,
        message: "Conversation created",
        data: newConversation,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Error creating conversation",
          error: error.message,
        });
    }
  }

  /**
   * Send message
   * POST /api/messages
   */
  static async sendMessage(req: Request, res: Response) {
    try {
      const { conversationId, receiverId, content, attachments } = req.body;
      const senderId = (req as any).userId;

      // Verify conversation exists
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res
          .status(404)
          .json({ success: false, message: "Conversation not found" });
      }

      const message = new Message({
        conversationId: new mongoose.Types.ObjectId(conversationId),
        senderId: new mongoose.Types.ObjectId(senderId),
        receiverId: new mongoose.Types.ObjectId(receiverId),
        content,
        attachments: attachments || [],
        isRead: false,
      });

      await message.save();

      // Update conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: content,
        lastMessageAt: new Date(),
      });

      // Emit Socket.io event for real-time message
      const io = (req as any).io;
      if (io) {
        io.to(conversationId).emit("new_message", message);
        // Also notify receiver globally if they are online but not in the room
        io.emit(`notify_user_${receiverId}`, { type: "NEW_MESSAGE", message });
      }

      res.status(201).json({
        success: true,
        message: "Message sent",
        data: message,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Error sending message",
          error: error.message,
        });
    }
  }

  /**
   * Get messages in conversation
   * GET /api/messages/conversation/:conversationId
   */
  static async getMessages(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const messages = await Message.find({ conversationId })
        .populate("senderId", "fullName avatar")
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Message.countDocuments({ conversationId });

      // Mark messages as read
      await Message.updateMany(
        {
          conversationId,
          receiverId: (req as any).userId,
          isRead: false,
        },
        {
          isRead: true,
          readAt: new Date(),
        }
      );

      res.status(200).json({
        success: true,
        data: messages.reverse(),
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Error fetching messages",
          error: error.message,
        });
    }
  }

  /**
   * Get all conversations for user
   * GET /api/messages/conversations
   */
  static async getUserConversations(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { page = 1, limit = 20 } = req.query;

      const conversations = await Conversation.find({
        $or: [{ buyerId: userId }, { sellerId: userId }],
        isActive: true,
      })
        .populate("buyerId", "fullName avatar")
        .populate("sellerId", "fullName avatar")
        .populate("listingId", "title media")
        .sort({ lastMessageAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));

      const total = await Conversation.countDocuments({
        $or: [{ buyerId: userId }, { sellerId: userId }],
        isActive: true,
      });

      res.status(200).json({
        success: true,
        data: conversations,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Error fetching conversations",
          error: error.message,
        });
    }
  }

  /**
   * Get unread message count
   * GET /api/messages/unread
   */
  static async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      const count = await Message.countDocuments({
        receiverId: userId,
        isRead: false,
      });

      res.status(200).json({
        success: true,
        data: { unreadCount: count },
      });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Error fetching unread count",
          error: error.message,
        });
    }
  }

  /**
   * Mark message as read
   * PUT /api/messages/:messageId/read
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const { messageId } = req.params;

      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          isRead: true,
          readAt: new Date(),
        },
        { new: true }
      );

      res.status(200).json({
        success: true,
        data: message,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Error marking as read",
          error: error.message,
        });
    }
  }

  /**
   * Delete message
   * DELETE /api/messages/:messageId
   */
  static async deleteMessage(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      const userId = (req as any).userId;

      const message = await Message.findById(messageId);
      if (!message) {
        return res
          .status(404)
          .json({ success: false, message: "Message not found" });
      }

      // Only sender can delete
      if (message.senderId.toString() !== userId) {
        return res
          .status(403)
          .json({
            success: false,
            message: "You can only delete your own messages",
          });
      }

      await Message.findByIdAndDelete(messageId);

      res.status(200).json({
        success: true,
        message: "Message deleted",
      });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Error deleting message",
          error: error.message,
        });
    }
  }

  /**
   * Close/Archive conversation
   * PUT /api/messages/conversation/:conversationId/close
   */
  static async closeConversation(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;

      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        { isActive: false },
        { new: true }
      );

      res.status(200).json({
        success: true,
        message: "Conversation closed",
        data: conversation,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Error closing conversation",
          error: error.message,
        });
    }
  }
}
