"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageRoutes = void 0;
const express_1 = require("express");
const MessageController_1 = require("../controllers/MessageController");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.messageRoutes = (0, express_1.Router)();
/**
 * @swagger
 * /api/messages/conversation/{userId}:
 *   get:
 *     summary: Get or create conversation with user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: listingId
 *         schema:
 *           type: string
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation retrieved or created
 */
exports.messageRoutes.get("/conversation/:userId", authMiddleware_1.protect, MessageController_1.MessageController.getOrCreateConversation);
/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - receiverId
 *               - content
 *             properties:
 *               conversationId:
 *                 type: string
 *               receiverId:
 *                 type: string
 *               content:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Message sent
 */
exports.messageRoutes.post("/", authMiddleware_1.protect, MessageController_1.MessageController.sendMessage);
/**
 * @swagger
 * /api/messages/list/{conversationId}:
 *   get:
 *     summary: Get messages in conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Messages list
 */
exports.messageRoutes.get("/list/:conversationId", authMiddleware_1.protect, MessageController_1.MessageController.getMessages);
/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get all conversations for current user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Conversations list
 */
exports.messageRoutes.get("/conversations", authMiddleware_1.protect, MessageController_1.MessageController.getUserConversations);
/**
 * @swagger
 * /api/messages/unread:
 *   get:
 *     summary: Get unread message count
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 */
exports.messageRoutes.get("/unread", authMiddleware_1.protect, MessageController_1.MessageController.getUnreadCount);
/**
 * @swagger
 * /api/messages/{messageId}/read:
 *   put:
 *     summary: Mark message as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message marked as read
 */
exports.messageRoutes.put("/:messageId/read", authMiddleware_1.protect, MessageController_1.MessageController.markAsRead);
/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Delete message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted
 */
exports.messageRoutes.delete("/:messageId", authMiddleware_1.protect, MessageController_1.MessageController.deleteMessage);
/**
 * @swagger
 * /api/messages/conversation/{conversationId}/close:
 *   put:
 *     summary: Close/Archive conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation closed
 */
exports.messageRoutes.put("/conversation/:conversationId/close", authMiddleware_1.protect, MessageController_1.MessageController.closeConversation);
//# sourceMappingURL=messageRoutes.js.map