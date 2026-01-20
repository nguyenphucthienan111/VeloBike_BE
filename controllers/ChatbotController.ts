import { Request, Response } from "express";
import { ChatbotService } from "../services/ChatbotService";

export class ChatbotController {
  /**
   * Handle incoming webhook or chat message
   * POST /api/chatbot/webhook
   */
  static async handleWebhook(req: any, res: Response) {
    console.log("=== ChatbotController.handleWebhook START ===");
    try {
      const { message } = req.body;
      let { userId } = req.body;
      
      // Support both: userId in body OR from Bearer token
      if (!userId && req.user?.id) {
        userId = req.user.id;
      }
      
      console.log("Controller received:", { userId, message });

      if (!message) {
        console.log("No message provided, returning error");
        return res.status(400).json({ success: false, message: "Message is required" });
      }

      // Check if user is logged in (userId required)
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: "Vui lòng đăng nhập để sử dụng chatbot. Gửi userId trong body hoặc dùng Bearer token." 
        });
      }

      // Check rate limit
      console.log("Checking rate limit...");
      const rateLimitCheck = await ChatbotService.canSendMessage(userId);
      
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          success: false,
          message: rateLimitCheck.message,
          remaining: 0
        });
      }

      console.log(`Rate limit OK. Remaining: ${rateLimitCheck.remaining === -1 ? 'Unlimited' : rateLimitCheck.remaining}`);

      console.log("Calling ChatbotService.processMessage...");
      const reply = await ChatbotService.processMessage(userId, message);
      console.log("ChatbotService returned:", reply.substring(0, 100) + "...");

      console.log("Sending response...");
      res.status(200).json({
        success: true,
        reply,
        remaining: rateLimitCheck.remaining
      });
      console.log("=== ChatbotController.handleWebhook END ===");
    } catch (error: any) {
      console.error("ChatbotController error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get user's chat history
   * GET /api/chatbot/history
   */
  static async getHistory(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { page = 1, limit = 10 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const conversations = await ChatbotService.getUserConversations(userId, skip, Number(limit));
      const total = await ChatbotService.getConversationCount(userId);

      res.json({
        success: true,
        data: conversations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get remaining messages for today
   * GET /api/chatbot/quota
   */
  static async getQuota(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const rateLimitCheck = await ChatbotService.canSendMessage(userId);

      res.json({
        success: true,
        data: {
          remaining: rateLimitCheck.remaining,
          unlimited: rateLimitCheck.remaining === -1,
          message: rateLimitCheck.remaining === -1 
            ? "Premium user - Unlimited messages" 
            : `${rateLimitCheck.remaining}/25 messages remaining today`
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
