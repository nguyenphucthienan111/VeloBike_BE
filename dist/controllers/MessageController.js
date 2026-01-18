"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageController = void 0;
const Message_1 = require("../models/Message");
const Conversation_1 = require("../models/Conversation");
const User_1 = require("../models/User");
const mongoose_1 = __importDefault(require("mongoose"));
class MessageController {
    /**
     * Get or create conversation
     * GET /api/messages/conversation/:userId
     */
    static getOrCreateConversation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { userId } = req.params;
                const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { listingId, orderId } = req.query;
                if (!currentUserId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                const conversation = yield Conversation_1.Conversation.findOne({
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
                // Determine buyer/seller based on user roles
                const currentUser = yield User_1.User.findById(currentUserId);
                const otherUser = yield User_1.User.findById(userId);
                let buyerId, sellerId;
                if ((currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "BUYER") {
                    buyerId = currentUserId;
                    sellerId = userId;
                }
                else if ((currentUser === null || currentUser === void 0 ? void 0 : currentUser.role) === "SELLER") {
                    buyerId = userId;
                    sellerId = currentUserId;
                }
                else {
                    // Default: current user is buyer
                    buyerId = currentUserId;
                    sellerId = userId;
                }
                // Create new conversation
                const newConversation = new Conversation_1.Conversation({
                    buyerId,
                    sellerId,
                    listingId: listingId || undefined,
                    orderId: orderId || undefined,
                });
                yield newConversation.save();
                res.status(201).json({
                    success: true,
                    message: "Conversation created",
                    data: newConversation,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({
                    success: false,
                    message: "Error creating conversation",
                    error: error.message,
                });
            }
        });
    }
    /**
     * Send message
     * POST /api/messages
     */
    static sendMessage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { conversationId, receiverId, content, attachments } = req.body;
                const senderId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!senderId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                // Verify conversation exists
                const conversation = yield Conversation_1.Conversation.findById(conversationId);
                if (!conversation) {
                    return res
                        .status(404)
                        .json({ success: false, message: "Conversation not found" });
                }
                const message = new Message_1.Message({
                    conversationId: new mongoose_1.default.Types.ObjectId(conversationId),
                    senderId: new mongoose_1.default.Types.ObjectId(senderId),
                    receiverId: new mongoose_1.default.Types.ObjectId(receiverId),
                    content,
                    attachments: attachments || [],
                    isRead: false,
                });
                yield message.save();
                // Update conversation
                yield Conversation_1.Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: content,
                    lastMessageAt: new Date(),
                });
                // Emit Socket.io event for real-time message
                const io = req.io;
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
            }
            catch (error) {
                res
                    .status(500)
                    .json({
                    success: false,
                    message: "Error sending message",
                    error: error.message,
                });
            }
        });
    }
    /**
     * Get messages in conversation
     * GET /api/messages/list/:conversationId
     */
    static getMessages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { conversationId } = req.params;
                const { page = 1, limit = 50 } = req.query;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const messages = yield Message_1.Message.find({ conversationId })
                    .populate("senderId", "fullName avatar")
                    .sort({ createdAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Message_1.Message.countDocuments({ conversationId });
                // Mark messages as read
                if (userId) {
                    yield Message_1.Message.updateMany({
                        conversationId,
                        receiverId: userId,
                        isRead: false,
                    }, {
                        isRead: true,
                        readAt: new Date(),
                    });
                }
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
            }
            catch (error) {
                res
                    .status(500)
                    .json({
                    success: false,
                    message: "Error fetching messages",
                    error: error.message,
                });
            }
        });
    }
    /**
     * Get all conversations for user
     * GET /api/messages/conversations
     */
    static getUserConversations(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { page = 1, limit = 20 } = req.query;
                if (!userId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                const conversations = yield Conversation_1.Conversation.find({
                    $or: [{ buyerId: userId }, { sellerId: userId }],
                    isActive: true,
                })
                    .populate("buyerId", "fullName avatar")
                    .populate("sellerId", "fullName avatar")
                    .populate("listingId", "title media")
                    .sort({ lastMessageAt: -1 })
                    .skip((Number(page) - 1) * Number(limit))
                    .limit(Number(limit));
                const total = yield Conversation_1.Conversation.countDocuments({
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
            }
            catch (error) {
                res
                    .status(500)
                    .json({
                    success: false,
                    message: "Error fetching conversations",
                    error: error.message,
                });
            }
        });
    }
    /**
     * Get unread message count
     * GET /api/messages/unread
     */
    static getUnreadCount(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                const count = yield Message_1.Message.countDocuments({
                    receiverId: userId,
                    isRead: false,
                });
                res.status(200).json({
                    success: true,
                    data: { unreadCount: count },
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({
                    success: false,
                    message: "Error fetching unread count",
                    error: error.message,
                });
            }
        });
    }
    /**
     * Mark message as read
     * PUT /api/messages/:messageId/read
     */
    static markAsRead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { messageId } = req.params;
                const message = yield Message_1.Message.findByIdAndUpdate(messageId, {
                    isRead: true,
                    readAt: new Date(),
                }, { new: true });
                res.status(200).json({
                    success: true,
                    data: message,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({
                    success: false,
                    message: "Error marking as read",
                    error: error.message,
                });
            }
        });
    }
    /**
     * Delete message
     * DELETE /api/messages/:messageId
     */
    static deleteMessage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { messageId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ success: false, message: "Unauthorized" });
                }
                const message = yield Message_1.Message.findById(messageId);
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
                yield Message_1.Message.findByIdAndDelete(messageId);
                res.status(200).json({
                    success: true,
                    message: "Message deleted",
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({
                    success: false,
                    message: "Error deleting message",
                    error: error.message,
                });
            }
        });
    }
    /**
     * Close/Archive conversation
     * PUT /api/messages/conversation/:conversationId/close
     */
    static closeConversation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { conversationId } = req.params;
                const conversation = yield Conversation_1.Conversation.findByIdAndUpdate(conversationId, { isActive: false }, { new: true });
                res.status(200).json({
                    success: true,
                    message: "Conversation closed",
                    data: conversation,
                });
            }
            catch (error) {
                res
                    .status(500)
                    .json({
                    success: false,
                    message: "Error closing conversation",
                    error: error.message,
                });
            }
        });
    }
}
exports.MessageController = MessageController;
//# sourceMappingURL=MessageController.js.map