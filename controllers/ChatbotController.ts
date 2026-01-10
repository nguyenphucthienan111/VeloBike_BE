import { Request, Response } from "express";
import { ChatbotService } from "../services/ChatbotService";

export class ChatbotController {
  /**
   * Handle incoming webhook or chat message
   * POST /api/chatbot/webhook
   */
  static async handleWebhook(req: Request, res: Response) {
    try {
      const { userId, message } = req.body;
      console.log("ChatbotController received:", { userId, message });

      if (!message) {
        return res.status(400).json({ success: false, message: "Message is required" });
      }

      const reply = await ChatbotService.processMessage(userId || "guest", message);
      console.log("ChatbotService returned:", reply);

      res.status(200).json({
        success: true,
        reply,
      });
    } catch (error: any) {
      console.error("ChatbotController error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
