"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatbotRoutes = void 0;
const express_1 = require("express");
const ChatbotController_1 = require("../controllers/ChatbotController");
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bot reply
 */
exports.chatbotRoutes.post("/webhook", ChatbotController_1.ChatbotController.handleWebhook);
exports.default = exports.chatbotRoutes;
//# sourceMappingURL=chatbotRoutes.js.map