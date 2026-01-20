"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatbotRoutes = void 0;
const express_1 = require("express");
const ChatbotController_1 = require("../controllers/ChatbotController");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.chatbotRoutes = (0, express_1.Router)();
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
exports.chatbotRoutes.post("/webhook", authMiddleware_1.optionalAuth, ChatbotController_1.ChatbotController.handleWebhook);
exports.default = exports.chatbotRoutes;
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
exports.chatbotRoutes.get("/history", authMiddleware_1.protect, ChatbotController_1.ChatbotController.getHistory);
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
exports.chatbotRoutes.get("/quota", authMiddleware_1.protect, ChatbotController_1.ChatbotController.getQuota);
//# sourceMappingURL=chatbotRoutes.js.map