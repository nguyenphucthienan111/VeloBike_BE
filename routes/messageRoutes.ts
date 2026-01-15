import { Router } from "express";
import { MessageController } from "../controllers/MessageController";
import { protect } from "../middleware/authMiddleware";

export const messageRoutes = Router();

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
messageRoutes.get("/conversation/:userId", protect, MessageController.getOrCreateConversation as any);

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
messageRoutes.post("/", protect, MessageController.sendMessage as any);

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
messageRoutes.get("/list/:conversationId", protect, MessageController.getMessages as any);

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
messageRoutes.get("/conversations", protect, MessageController.getUserConversations as any);

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
messageRoutes.get("/unread", protect, MessageController.getUnreadCount as any);

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
messageRoutes.put("/:messageId/read", protect, MessageController.markAsRead as any);

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
messageRoutes.delete("/:messageId", protect, MessageController.deleteMessage as any);

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
messageRoutes.put("/conversation/:conversationId/close", protect, MessageController.closeConversation as any);
