import { Router } from "express";
import { ChatbotController } from "../controllers/ChatbotController";

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
chatbotRoutes.post("/webhook", ChatbotController.handleWebhook);

export default chatbotRoutes;