import { Router } from "express";
import { ChatbotController } from "../controllers/ChatbotController";
import { protect, optionalAuth } from "../middleware/authMiddleware";

export const chatbotRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Chatbot
 *   description: AI Chatbot endpoints
 */

/**
 * @swagger
 * /api/chatbot/webhook:
 *   post:
 *     summary: Send message to chatbot
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID (optional if using Bearer token)
 *                 example: "696dede8795ea16792bb9eba"
 *               message:
 *                 type: string
 *                 description: User's message to chatbot
 *                 example: "Tôi cao 1m8 và nặng 65kg thì nên chạy xe đạp nào?"
 *     responses:
 *       200:
 *         description: Bot reply
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 reply:
 *                   type: string
 *                 remaining:
 *                   type: number
 *                   description: Remaining messages (-1 for unlimited)
 *       400:
 *         description: Message is required
 *       401:
 *         description: Unauthorized - Login required
 *       429:
 *         description: Rate limit exceeded
 */
chatbotRoutes.post("/webhook", optionalAuth, ChatbotController.handleWebhook);

export default chatbotRoutes;


/**
 * @swagger
 * /api/chatbot/history:
 *   get:
 *     summary: Get user's chat history
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Chat history
 */
chatbotRoutes.get("/history", protect, ChatbotController.getHistory as any);

/**
 * @swagger
 * /api/chatbot/quota:
 *   get:
 *     summary: Get remaining messages quota
 *     tags: [Chatbot]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quota information
 */
chatbotRoutes.get("/quota", protect, ChatbotController.getQuota as any);
