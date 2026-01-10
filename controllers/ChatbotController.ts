import { Request, Response } from "express";
import { ChatbotService } from "../services/ChatbotService";

export class ChatbotController {
  /**
   * Handle incoming webhook or chat message
   * POST /api/chatbot/webhook
   */
  static async handleWebhook(req: Request, res: Response) {
    console.log("=== ChatbotController.handleWebhook START ===");
    try {
      const { userId, message } = req.body;
      console.log("Controller received:", { userId, message });

      if (!message) {
        console.log("No message provided, returning error");
        return res.status(400).json({ success: false, message: "Message is required" });
      }

      console.log("Calling ChatbotService.processMessage...");
      const reply = await ChatbotService.processMessage(userId || "guest", message);
      console.log("ChatbotService returned:", reply.substring(0, 100) + "...");

      console.log("Sending response...");
      res.status(200).json({
        success: true,
        reply,
      });
      console.log("=== ChatbotController.handleWebhook END ===");
    } catch (error: any) {
      console.error("ChatbotController error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
